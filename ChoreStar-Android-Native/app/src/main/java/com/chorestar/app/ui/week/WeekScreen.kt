package com.chorestar.app.ui.week

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.ChoreCategory
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Money
import com.chorestar.app.data.model.Chore
import com.chorestar.app.ui.BulkPlan
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.avatarColor
import com.chorestar.app.ui.theme.Success
import com.chorestar.app.ui.theme.Warning
import kotlinx.coroutines.delay
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private enum class ViewMode { Daily, Grid }

/** iOS WeekCalendarView: child pills, week navigator, summary card, daily list or 7-day grid, bulk catch-up. */
@Composable
fun WeekScreen(vm: DashboardViewModel, state: DashboardState) {
    var childId by remember(state.children) { mutableStateOf(state.children.firstOrNull()?.id) }
    var mode by remember { mutableStateOf(ViewMode.Daily) }
    var bulkMenu by remember { mutableStateOf(false) }
    var plan by remember { mutableStateOf<BulkPlan?>(null) }
    var planTitle by remember { mutableStateOf(0) }
    var toast by remember { mutableStateOf(false) }
    val child = state.child(childId)
    val week = state.viewedWeekStart
    val isCurrent = week == state.weekStart

    LaunchedEffect(toast) { if (toast) { delay(1800); toast = false } }

    if (state.children.isEmpty()) {
        Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text(stringResource(R.string.no_children_yet), style = MaterialTheme.typography.titleMedium)
            Text(stringResource(R.string.week_no_children_hint), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }
    if (child == null) return
    val chores = state.choresFor(child.id)
    val order = Dates.displayOrder()

    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (state.children.size > 1) item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.children, key = { it.id }) { c ->
                        FilterChip(selected = c.id == childId, onClick = { childId = c.id }, label = { Text(c.name) }, leadingIcon = { ChildAvatar(c, 22.dp) })
                    }
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.childs_week, child.name), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    Box {
                        IconButton(onClick = { bulkMenu = true }, enabled = chores.isNotEmpty() && isCurrent) {
                            Icon(Icons.Filled.CheckCircle, contentDescription = stringResource(R.string.mark_chores_in_bulk))
                        }
                        DropdownMenu(expanded = bulkMenu, onDismissRequest = { bulkMenu = false }) {
                            DropdownMenuItem(text = { Text(stringResource(R.string.mark_today_done)) }, onClick = {
                                bulkMenu = false
                                val p = vm.bulkPlan(child.id, state.today, state.today)
                                if (p.isEmpty) toast = true else { plan = p; planTitle = R.string.mark_today_done }
                            })
                            DropdownMenuItem(text = { Text(stringResource(R.string.mark_week_so_far_done)) }, onClick = {
                                bulkMenu = false
                                val p = vm.bulkPlan(child.id, 0, state.today)
                                if (p.isEmpty) toast = true else { plan = p; planTitle = R.string.mark_week_so_far_done }
                            })
                        }
                    }
                }
            }
            item {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(selected = mode == ViewMode.Daily, onClick = { mode = ViewMode.Daily }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text(stringResource(R.string.daily_list)) }
                    SegmentedButton(selected = mode == ViewMode.Grid, onClick = { mode = ViewMode.Grid }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text(stringResource(R.string.week_view)) }
                }
            }
            item { WeekNavigator(week, isCurrent, onPrev = { vm.viewWeek(Dates.previousWeek(week)) }, onNext = { vm.viewWeek(Dates.nextWeek(week)) }, onToday = { vm.viewWeek(state.weekStart) }) }
            if (chores.isNotEmpty()) item { WeekSummaryCard(state, child.id, week) }
            if (chores.isEmpty()) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("📅", style = MaterialTheme.typography.displayMedium)
                        Text(stringResource(R.string.chores_none), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.week_empty_hint, child.name), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            } else when (mode) {
                ViewMode.Daily -> items(order, key = { "d$it" }) { day -> DayBreakdownCard(vm, state, child.id, day, week, isCurrent) }
                ViewMode.Grid -> item { WeekGrid(vm, state, child.id, chores, week, isCurrent) }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
        if (toast) Snackbar(Modifier.align(Alignment.TopCenter).padding(16.dp)) { Text("✅ " + stringResource(R.string.all_caught_up)) }
    }

    plan?.let { p ->
        val n = p.toTick.size
        val body = buildString {
            append(pluralStringResource(R.plurals.bulk_will_check_off, n, n, child.name))
            if (p.earningsDeltaCents > 0) append(stringResource(R.string.bulk_and_add_earnings, Money.format(p.earningsDeltaCents, state.currency))) else append(".")
            if (p.toApprove.isNotEmpty()) append(" " + pluralStringResource(R.plurals.bulk_pending_approved, p.toApprove.size, p.toApprove.size))
        }
        AlertDialog(
            onDismissRequest = { plan = null },
            title = { Text(stringResource(planTitle)) },
            text = { Text(body) },
            confirmButton = { TextButton(onClick = { vm.runBulk(p); plan = null }) { Text(stringResource(R.string.mark_done)) } },
            dismissButton = { TextButton(onClick = { plan = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun WeekNavigator(week: String, isCurrent: Boolean, onPrev: () -> Unit, onNext: () -> Unit, onToday: () -> Unit) {
    val start = LocalDate.parse(week)
    val label = if (isCurrent) stringResource(R.string.this_week) else stringResource(
        R.string.week_of,
        start.format(DateTimeFormatter.ofPattern(if (start.year == LocalDate.now().year) "MMM d" else "MMM d, yyyy", Locale.getDefault())),
    )
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            IconButton(onClick = onPrev) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = stringResource(R.string.previous_week)) }
            Text(label, style = MaterialTheme.typography.titleMedium)
            IconButton(onClick = onNext, enabled = !isCurrent, modifier = Modifier.alpha(if (isCurrent) 0.35f else 1f)) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = stringResource(R.string.next_week)) }
        }
        if (!isCurrent) TextButton(onClick = onToday) { Text(stringResource(R.string.back_to_this_week)) }
    }
}

