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
import androidx.compose.runtime.setValue
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
import kotlinx.coroutines.launch
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
            item { AllowanceSection(vm, state, child.id, child.name) }
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

/** iOS ParentGoalSection: what is owed, the active goal, and payouts. */
@Composable
private fun AllowanceSection(vm: DashboardViewModel, state: com.chorestar.app.ui.DashboardState, childId: String, childName: String) {
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    androidx.compose.runtime.LaunchedEffect(childId) { vm.loadWallet(childId) }
    val w = state.wallets[childId]
    var payoutDialog by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    var amount by androidx.compose.runtime.remember(w?.owedCents) { androidx.compose.runtime.mutableStateOf(w?.let { Money.plain(it.owedCents, state.currency) } ?: "") }
    var busy by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    var message by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<String?>(null) }
    val cur = state.currency
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.allowance), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                Text(if (w == null) "…" else if (w.owedCents > 0) stringResource(R.string.amount_owed, Money.format(w.owedCents, cur)) else stringResource(R.string.all_paid_up), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            val goal = w?.goal
            if (goal != null) {
                Spacer(Modifier.height(8.dp))
                Text("${goal.emoji ?: "🎯"} " + stringResource(R.string.saving_for_title, goal.title), style = MaterialTheme.typography.bodyLarge)
                Text(stringResource(R.string.goal_progress, Money.format(goal.progressCents, cur), Money.format(goal.targetCents, cur)) + if (goal.reached) " · " + stringResource(R.string.goal_reached) else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                LinearProgressIndicator(progress = { goal.percent / 100f }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp).height(8.dp))
            } else if (w != null) {
                Text(stringResource(R.string.set_a_goal_for, childName), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
            }
            if (w != null && w.owedCents > 0) {
                Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    androidx.compose.material3.OutlinedButton(onClick = { payoutDialog = true }) { Text(stringResource(R.string.paid_out)) }
                    if (goal != null) androidx.compose.material3.Button(onClick = {
                        busy = true
                        scope.launch { vm.payout(childId, null, null, goal.id).onSuccess { message = null }.onFailure { message = it.message }; busy = false }
                    }, enabled = !busy) { Text(stringResource(if (goal.reached) R.string.pay_out_goal else R.string.pay_toward_goal)) }
                }
            }
            message?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
    }
    if (payoutDialog && w != null) {
        val cents = Money.parseCents(amount) ?: 0
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { payoutDialog = false },
            title = { Text(stringResource(R.string.record_a_payout)) },
            text = {
                Column {
                    Text(stringResource(R.string.is_owed, childName, Money.format(w.owedCents, cur)))
                    androidx.compose.material3.OutlinedTextField(amount, { amount = it }, label = { Text(stringResource(R.string.amount)) }, prefix = { Text(Money.symbol(cur)) }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal))
                    Text(
                        when { cents <= 0 || cents > w.owedCents -> stringResource(R.string.enter_amount_up_to, Money.format(w.owedCents, cur)); cents == w.owedCents -> stringResource(R.string.pays_everything); else -> stringResource(R.string.will_remain, Money.format(w.owedCents - cents, cur)) },
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp),
                    )
                }
            },
            confirmButton = {
                androidx.compose.material3.TextButton(enabled = cents in 1..w.owedCents && !busy, onClick = {
                    busy = true
                    scope.launch { vm.payout(childId, cents, null, null).onFailure { message = it.message }; busy = false; payoutDialog = false }
                }) { Text(stringResource(R.string.pay_amount, Money.format(cents.coerceAtLeast(0), cur))) }
            },
            dismissButton = { androidx.compose.material3.TextButton(onClick = { payoutDialog = false }) { Text(stringResource(R.string.cancel)) } },
        )
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
