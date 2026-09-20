package com.chorestar.app.ui.family

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.WindowInsets
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chorestar.app.R
import com.chorestar.app.data.Money
import com.chorestar.app.data.model.Chore
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.chores.ChoreRow
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.avatarColor
import com.chorestar.app.ui.theme.Success
import com.chorestar.app.ui.theme.Warning

/** iOS ChildDetailView: header, four stats, today's progress, chores in To Do / Completed / Other Days. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChildDetailScreen(
    vm: DashboardViewModel,
    childId: String,
    onBack: () -> Unit,
    onEditChild: () -> Unit,
    onAddChore: () -> Unit,
    onEditChore: (Chore) -> Unit,
    onAchievements: () -> Unit = {},
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val child = state.child(childId) ?: run { onBack(); return }
    val today = state.today
    val chores = state.choresFor(child.id)
    val due = chores.filter { it.isDueOn(today) }
    val todo = due.filter { !state.isDone(it.id, today) }
    val done = due.filter { state.isDone(it.id, today) }
    val other = chores.filter { !it.isDueOn(today) }
    val earned = state.earnedCents(child.id, today)
    val perChore = state.settings?.isPerChore == true
    val toDoTitle = stringResource(R.string.to_do)
    val completedTitle = stringResource(R.string.stat_completed)
    val otherDaysTitle = stringResource(R.string.other_days)

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0),
                title = {},
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) } },
                actions = {
                    IconButton(onClick = onEditChild) { Icon(Icons.Filled.Edit, contentDescription = stringResource(R.string.edit_child)) }
                    IconButton(onClick = onAddChore) { Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.add_chore)) }
                },
            )
        },
    ) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    ChildAvatar(child, 100.dp)
                    Spacer(Modifier.height(8.dp))
                    Text(child.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
                    child.age?.let { Text(stringResource(R.string.family_age, it), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatCard(Modifier.weight(1f), "${done.size}", stringResource(R.string.stat_completed), Success)
                    StatCard(Modifier.weight(1f), "${todo.size}", stringResource(R.string.stat_pending), Warning)
                    StatCard(Modifier.weight(1f), Money.format(earned, state.currency), stringResource(R.string.stats_earned), MaterialTheme.colorScheme.primary)
                    StatCard(Modifier.weight(1f).clickable(onClick = onAchievements), "${state.badgeCount(child.id)}", stringResource(R.string.stat_badges), Warning)
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        val pct = if (due.isEmpty()) 0 else done.size * 100 / due.size
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(stringResource(R.string.todays_progress), style = MaterialTheme.typography.titleMedium)
                            Text("$pct%", style = MaterialTheme.typography.titleMedium, color = avatarColor(child.avatarColor))
                        }
                        Spacer(Modifier.height(10.dp))
                        LinearProgressIndicator(progress = { pct / 100f }, modifier = Modifier.fillMaxWidth().height(8.dp), color = avatarColor(child.avatarColor))
                    }
                }
            }
            item { Text(stringResource(R.string.childs_chores, child.name), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 8.dp)) }
            if (chores.isEmpty()) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(stringResource(R.string.chores_none), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.child_no_chores_yet, child.name), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            choreGroup(this, toDoTitle, todo, state, perChore, vm, onEditChore, faded = false)
            choreGroup(this, completedTitle, done, state, perChore, vm, onEditChore, faded = false)
            choreGroup(this, otherDaysTitle, other, state, perChore, vm, onEditChore, faded = true)
        }
    }
}

private fun choreGroup(
    scope: androidx.compose.foundation.lazy.LazyListScope,
    title: String,
    chores: List<Chore>,
    state: com.chorestar.app.ui.DashboardState,
    perChore: Boolean,
    vm: DashboardViewModel,
    onEditChore: (Chore) -> Unit,
    faded: Boolean,
) {
    if (chores.isEmpty()) return
    scope.item(key = "h-$title") { Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp)) }
    scope.item(key = "g-$title") {
        Card(Modifier.fillMaxWidth().let { if (faded) it.then(Modifier.padding(0.dp)) else it }) {
            Column {
                chores.forEachIndexed { i, chore ->
                    if (i > 0) HorizontalDivider(Modifier.padding(start = 56.dp))
                    ChoreRow(
                        chore = chore,
                        done = state.isDone(chore.id, state.today),
                        pending = state.isPending(chore.id, state.today),
                        due = chore.isDueOn(state.today),
                        perChore = perChore,
                        currency = state.currency,
                        onTap = { vm.toggleToday(chore) },
                        onLongPress = { onEditChore(chore) },
                    )
                }
            }
        }
    }
}

@Composable
private fun StatCard(modifier: Modifier, value: String, label: String, tint: Color) {
    Card(modifier) {
        Column(Modifier.padding(vertical = 12.dp, horizontal = 6.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.titleLarge, color = tint, maxLines = 1)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}
