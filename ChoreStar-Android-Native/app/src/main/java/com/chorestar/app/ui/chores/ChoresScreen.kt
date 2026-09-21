package com.chorestar.app.ui.chores

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import com.chorestar.app.ui.components.ChildAvatar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Money
import com.chorestar.app.data.model.Chore
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.week.WeekScreen
import com.chorestar.app.ui.routines.RoutinesList
import com.chorestar.app.ui.theme.Success
import com.chorestar.app.ui.theme.Warning

private enum class ChoresSegment(val label: Int) { Chores(R.string.chores_title), Routines(R.string.segment_routines), Week(R.string.segment_week) }

/** iOS ChoresView filter menu: All = every chore; Pending = due today, not done; Completed = done today. */
private enum class StatusFilter(val label: Int) { All(R.string.filter_all), Pending(R.string.stat_pending), Completed(R.string.stat_completed) }

/** The iOS Chores tab: a Chores | Week switch; chores grouped under each child, tap to tick today, long-press to edit. */
@Composable
fun ChoresScreen(vm: DashboardViewModel, state: DashboardState, onToggleToday: (Chore) -> Unit, onAddChore: () -> Unit, onEditChore: (Chore) -> Unit, onBuildRoutine: () -> Unit, onStarterRoutines: () -> Unit, onEditRoutine: (com.chorestar.app.data.model.Routine) -> Unit) {
    val today = state.today
    var segment by remember { mutableStateOf(ChoresSegment.Chores) }
    var childFilter by remember { mutableStateOf<String?>(null) }
    var status by remember { mutableStateOf(StatusFilter.All) }
    var query by remember { mutableStateOf("") }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                ChoresSegment.entries.forEachIndexed { i, s ->
                    SegmentedButton(selected = segment == s, onClick = { segment = s }, shape = SegmentedButtonDefaults.itemShape(i, ChoresSegment.entries.size)) { Text(stringResource(s.label)) }
                }
            }
            if (segment == ChoresSegment.Week) { WeekScreen(vm, state); return@Column }
            if (segment == ChoresSegment.Routines) { RoutinesList(vm, state, onBuild = onBuildRoutine, onStarter = onStarterRoutines, onEdit = onEditRoutine); return@Column }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text(stringResource(R.string.chores_title), style = MaterialTheme.typography.headlineMedium)
                Text(Dates.longDayName(today), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            item {
                OutlinedTextField(
                    query, { query = it }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(stringResource(R.string.search_chores)) }, leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                )
            }
            if (state.children.size > 1) item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item { FilterChip(selected = childFilter == null, onClick = { childFilter = null }, label = { Text(stringResource(R.string.filter_all)) }) }
                    items(state.children, key = { it.id }) { c -> FilterChip(selected = childFilter == c.id, onClick = { childFilter = c.id }, label = { Text(c.name) }, leadingIcon = { ChildAvatar(c, 22.dp) }) }
                }
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(StatusFilter.entries) { f -> FilterChip(selected = status == f, onClick = { status = f }, label = { Text(stringResource(f.label)) }) }
                }
            }
            var shown = 0
            state.children.filter { childFilter == null || it.id == childFilter }.forEach { child ->
                val chores = state.choresFor(child.id).filter { c ->
                    (query.isBlank() || c.name.contains(query, ignoreCase = true)) && when (status) {
                        StatusFilter.All -> true
                        StatusFilter.Pending -> c.isDueOn(today) && !state.isDone(c.id, today)
                        StatusFilter.Completed -> state.isDone(c.id, today)
                    }
                }
                if (chores.isEmpty()) return@forEach
                shown += chores.size
                item(key = "h-${child.id}") {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp)) {
                        ChildAvatar(child, 28.dp); Spacer(Modifier.width(8.dp))
                        Text(child.name, style = MaterialTheme.typography.titleMedium); Spacer(Modifier.width(8.dp))
                        Text("${chores.size}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.weight(1f))
                        val done = state.doneOn(child.id, today); val due = state.dueOn(child.id, today).size
                        Text(if (due == 0) stringResource(R.string.home_nothing_due_today) else "$done/$due", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                item(key = "c-${child.id}") {
                    Card(Modifier.fillMaxWidth()) {
                        Column {
                            chores.forEachIndexed { i, chore ->
                                if (i > 0) HorizontalDivider(Modifier.padding(start = 56.dp))
                                ChoreRow(
                                    chore = chore,
                                    done = state.isDone(chore.id, today),
                                    pending = state.isPending(chore.id, today),
                                    due = chore.isDueOn(today),
                                    perChore = state.settings?.isPerChore == true,
                                    currency = state.currency,
                                    onTap = { onToggleToday(chore) },
                                    onLongPress = { onEditChore(chore) },
                                )
                            }
                        }
                    }
                }
            }
            if (shown == 0 && !state.loading) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        when {
                            state.chores.isEmpty() -> { Text(stringResource(R.string.chores_none), style = MaterialTheme.typography.titleMedium); Text(stringResource(R.string.tap_plus_to_add_chore), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            status == StatusFilter.Pending -> { Text(stringResource(R.string.all_done_title), style = MaterialTheme.typography.titleMedium); Text(stringResource(R.string.all_done_body), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            status == StatusFilter.Completed -> { Text(stringResource(R.string.no_completed_title), style = MaterialTheme.typography.titleMedium); Text(stringResource(R.string.no_completed_body), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            else -> Text(stringResource(R.string.chores_none), style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }
        }
        }
        if (segment == ChoresSegment.Chores) FloatingActionButton(onClick = onAddChore, modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp)) {
            Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.add_chore))
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChoreRow(chore: Chore, done: Boolean, pending: Boolean, due: Boolean, perChore: Boolean, currency: String?, onTap: () -> Unit, onLongPress: () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().combinedClickable(onClick = onTap, onLongClick = onLongPress).padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when {
            pending -> Icon(Icons.Filled.Schedule, contentDescription = stringResource(R.string.chore_state_waiting), tint = Warning)
            done -> Icon(Icons.Filled.CheckCircle, contentDescription = stringResource(R.string.chore_state_done), tint = Success)
            else -> Icon(Icons.Outlined.Circle, contentDescription = stringResource(R.string.chore_state_not_done), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = if (due) 0.6f else 0.3f))
        }
        Spacer(Modifier.width(12.dp))
        Text(chore.icon ?: "📝", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                chore.name,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
                textDecoration = if (done) TextDecoration.LineThrough else null,
                color = if (done || !due) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            )
            if (!chore.isEveryDay) {
                Text(
                    Dates.displayOrder().filter { it in chore.daysOfWeek }.joinToString(" · ") { Dates.shortDayName(it) },
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (perChore) {
            Spacer(Modifier.width(8.dp))
            Text(
                Money.format(chore.rewardCents, currency),
                style = MaterialTheme.typography.bodyMedium,
                color = if (done) Success else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
