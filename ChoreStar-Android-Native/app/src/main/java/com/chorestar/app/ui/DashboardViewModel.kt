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
import com.chorestar.app.data.model.Profile
import com.chorestar.app.ui.components.LimitType
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

const val FREE_CHILD_LIMIT = 3
const val FREE_CHORE_LIMIT = 20

data class DashboardState(
    val loading: Boolean = true,
    val error: UiText? = null,
    val effectiveUserId: String? = null,
    val profile: Profile? = null,
    val children: List<Child> = emptyList(),
    val chores: List<Chore> = emptyList(),
    val completions: List<ChoreCompletion> = emptyList(),
    val settings: FamilySettings? = null,
    val weekStart: String = Dates.weekStart(),
    /** Cells a write is in flight for, so a double tap does not double-write. */
    val saving: Set<String> = emptySet(),
    val pinChildIds: Set<String> = emptySet(),
    /** Signed URLs for uploaded avatar photos, by child id. */
    val photoUrls: Map<String, String> = emptyMap(),
    val upgradePrompt: LimitType? = null,
    val suggestions: List<ChoreSuggestion> = emptyList(),
    val suggestionsPersonalized: Boolean = false,
) {
    fun child(id: String?) = children.firstOrNull { it.id == id }
    fun chore(id: String?) = chores.firstOrNull { it.id == id }
    fun choresFor(childId: String) = chores.filter { it.childId == childId }
    fun completion(choreId: String, day: Int) = completions.firstOrNull { it.choreId == choreId && it.dayOfWeek == day }
    fun isDone(choreId: String, day: Int) = completion(choreId, day)?.counts == true
    fun isPending(choreId: String, day: Int) = completion(choreId, day)?.isPending == true
    fun dueOn(childId: String, day: Int) = choresFor(childId).filter { it.isDueOn(day) }
    fun doneOn(childId: String, day: Int) = dueOn(childId, day).count { isDone(it.id, day) }
    fun isPerfectDay(childId: String, day: Int): Boolean {
        val due = dueOn(childId, day)
        return due.isNotEmpty() && due.all { isDone(it.id, day) }
    }
    /** What a child earned on a day: the daily rate for a perfect day, or the sum of done chores per-chore. */
    fun earnedCents(childId: String, day: Int): Int {
        val s = settings ?: return 0
        return if (s.isPerChore) dueOn(childId, day).filter { isDone(it.id, day) }.sumOf { it.rewardCents }
        else if (isPerfectDay(childId, day)) (s.dailyRewardCents ?: 0) else 0
    }
    val pendingCompletions: List<ChoreCompletion> get() = completions.filter { it.isPending }
    val today: Int get() = Dates.dayOfWeek()
    val currency: String? get() = settings?.currencyCode
    val isPremium: Boolean get() = profile?.isPremium == true
    val childLimit: Int get() = if (isPremium) Int.MAX_VALUE else FREE_CHILD_LIMIT
    val choreLimit: Int get() = if (isPremium) Int.MAX_VALUE else FREE_CHORE_LIMIT
}

class DashboardViewModel(private val repository: ChoreStarRepository) : ViewModel() {
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
                _state.update {
                    it.copy(loading = false, effectiveUserId = uid, profile = profile, children = children,
                        chores = chores, completions = completions, settings = settings, weekStart = weekStart,
                        pinChildIds = pins, photoUrls = photos)
                }
            }.onFailure { e ->
                _state.update { it.copy(loading = false, error = e.message?.let(UiText::Raw) ?: uiText(R.string.error_load_family)) }
            }
        }
    }

    // ── Completions ──────────────────────────────────────────────────────────

    /** Parent tap on today's cell: mark or unmark. Optimistic, reverted on failure. */
    fun toggleToday(chore: Chore) = toggle(chore, Dates.dayOfWeek())

    fun toggle(chore: Chore, day: Int) {
        val key = "${chore.id}:$day"
        val s = _state.value
        if (key in s.saving) return
        val existing = s.completion(chore.id, day)
        if (existing?.isPending == true) return // approvals come in a later build
        viewModelScope.launch {
            _state.update { it.copy(saving = it.saving + key) }
            runCatching {
                if (existing != null) {
                    _state.update { it.copy(completions = it.completions - existing) }
                    repository.removeCompletion(existing.id)
                } else {
                    val placeholder = ChoreCompletion(id = "local:$key", choreId = chore.id, dayOfWeek = day, weekStart = s.weekStart)
                    _state.update { it.copy(completions = it.completions + placeholder) }
                    val saved = repository.addCompletion(chore.id, day, s.weekStart)
                    _state.update { it.copy(completions = it.completions.map { c -> if (c.id == placeholder.id) saved else c }) }
                }
            }.onFailure { e ->
                _state.update {
                    val reverted = if (existing != null) it.completions + existing else it.completions.filterNot { c -> c.id == "local:$key" }
                    it.copy(completions = reverted, error = uiText(R.string.error_could_not_save, e.message ?: ""))
                }
            }
            _state.update { it.copy(saving = it.saving - key) }
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
                .onFailure { e -> _state.update { it.copy(chores = it.chores + chore, error = uiText(R.string.delete_failed_body, chore.name)) } }
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
