package com.chorestar.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chorestar.app.R
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.data.Dates
import com.chorestar.app.data.model.Child
import com.chorestar.app.data.model.Chore
import com.chorestar.app.data.model.ChoreCompletion
import com.chorestar.app.data.model.FamilySettings
import com.chorestar.app.data.model.Profile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

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
) {
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
}

class DashboardViewModel(private val repository: ChoreStarRepository) : ViewModel() {
    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state

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
                _state.update {
                    it.copy(loading = false, effectiveUserId = uid, profile = profile, children = children,
                        chores = chores, completions = completions, settings = settings, weekStart = weekStart)
                }
            }.onFailure { e ->
                _state.update { it.copy(loading = false, error = e.message?.let(UiText::Raw) ?: uiText(R.string.error_load_family)) }
            }
        }
    }

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

    fun clearError() = _state.update { it.copy(error = null) }

    fun signOut() { viewModelScope.launch { runCatching { repository.signOut() } } }
}
