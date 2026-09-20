package com.chorestar.app.ui.kid

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chorestar.app.R
import com.chorestar.app.data.AchievementBadge
import com.chorestar.app.data.Achievements
import com.chorestar.app.data.BadgeProgress
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.data.CompletionRef
import com.chorestar.app.data.Dates
import com.chorestar.app.data.KidApi
import com.chorestar.app.data.KidSession
import com.chorestar.app.data.ThemePreference
import com.chorestar.app.data.model.Child
import com.chorestar.app.data.model.Chore
import com.chorestar.app.data.model.Routine
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.UiText
import com.chorestar.app.ui.uiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Where the kid's data comes from: a standalone token session, or the parent's own session on their phone. */
sealed interface KidBackend {
    data class Standalone(val session: KidSession) : KidBackend
    data class OnParentDevice(val childId: String) : KidBackend
}

data class KidState(
    val loading: Boolean = true,
    val child: Child? = null,
    val chores: List<Chore> = emptyList(),
    /** chore id → status ("approved" or "pending") for today. */
    val today: Map<String, String> = emptyMap(),
    val routines: List<Routine> = emptyList(),
    val completedRoutineIds: Set<String> = emptySet(),
    val streak: Int = 0,
    val weekEarnedCents: Int = 0,
    val currency: String = "USD",
    val allTime: List<CompletionRef> = emptyList(),
    val earnedBadges: List<AchievementBadge> = emptyList(),
    val wallet: KidApi.WalletView? = null,
    val vacationEndsOn: String? = null,
    val onVacation: Boolean = false,
    val perChore: Boolean? = null,
    val dailyRewardCents: Int? = null,
    val error: UiText? = null,
    val perfectDay: Boolean = false,
    val busy: Set<String> = emptySet(),
) {
    val dueToday: List<Chore> get() = if (onVacation) emptyList() else chores.filter { it.isDueOn(Dates.dayOfWeek()) }
    val pending: List<Chore> get() = dueToday.filter { today[it.id] == null }
    val waiting: List<Chore> get() = dueToday.filter { today[it.id] == "pending" }
    val done: List<Chore> get() = dueToday.filter { today[it.id] == "approved" }
    val earnedToday: Int get() = if (perChore == true) done.sumOf { it.rewardCents } else if (dueToday.isNotEmpty() && done.size == dueToday.size) (dailyRewardCents ?: 0) else 0
    val badgeProgress: List<BadgeProgress> get() = Achievements.progress(chores, allTime, earnedBadges, { false })
}

