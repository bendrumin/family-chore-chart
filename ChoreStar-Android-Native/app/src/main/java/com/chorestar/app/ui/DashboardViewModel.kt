package com.chorestar.app.ui

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chorestar.app.R
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.data.ChoreSuggestion
import com.chorestar.app.data.ChoreSuggestionEngine
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Images
import com.chorestar.app.data.model.Child
import com.chorestar.app.data.model.Chore
import com.chorestar.app.data.model.ChoreCompletion
import com.chorestar.app.data.model.FamilySettings
import com.chorestar.app.data.model.NewChoreRow
import com.chorestar.app.data.model.NewCompletion
import com.chorestar.app.data.model.PendingApproval
import com.chorestar.app.data.model.Profile
import com.chorestar.app.data.model.VacationPeriod
import com.chorestar.app.data.ThemePreference
import com.chorestar.app.data.jsonBool
import com.chorestar.app.data.jsonString
import com.chorestar.app.data.mergeCustomTheme
import com.chorestar.app.data.model.FamilyMemberRow
import com.chorestar.app.data.model.NewRewardItem
import com.chorestar.app.data.model.RewardItem
import com.chorestar.app.data.model.RewardsUpsert
import com.chorestar.app.ui.components.LimitType
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

const val FREE_CHILD_LIMIT = 3
const val FREE_CHORE_LIMIT = 20
const val FREE_REWARD_ITEM_LIMIT = 3

data class DashboardState(
    val loading: Boolean = true,
    val error: UiText? = null,
    val effectiveUserId: String? = null,
    val profile: Profile? = null,
    val children: List<Child> = emptyList(),
    val chores: List<Chore> = emptyList(),
    /** Completions for the CURRENT week. */
    val completions: List<ChoreCompletion> = emptyList(),
    val settings: FamilySettings? = null,
    val weekStart: String = Dates.weekStart(),
    /** The week the board is looking at, and its completions when it is not the current week. */
    val viewedWeekStart: String = Dates.weekStart(),
    val viewedCompletions: List<ChoreCompletion> = emptyList(),
    val vacationPeriods: List<VacationPeriod> = emptyList(),
    val pendingApprovals: List<PendingApproval> = emptyList(),
    /** Cells a write is in flight for, so a double tap does not double-write. */
    val saving: Set<String> = emptySet(),
    val pinChildIds: Set<String> = emptySet(),
    /** Signed URLs for uploaded avatar photos, by child id. */
    val photoUrls: Map<String, String> = emptyMap(),
    val upgradePrompt: LimitType? = null,
    val suggestions: List<ChoreSuggestion> = emptyList(),
    val suggestionsPersonalized: Boolean = false,
    val isSharedMember: Boolean = false,
    val joinCode: String? = null,
    val members: List<FamilyMemberRow> = emptyList(),
    val rewardItems: List<RewardItem> = emptyList(),
) {
    val themePreference: ThemePreference get() = ThemePreference.from(settings?.customTheme)
    val rewardItemLimit: Int get() = if (isPremium) Int.MAX_VALUE else FREE_REWARD_ITEM_LIMIT
    fun child(id: String?) = children.firstOrNull { it.id == id }
    fun chore(id: String?) = chores.firstOrNull { it.id == id }
    fun choresFor(childId: String) = chores.filter { it.childId == childId }

    fun completionsFor(week: String): List<ChoreCompletion> = if (week == weekStart) completions else viewedCompletions
    fun completion(choreId: String, day: Int, week: String = weekStart) = completionsFor(week).firstOrNull { it.choreId == choreId && it.dayOfWeek == day }
    fun isDone(choreId: String, day: Int, week: String = weekStart) = completion(choreId, day, week)?.counts == true
    fun isPending(choreId: String, day: Int, week: String = weekStart) = completion(choreId, day, week)?.isPending == true

    // ── Vacation ─────────────────────────────────────────────────────────────
    fun isOnVacation(date: LocalDate): Boolean {
        val s = settings?.vacationStartsOn ?: return false
        val e = settings.vacationEndsOn ?: return false
        return runCatching { !date.isBefore(LocalDate.parse(s)) && !date.isAfter(LocalDate.parse(e)) }.getOrDefault(false)
    }
    /** The live window or any recorded past window: days that never had chores due. */
    fun isVacationDay(date: LocalDate): Boolean = isOnVacation(date) || vacationPeriods.any {
        runCatching { !date.isBefore(LocalDate.parse(it.startsOn)) && !date.isAfter(LocalDate.parse(it.endsOn)) }.getOrDefault(false)
    }
    val isOnVacationToday: Boolean get() = isOnVacation(Dates.today())
    val vacationResumeDate: LocalDate? get() = settings?.vacationEndsOn?.let { runCatching { LocalDate.parse(it).plusDays(1) }.getOrNull() }
    fun dateOf(week: String, day: Int): LocalDate = LocalDate.parse(week).plusDays(day.toLong())

    fun dueOn(childId: String, day: Int, week: String = weekStart): List<Chore> =
        if (isVacationDay(dateOf(week, day))) emptyList() else choresFor(childId).filter { it.isDueOn(day) }
    fun doneOn(childId: String, day: Int, week: String = weekStart) = dueOn(childId, day, week).count { isDone(it.id, day, week) }
    fun isPerfectDay(childId: String, day: Int, week: String = weekStart): Boolean {
        val due = dueOn(childId, day, week)
        return due.isNotEmpty() && due.all { isDone(it.id, day, week) }
    }
    /**
     * What a child earned on a day. Per-chore: every done chore counts, scheduled or
     * not (a parent may credit work on another day). Flat: the daily rate on a perfect day.
     */
    fun earnedCents(childId: String, day: Int, week: String = weekStart): Int {
        val s = settings ?: return 0
        if (isVacationDay(dateOf(week, day))) return 0
        return if (s.isPerChore) choresFor(childId).filter { isDone(it.id, day, week) }.sumOf { it.rewardCents }
        else if (isPerfectDay(childId, day, week)) (s.dailyRewardCents ?: 7) else 0
    }
    val pendingCompletions: List<ChoreCompletion> get() = completions.filter { it.isPending }
    val today: Int get() = Dates.dayOfWeek()
    val currency: String? get() = settings?.currencyCode
    val isPremium: Boolean get() = profile?.isPremium == true
    val childLimit: Int get() = if (isPremium) Int.MAX_VALUE else FREE_CHILD_LIMIT
    val choreLimit: Int get() = if (isPremium) Int.MAX_VALUE else FREE_CHORE_LIMIT
}