/** Perfect Days / Earned (perfect days only, as iOS) / Complete (done cells ÷ chores × 7). */
@Composable
private fun WeekSummaryCard(state: DashboardState, childId: String, week: String) {
    val chores = state.choresFor(childId)
    val perfectDays = (0..6).filter { state.isPerfectDay(childId, it, week) }
    val earned = perfectDays.sumOf { state.earnedCents(childId, it, week) }
    val completed = chores.sumOf { c -> (0..6).count { state.isDone(c.id, it, week) } }
    val pct = if (chores.isEmpty()) 0 else completed * 100 / (chores.size * 7)
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                Stat("${perfectDays.size}", "⭐ " + stringResource(R.string.stats_perfect_days))
                Stat(Money.format(earned, state.currency), "💰 " + stringResource(R.string.stats_earned))
                Stat("$pct%", "📊 " + stringResource(R.string.stats_complete))
            }
            if (state.settings?.isPerChore != true) {
                Spacer(Modifier.height(10.dp))
                Text(
                    "ℹ️ " + stringResource(R.string.daily_bonus_line, Money.format(state.settings?.dailyRewardCents ?: 100, state.currency)),
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun Stat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, maxLines = 1)
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun DayBreakdownCard(vm: DashboardViewModel, state: DashboardState, childId: String, day: Int, week: String, isCurrent: Boolean) {
    val isToday = isCurrent && day == state.today
    val due = state.dueOn(childId, day, week)
    val done = due.count { state.isDone(it.id, day, week) }
    val perfect = state.isPerfectDay(childId, day, week)
    val earned = if (perfect) state.earnedCents(childId, day, week) else 0
    Card(Modifier.fillMaxWidth().then(if (isToday) Modifier.border(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), RoundedCornerShape(12.dp)) else Modifier)) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(Dates.longDayName(day), style = MaterialTheme.typography.titleMedium, color = if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                        if (isToday) {
                            Spacer(Modifier.width(8.dp))
                            Text(stringResource(R.string.today_pill), style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.background(MaterialTheme.colorScheme.primary, RoundedCornerShape(8.dp)).padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    Text(
                        if (due.isEmpty()) stringResource(R.string.nothing_scheduled) else stringResource(R.string.n_of_m_completed, done, due.size),
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (perfect && earned > 0) Text("⭐ " + Money.format(earned, state.currency), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                }
                val pct = if (due.isEmpty()) 0 else done * 100 / due.size
                Box(Modifier.size(50.dp).clip(CircleShape).background(if (perfect) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                    Text(if (perfect) "⭐" else "$pct%", style = MaterialTheme.typography.labelLarge)
                }
            }
            if (due.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                due.forEach { chore ->
                    val isDone = state.isDone(chore.id, day, week)
                    val pending = state.isPending(chore.id, day, week)
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (isDone) Success.copy(alpha = 0.05f) else Color.Transparent)
                            .clickable { vm.toggle(chore, day, week) }.padding(horizontal = 6.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        when {
                            pending -> Icon(Icons.Filled.Schedule, contentDescription = stringResource(R.string.chore_state_waiting_tap), tint = Warning, modifier = Modifier.size(24.dp))
                            isDone -> Icon(Icons.Filled.CheckCircle, contentDescription = stringResource(R.string.chore_state_done), tint = Success, modifier = Modifier.size(24.dp))
                            else -> Box(Modifier.size(24.dp).border(2.dp, MaterialTheme.colorScheme.outline, CircleShape))
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(chore.icon ?: "📝", style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(chore.name, style = MaterialTheme.typography.bodyLarge, color = if (isDone) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(stringResource(ChoreCategory.normalize(chore.category).label), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun WeekGrid(vm: DashboardViewModel, state: DashboardState, childId: String, chores: List<Chore>, week: String, isCurrent: Boolean) {
    val order = Dates.displayOrder()
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                order.forEach { day ->
                    val isToday = isCurrent && day == state.today
                    val perfect = state.isPerfectDay(childId, day, week)
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(Dates.shortDayName(day).take(3), style = MaterialTheme.typography.labelLarge, color = if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                        Box(Modifier.size(6.dp).background(if (isToday) MaterialTheme.colorScheme.primary else Color.Transparent, CircleShape))
                        if (perfect) Text(Money.format(state.earnedCents(childId, day, week), state.currency), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, maxLines = 1)
                        else Spacer(Modifier.height(14.dp))
                    }
                }
            }
            chores.forEachIndexed { i, chore ->
                HorizontalDivider(Modifier.padding(vertical = 6.dp))
                Column(Modifier.fillMaxWidth().background(if (i % 2 == 0) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f) else Color.Transparent, RoundedCornerShape(8.dp)).padding(4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(chore.icon ?: "📝", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.width(6.dp))
                        Text(chore.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        if (!chore.isEveryDay) Text(order.filter { it in chore.daysOfWeek }.joinToString(" ") { Dates.shortDayName(it).take(2) }, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(Modifier.height(6.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        order.forEach { day ->
                            DayCell(
                                modifier = Modifier.weight(1f),
                                done = state.isDone(chore.id, day, week),
                                pending = isCurrent && state.isPending(chore.id, day, week),
                                due = chore.isDueOn(day) && !state.isVacationDay(state.dateOf(week, day)),
                                isToday = isCurrent && day == state.today,
                                onTap = { vm.toggle(chore, day, week) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DayCell(modifier: Modifier, done: Boolean, pending: Boolean, due: Boolean, isToday: Boolean, onTap: () -> Unit) {
    val outline = MaterialTheme.colorScheme.onSurfaceVariant
    val primary = MaterialTheme.colorScheme.primary
    val bg = when { done -> Success; pending -> Warning.copy(alpha = 0.18f); due -> MaterialTheme.colorScheme.surface; else -> Color.Transparent }
    val borderColor = when { isToday -> primary.copy(alpha = 0.5f); done -> Success; pending -> Warning; due -> outline.copy(alpha = 0.2f); else -> outline.copy(alpha = 0.35f) }
    val strokeDp = if (isToday) 3.dp else 1.5.dp
    val density = LocalDensity.current
    Box(
        modifier.height(50.dp).clip(RoundedCornerShape(12.dp)).background(bg)
            .drawBehind {
                val stroke = with(density) { strokeDp.toPx() }
                drawRoundRect(
                    color = borderColor, cornerRadius = CornerRadius(with(density) { 12.dp.toPx() }),
                    style = Stroke(width = stroke, pathEffect = if (!due && !done && !pending) PathEffect.dashPathEffect(floatArrayOf(12f, 9f)) else null),
                )
            }
            .alpha(if (!due && !done && !pending) 0.6f else 1f)
            .clickable(onClick = onTap),
        contentAlignment = Alignment.Center,
    ) {
        when {
            done -> Icon(Icons.Filled.Check, contentDescription = stringResource(R.string.chore_state_done), tint = Color.White, modifier = Modifier.size(24.dp))
            pending -> Icon(Icons.Filled.Schedule, contentDescription = stringResource(R.string.chore_state_waiting_tap), tint = Warning, modifier = Modifier.size(20.dp))
        }
    }
}