class KidViewModel(
    private val backend: KidBackend,
    private val repository: ChoreStarRepository,
    private val kidApi: KidApi,
    private val parentState: () -> DashboardState?,
    private val onParentToggle: (Chore, Boolean) -> Unit,
    private val onParentRoutineDone: (Routine, Int, Int) -> Unit,
    private val onTheme: (ThemePreference) -> Unit,
    private val onSignOut: () -> Unit,
) : ViewModel() {
    private val _state = MutableStateFlow(KidState())
    val state: StateFlow<KidState> = _state

    private val auth: KidApi.Auth?
        get() = when (backend) {
            is KidBackend.Standalone -> KidApi.Auth(backend.session.kidToken, null)
            is KidBackend.OnParentDevice -> repository.accessTokenOrNull()?.let { KidApi.Auth(it, backend.childId) }
        }

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            when (backend) {
                is KidBackend.Standalone -> loadStandalone(backend.session)
                is KidBackend.OnParentDevice -> loadFromParent(backend.childId)
            }
            loadWallet()
        }
    }

    private suspend fun loadStandalone(session: KidSession) {
        val token = session.kidToken
        val week = Dates.weekStart()
        runCatching {
            val info = runCatching { kidApi.child(token) }.getOrNull()
            info?.theme?.let { onTheme(ThemePreference.from(it)) }
            val chores = kidApi.chores(token, week)
            val todayIdx = Dates.dayOfWeek()
            val today = chores.completions.filter { it.dayOfWeek == todayIdx }.associate { it.choreId to (it.status ?: "approved") }
            val routines = runCatching { kidApi.routines(token, session.childId) }.getOrDefault(emptyList())
            val stats = runCatching { kidApi.stats(token, week, todayIdx) }.getOrNull()
            val vacationEnd = info?.vacation?.end
            val onVacation = info?.vacation?.let { v -> v.start != null && v.end != null && runCatching { val d = LocalDate.now(); !d.isBefore(LocalDate.parse(v.start)) && !d.isAfter(LocalDate.parse(v.end)) }.getOrDefault(false) } ?: false
            _state.update {
                it.copy(
                    loading = false,
                    child = Child(id = session.childId, userId = "", name = session.childName, avatarColor = session.avatarColor, avatarUrl = session.avatarSignedUrl ?: session.avatarUrl, avatarFile = session.avatarFile),
                    chores = chores.chores, today = today, routines = routines, completedRoutineIds = routines.filter { r -> r.completedToday }.map { r -> r.id }.toSet(),
                    streak = stats?.streak ?: it.streak, weekEarnedCents = stats?.weekEarnedCents ?: 0, currency = stats?.currencyCode ?: it.currency,
                    allTime = stats?.completions ?: it.allTime, earnedBadges = stats?.earnedBadges ?: it.earnedBadges,
                    vacationEndsOn = vacationEnd, onVacation = onVacation,
                )
            }
        }.onFailure { e -> _state.update { it.copy(loading = false, error = e.message?.let(UiText::Raw) ?: uiText(R.string.error_no_connection)) } }
    }

    private fun loadFromParent(childId: String) {
        val p = parentState() ?: return
        val child = p.child(childId) ?: return
        val todayIdx = p.today
        _state.update {
            it.copy(
                loading = false, child = child, chores = p.choresFor(childId),
                today = p.choresFor(childId).mapNotNull { c -> p.completion(c.id, todayIdx)?.let { comp -> c.id to comp.status } }.toMap(),
                routines = p.routinesFor(childId), completedRoutineIds = p.completedRoutineIds,
                streak = p.streak(childId), weekEarnedCents = (0..6).sumOf { d -> p.earnedCents(childId, d) }, currency = p.currency ?: "USD",
                allTime = p.allTime.filter { r -> p.choresFor(childId).any { c -> c.id == r.choreId } }, earnedBadges = p.achievements.filter { b -> b.childId == childId },
                vacationEndsOn = p.settings?.vacationEndsOn, onVacation = p.isOnVacationToday,
                perChore = p.settings?.isPerChore, dailyRewardCents = p.settings?.dailyRewardCents,
            )
        }
    }

    /** The parent's dashboard changed underneath kid mode (a tick landed); mirror it. */
    fun syncFromParent() { if (backend is KidBackend.OnParentDevice) loadFromParent(backend.childId) }

    private suspend fun loadWallet() {
        val a = auth ?: return
        runCatching { kidApi.wallet(a) }.onSuccess { w -> _state.update { it.copy(wallet = w, currency = w.currencyCode) } }
    }

    // ── Chores ───────────────────────────────────────────────────────────────

    fun toggle(chore: Chore) {
        val s = _state.value
        if (chore.id in s.busy) return
        val current = s.today[chore.id]
        when (backend) {
            is KidBackend.OnParentDevice -> {
                // Kid tapping a pending cell un-ticks it; parent-side rules decide pending vs approved.
                onParentToggle(chore, current == null)
                return
            }
            is KidBackend.Standalone -> viewModelScope.launch {
                val wasDone = current != null
                _state.update { it.copy(busy = it.busy + chore.id, today = if (wasDone) it.today - chore.id else it.today + (chore.id to "approved")) }
                runCatching { kidApi.toggle(backend.session.kidToken, chore.id, Dates.dayOfWeek(), Dates.weekStart(), !wasDone) }
                    .onSuccess { r ->
                        if (!wasDone && r.status == "pending") _state.update { it.copy(today = it.today + (chore.id to "pending")) }
                        checkPerfectDay(wasDone)
                        refreshStats()
                    }
                    .onFailure { e ->
                        _state.update { it.copy(today = if (wasDone) it.today + (chore.id to current!!) else it.today - chore.id, error = UiText.Raw(e.message ?: "")) }
                    }
                _state.update { it.copy(busy = it.busy - chore.id) }
            }
        }
    }

    private fun checkPerfectDay(wasDone: Boolean) {
        val s = _state.value
        if (!wasDone && s.dueToday.isNotEmpty() && s.pending.isEmpty() && s.waiting.isEmpty()) _state.update { it.copy(perfectDay = true) }
    }

    fun dismissPerfectDay() = _state.update { it.copy(perfectDay = false) }

    private suspend fun refreshStats() {
        val b = backend as? KidBackend.Standalone ?: return
        runCatching { kidApi.stats(b.session.kidToken, Dates.weekStart(), Dates.dayOfWeek()) }
            .onSuccess { st -> _state.update { it.copy(streak = st.streak, weekEarnedCents = st.weekEarnedCents, allTime = st.completions, earnedBadges = st.earnedBadges) } }
        loadWallet()
    }

    suspend fun submitProof(chore: Chore, jpeg: ByteArray): Result<Unit> {
        val a = auth ?: return Result.failure(IllegalStateException("Not signed in"))
        return kidApi.submitProof(a, chore.id, Dates.dayOfWeek(), Dates.weekStart(), jpeg)
            .onSuccess { _state.update { it.copy(today = it.today + (chore.id to "pending")) } }
    }

    // ── Routines ─────────────────────────────────────────────────────────────

    fun completeRoutine(routine: Routine, stepsCompleted: Int, durationSeconds: Int) {
        _state.update { it.copy(completedRoutineIds = it.completedRoutineIds + routine.id) }
        when (backend) {
            is KidBackend.OnParentDevice -> onParentRoutineDone(routine, stepsCompleted, durationSeconds)
            is KidBackend.Standalone -> viewModelScope.launch {
                runCatching { kidApi.completeRoutine(backend.session.kidToken, routine.id, backend.session.childId, stepsCompleted, routine.steps.size, durationSeconds) }
                    .onFailure { e -> _state.update { it.copy(error = UiText.Raw(e.message ?: "")) } }
                loadWallet()
            }
        }
    }

    // ── Goals + store ────────────────────────────────────────────────────────

    suspend fun saveGoal(existing: KidApi.GoalView?, title: String, targetCents: Int, emoji: String?): Result<Unit> {
        val a = auth ?: return Result.failure(IllegalStateException("Not signed in"))
        val r = if (existing == null) kidApi.createGoal(a, title, targetCents, emoji) else kidApi.updateGoal(a, existing.id, title, targetCents, emoji)
        loadWallet()
        return r
    }

    suspend fun archiveGoal(goalId: String): Result<Unit> {
        val a = auth ?: return Result.failure(IllegalStateException("Not signed in"))
        return kidApi.archiveGoal(a, goalId).also { loadWallet() }
    }

    suspend fun redeem(itemId: String): Result<Unit> {
        val a = auth ?: return Result.failure(IllegalStateException("Not signed in"))
        return kidApi.redeem(a, itemId).also { loadWallet() }
    }

    suspend fun cancelRedeem(redemptionId: String): Result<Unit> {
        val a = auth ?: return Result.failure(IllegalStateException("Not signed in"))
        return kidApi.cancelRedeem(a, redemptionId).also { loadWallet() }
    }

    fun clearError() = _state.update { it.copy(error = null) }
    fun signOut() = onSignOut()
}