/** What a bulk catch-up would do, shown before it runs. */
data class BulkPlan(val childId: String, val fromDay: Int, val throughDay: Int, val toTick: List<Pair<Chore, Int>>, val toApprove: List<ChoreCompletion>, val earningsDeltaCents: Int) {
    val isEmpty: Boolean get() = toTick.isEmpty() && toApprove.isEmpty()
}

class DashboardViewModel(
    private val repository: ChoreStarRepository,
    private val onTheme: (ThemePreference) -> Unit = {},
) : ViewModel() {
    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state
    private var suggestionJob: Job? = null

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = it.children.isEmpty(), error = null) }
            runCatching {
                val uid = repository.effectiveUserId()
                val profile = repository.profile(uid)
                val children = repository.children(uid)
                val chores = repository.chores(children.map { it.id })
                val weekStart = Dates.weekStart()
                val completions = repository.completions(chores.map { it.id }, weekStart)
                val settings = repository.familySettings(uid)
                val pins = runCatching { repository.childIdsWithPin(children.map { it.id }) }.getOrDefault(emptySet())
                val photos = children.mapNotNull { c ->
                    c.avatarPhotoPath?.let { p -> repository.signedAvatarUrl(p)?.let { c.id to it } }
                }.toMap()
                val periods = repository.vacationPeriods(uid)
                val viewed = _state.value.viewedWeekStart
                val viewedCompletions = if (viewed != weekStart) repository.completions(chores.map { it.id }, viewed) else emptyList()
                _state.update {
                    it.copy(loading = false, effectiveUserId = uid, profile = profile, children = children,
                        chores = chores, completions = completions, settings = settings, weekStart = weekStart,
                        pinChildIds = pins, photoUrls = photos, vacationPeriods = periods, viewedCompletions = viewedCompletions,
                        isSharedMember = uid != repository.currentUserId)
                }
                onTheme(ThemePreference.from(settings?.customTheme))
                refreshApprovals()
                if (profile != null && profile.kidLoginCode == null && uid == repository.currentUserId) {
                    repository.materializeKidLoginCode()?.let { code -> _state.update { it.copy(profile = it.profile?.copy(kidLoginCode = code)) } }
                }
            }.onFailure { e ->
                _state.update { it.copy(loading = false, error = e.message?.let(UiText::Raw) ?: uiText(R.string.error_load_family)) }
            }
        }
    }

    // ── Settings ─────────────────────────────────────────────────────────────

    private fun settingsWrite(block: suspend (uid: String) -> Unit) {
        viewModelScope.launch {
            val uid = _state.value.effectiveUserId ?: return@launch
            runCatching { block(uid) }.onFailure { e -> _state.update { it.copy(error = uiText(R.string.error_could_not_save, e.message ?: "")) } }
            refresh()
        }
    }

    fun setRequireApproval(on: Boolean) {
        _state.update { it.copy(settings = it.settings?.copy(requireApproval = on)) }
        settingsWrite { repository.setRequireApproval(it, on) }
    }

    fun setActivityPush(on: Boolean) {
        _state.update { it.copy(settings = it.settings?.copy(activityPushEnabled = on)) }
        settingsWrite { repository.setActivityPush(it, on) }
    }

    /** "auto", "none" or a web theme id, written the way iOS writes it. */
    fun setThemeSelection(selection: String) {
        val merged = mergeCustomTheme(
            _state.value.settings?.customTheme,
            "autoSeasonal" to jsonBool(selection == "auto"),
            "seasonalTheme" to jsonString(selection.takeIf { it != "auto" && it != "none" }),
        )
        _state.update { it.copy(settings = it.settings?.copy(customTheme = merged)) }
        onTheme(ThemePreference.from(merged))
        settingsWrite { repository.setCustomTheme(it, merged) }
    }

    fun setAccent(hex: String?) {
        val merged = mergeCustomTheme(_state.value.settings?.customTheme, "accentColor" to jsonString(ThemePreference.normalizeHex(hex)))
        _state.update { it.copy(settings = it.settings?.copy(customTheme = merged)) }
        onTheme(ThemePreference.from(merged))
        settingsWrite { repository.setCustomTheme(it, merged) }
    }

    suspend fun saveRewards(rewardMode: String, dailyCents: Int, weeklyCents: Int, currency: String, timezone: String): Result<Unit> {
        val uid = _state.value.effectiveUserId ?: return Result.failure(IllegalStateException("no family"))
        return runCatching { repository.updateRewards(RewardsUpsert(uid, rewardMode, dailyCents, weeklyCents, currency, timezone)) }
            .map { }.onSuccess { refresh() }
    }

    // ── Sharing ──────────────────────────────────────────────────────────────

    fun loadSharing() {
        viewModelScope.launch {
            val uid = repository.currentUserId ?: return@launch
            val code = runCatching { repository.familyJoinCode(uid) }.getOrNull()
            val members = runCatching { repository.familyMembers(uid) }.getOrDefault(emptyList())
            _state.update { it.copy(joinCode = code, members = members) }
        }
    }

    suspend fun createJoinCode(): Result<String> {
        val uid = repository.currentUserId ?: return Result.failure(IllegalStateException("Not signed in"))
        return runCatching { repository.createJoinCode(uid) }.onSuccess { code -> _state.update { it.copy(joinCode = code) } }
    }

    suspend fun joinFamily(code: String): Result<String> = repository.joinFamily(code).onSuccess { refresh() }

    fun removeMember(rowId: String) {
        viewModelScope.launch {
            _state.update { it.copy(members = it.members.filterNot { m -> m.id == rowId }) }
            runCatching { repository.removeFamilyMember(rowId) }
            loadSharing()
        }
    }

    fun leaveFamily() { viewModelScope.launch { runCatching { repository.leaveFamily() }; refresh() } }

    // ── Account ──────────────────────────────────────────────────────────────

    suspend fun changePassword(newPassword: String): Result<Unit> = runCatching { repository.changePassword(newPassword) }
    suspend fun deleteAccount(): Result<Unit> = repository.deleteAccount().onSuccess { runCatching { repository.signOut() } }

    // ── Reward store ─────────────────────────────────────────────────────────

    fun loadRewardItems() {
        viewModelScope.launch {
            val uid = _state.value.effectiveUserId ?: return@launch
            runCatching { repository.rewardItems(uid) }.onSuccess { list -> _state.update { it.copy(rewardItems = list) } }
        }
    }

    /** Returns false when the free plan's three items are used up. */
    suspend fun addRewardItem(title: String, emoji: String?, cents: Int): Result<Unit> {
        val s = _state.value
        val uid = s.effectiveUserId ?: return Result.failure(IllegalStateException("no family"))
        if (s.rewardItems.size >= s.rewardItemLimit) return Result.failure(LimitReached())
        return runCatching { repository.addRewardItem(NewRewardItem(uid, title.trim(), emoji, cents, s.rewardItems.size)) }
            .map { }.onSuccess { loadRewardItems() }
    }

    suspend fun addStarterRewards(): Result<Unit> {
        val s = _state.value
        val uid = s.effectiveUserId ?: return Result.failure(IllegalStateException("no family"))
        val existing = s.rewardItems.map { it.title.lowercase() }.toSet()
        var order = s.rewardItems.size
        return runCatching {
            for ((emoji, title, cents) in STARTER_REWARDS) {
                if (title.lowercase() in existing) continue
                if (order >= s.rewardItemLimit) throw LimitReached()
                repository.addRewardItem(NewRewardItem(uid, title, emoji, cents, order++))
            }
        }.also { loadRewardItems() }
    }

    fun updateRewardPrice(id: String, cents: Int) {
        _state.update { it.copy(rewardItems = it.rewardItems.map { r -> if (r.id == id) r.copy(priceCents = cents) else r }) }
        viewModelScope.launch { runCatching { repository.updateRewardItemPrice(id, cents) } }
    }

    fun removeRewardItem(id: String) {
        _state.update { it.copy(rewardItems = it.rewardItems.filterNot { r -> r.id == id }) }
        viewModelScope.launch { runCatching { repository.removeRewardItem(id) }; loadRewardItems() }
    }

    fun refreshApprovals() {
        viewModelScope.launch {
            runCatching { repository.pendingApprovals() }.onSuccess { list -> _state.update { it.copy(pendingApprovals = list) } }
        }
    }

    // ── Week navigation ──────────────────────────────────────────────────────

    fun viewWeek(weekStart: String) {
        val capped = if (weekStart > _state.value.weekStart) _state.value.weekStart else weekStart
        _state.update { it.copy(viewedWeekStart = capped, viewedCompletions = if (capped == it.weekStart) emptyList() else it.viewedCompletions) }
        if (capped == _state.value.weekStart) return
        viewModelScope.launch {
            runCatching { repository.completions(_state.value.chores.map { it.id }, capped) }
                .onSuccess { list -> _state.update { s -> if (s.viewedWeekStart == capped) s.copy(viewedCompletions = list) else s } }
        }
    }

    // ── Completions ──────────────────────────────────────────────────────────

    /** Parent tap on today's cell: mark or unmark. Optimistic, reverted on failure. */
    fun toggleToday(chore: Chore) = toggle(chore, Dates.dayOfWeek())

    /** Any cell, any week: past days, future days of this week, off-schedule days. A pending cell is approved. */
    fun toggle(chore: Chore, day: Int, week: String = _state.value.weekStart) {
        val key = "${chore.id}:$day:$week"
        val s = _state.value
        if (key in s.saving) return
        val existing = s.completion(chore.id, day, week)
        if (existing?.isPending == true) { approve(existing.id); return }
        viewModelScope.launch {
            _state.update { it.copy(saving = it.saving + key) }
            runCatching {
                if (existing != null) {
                    updateWeek(week) { it - existing }
                    repository.removeCompletion(existing.id)
                } else {
                    val placeholder = ChoreCompletion(id = "local:$key", choreId = chore.id, dayOfWeek = day, weekStart = week)
                    updateWeek(week) { it + placeholder }
                    val saved = repository.addCompletion(chore.id, day, week)
                    updateWeek(week) { list -> list.map { c -> if (c.id == placeholder.id) saved else c } }
                }
            }.onFailure { e ->
                updateWeek(week) { list -> if (existing != null) list + existing else list.filterNot { c -> c.id == "local:$key" } }
                _state.update { it.copy(error = uiText(R.string.error_could_not_save, e.message ?: "")) }
            }
            _state.update { it.copy(saving = it.saving - key) }
        }
    }

    private fun updateWeek(week: String, f: (List<ChoreCompletion>) -> List<ChoreCompletion>) {
        _state.update { s ->
            if (week == s.weekStart) s.copy(completions = f(s.completions)) else s.copy(viewedCompletions = f(s.viewedCompletions))
        }
    }

    /** Everything due for the child from [fromDay] through [throughDay] this week that is not done yet. */
    fun bulkPlan(childId: String, fromDay: Int, throughDay: Int): BulkPlan {
        val s = _state.value
        val week = s.weekStart
        val toTick = mutableListOf<Pair<Chore, Int>>()
        val toApprove = mutableListOf<ChoreCompletion>()
        var delta = 0
        for (day in fromDay..throughDay) {
            val before = s.earnedCents(childId, day, week)
            val due = s.dueOn(childId, day, week)
            for (chore in due) {
                val c = s.completion(chore.id, day, week)
                if (c == null) toTick += chore to day else if (c.isPending) toApprove += c
            }
            // After: every due chore done.
            val after = if (due.isEmpty()) 0 else if (s.settings?.isPerChore == true)
                s.choresFor(childId).filter { ch -> due.any { it.id == ch.id } || s.isDone(ch.id, day, week) }.sumOf { it.rewardCents }
            else (s.settings?.dailyRewardCents ?: 7)
            delta += (after - before).coerceAtLeast(0)
        }
        return BulkPlan(childId, fromDay, throughDay, toTick, toApprove, delta)
    }

    fun runBulk(plan: BulkPlan, onDone: () -> Unit = {}) {
        viewModelScope.launch {
            val week = _state.value.weekStart
            runCatching {
                val saved = repository.addCompletions(plan.toTick.map { (chore, day) -> NewCompletion(chore.id, day, week) })
                updateWeek(week) { it + saved }
                plan.toApprove.forEach { repository.reviewCompletion(it.id, approve = true) }
            }.onFailure { e -> _state.update { it.copy(error = uiText(R.string.error_could_not_save, e.message ?: "")) } }
            refresh()
            onDone()
        }
    }

    // ── Vacation ─────────────────────────────────────────────────────────────

    fun setVacation(startsOn: String, endsOn: String) {
        viewModelScope.launch {
            val s = _state.value
            val uid = s.effectiveUserId ?: return@launch
            val prev = s.settings?.let { st -> st.vacationStartsOn?.let { a -> st.vacationEndsOn?.let { b -> a to b } } }
            runCatching { repository.setVacation(uid, startsOn, endsOn, prev) }
                .onFailure { e -> _state.update { it.copy(error = uiText(R.string.error_could_not_save, e.message ?: "")) } }
            refresh()
        }
    }

    fun clearVacation() {
        viewModelScope.launch {
            val s = _state.value
            val uid = s.effectiveUserId ?: return@launch
            val window = s.settings?.let { st -> st.vacationStartsOn?.let { a -> st.vacationEndsOn?.let { b -> a to b } } }
            _state.update { it.copy(settings = it.settings?.copy(vacationStartsOn = null, vacationEndsOn = null)) }
            runCatching { repository.clearVacation(uid, window) }
                .onFailure { e -> _state.update { it.copy(error = uiText(R.string.error_could_not_save, e.message ?: "")) } }
            refresh()
        }
    }

    // ── Approvals ────────────────────────────────────────────────────────────

    fun approve(completionId: String) = review(completionId, approve = true)
    fun reject(completionId: String) = review(completionId, approve = false)

    private fun review(completionId: String, approve: Boolean) {
        viewModelScope.launch {
            _state.update { s ->
                s.copy(
                    pendingApprovals = s.pendingApprovals.filterNot { it.id == completionId },
                    completions = s.completions.mapNotNull { c ->
                        if (c.id != completionId) c else if (approve) c.copy(status = "approved") else null
                    },
                )
            }
            runCatching { repository.reviewCompletion(completionId, approve) }
                .onFailure { e -> _state.update { it.copy(error = uiText(R.string.error_could_not_save, e.message ?: "")) } }
            refresh()
        }
    }

    // ── Children ─────────────────────────────────────────────────────────────

    /** Returns false (and raises the upgrade prompt) when the free plan is full. */
    suspend fun createChild(name: String, age: Int, color: String, avatarUrl: String?, avatarFile: String?): Result<Child> {
        val s = _state.value
        if (s.children.size >= s.childLimit) {
            _state.update { it.copy(upgradePrompt = LimitType.Children) }
            return Result.failure(LimitReached())
        }
        val uid = s.effectiveUserId ?: repository.effectiveUserId()
        return runCatching { repository.createChild(uid, name, age, color, avatarUrl, avatarFile) }
            .onSuccess { c -> _state.update { it.copy(children = it.children + c) }; refresh() }
    }

    suspend fun updateChild(child: Child, name: String, age: Int, color: String, avatarUrl: String?, avatarFile: String?, pin: PinChange): Result<Unit> =
        runCatching {
            val retirePhoto = child.avatarPhotoPath != null && (avatarUrl != null || avatarFile != child.avatarFile)
            repository.updateChild(child, name, age, color, avatarUrl, avatarFile, retirePhoto)
            when (pin) {
                is PinChange.Set -> repository.setChildPin(child.id, pin.pin)
                PinChange.Remove -> repository.removeChildPin(child.id)
                PinChange.Keep -> Unit
            }
        }.onSuccess { refresh() }

    fun deleteChild(child: Child) {
        viewModelScope.launch {
            _state.update { it.copy(children = it.children - child, chores = it.chores.filterNot { c -> c.childId == child.id }) }
            runCatching { repository.deleteChild(child.id) }
                .onFailure { e -> _state.update { it.copy(error = uiText(R.string.error_could_not_save, e.message ?: "")) } }
            refresh()
        }
    }

    suspend fun uploadAvatarPhoto(context: Context, child: Child, uri: Uri): Result<Unit> = runCatching {
        val jpeg = Images.loadSquareJpeg(context, uri) ?: throw IllegalStateException(context.getString(R.string.photo_unreadable))
        repository.uploadChildAvatar(child, jpeg)
        Unit
    }.onSuccess { refresh() }

    suspend fun uploadAvatarPhoto(child: Child, jpeg: ByteArray): Result<Unit> =
        runCatching { repository.uploadChildAvatar(child, jpeg); Unit }.onSuccess { refresh() }

    suspend fun removeAvatarPhoto(child: Child): Result<Unit> =
        runCatching { repository.removeChildAvatarPhoto(child) }.onSuccess { refresh() }

    // ── Chores ───────────────────────────────────────────────────────────────

    suspend fun createChore(row: NewChoreRow): Result<Chore> {
        val s = _state.value
        if (s.chores.size >= s.choreLimit) {
            _state.update { it.copy(upgradePrompt = LimitType.Chores) }
            return Result.failure(LimitReached())
        }
        return runCatching { repository.createChore(row) }
            .onSuccess { c -> _state.update { it.copy(chores = it.chores + c) }; refresh() }
    }

    suspend fun updateChore(choreId: String, row: NewChoreRow): Result<Unit> =
        runCatching { repository.updateChore(choreId, row) }.onSuccess { refresh() }

    fun deleteChore(chore: Chore) {
        viewModelScope.launch {
            _state.update { it.copy(chores = it.chores - chore) }
            runCatching { repository.deleteChore(chore.id) }
                .onFailure { _state.update { it.copy(chores = it.chores + chore, error = uiText(R.string.delete_failed_body, chore.name)) } }
        }
    }

    /** Server suggestions when reachable, the local catalogue otherwise; cleared first so stale ones never show. */
    fun loadSuggestions(childId: String?) {
        suggestionJob?.cancel()
        _state.update { it.copy(suggestions = emptyList(), suggestionsPersonalized = false) }
        val child = _state.value.child(childId) ?: return
        suggestionJob = viewModelScope.launch {
            val s = _state.value
            val existing = s.choresFor(child.id).map { it.name }
            val due = (0..6).sumOf { s.dueOn(child.id, it).size }
            val done = (0..6).sumOf { s.doneOn(child.id, it) }
            val rate = if (due == 0) 0.0 else done * 100.0 / due
            val ai = repository.aiSuggestions(child.name, child.age, existing, rate)
            val list = ai ?: ChoreSuggestionEngine.suggestions(child.name, child.age, existing, rate)
            _state.update { it.copy(suggestions = list, suggestionsPersonalized = ai != null) }
        }
    }

    fun dismissUpgradePrompt() = _state.update { it.copy(upgradePrompt = null) }
    fun clearError() = _state.update { it.copy(error = null) }
    fun signOut() { viewModelScope.launch { runCatching { repository.signOut() } } }
}

sealed interface PinChange {
    data object Keep : PinChange
    data object Remove : PinChange
    data class Set(val pin: String) : PinChange
}

class LimitReached : Exception("limit")

/** The starter reward set the web ships (lib/constants/rewards.ts). */
val STARTER_REWARDS: List<Triple<String, String, Int>> = listOf(
    Triple("📱", "30 minutes of screen time", 200),
    Triple("🌙", "Stay up 30 minutes late", 300),
    Triple("🎬", "Pick the family movie", 400),
    Triple("🍕", "Pick Friday dinner", 500),
    Triple("🍦", "Ice cream trip", 500),
    Triple("🎲", "Family game night, your pick", 400),
)
