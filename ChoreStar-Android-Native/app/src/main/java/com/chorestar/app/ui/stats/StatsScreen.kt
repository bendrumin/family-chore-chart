package com.chorestar.app.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Money
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.avatarColor

/** iOS HistoryView ("Stats & History"): tiles, this-week chart, by-child, perfect days, streak, leaderboard. */
@Composable
fun StatsScreen(state: DashboardState) {
    var childId by remember { mutableStateOf<String?>(null) }
    val children = state.children.filter { childId == null || it.id == childId }
    val order = Dates.displayOrder()
    val week = state.weekStart

    // Per-child weekly stats, aggregated the way iOS does (sum completions/earnings, AND daily status, max streak).
    val completions = children.sumOf { c -> state.choresFor(c.id).sumOf { ch -> (0..6).count { state.isDone(ch.id, it, week) } } }
    val earnings = children.sumOf { c -> (0..6).sumOf { state.earnedCents(c.id, it, week) } + weeklyBonus(state, c.id) }
    val perfectPerChild = children.map { c -> (0..6).count { state.isPerfectDay(c.id, it, week) } }
    val avgPerfect = if (children.isEmpty()) 0 else perfectPerChild.sum() / children.size
    val dailyStatus = (0..6).map { d -> children.isNotEmpty() && children.all { state.isPerfectDay(it.id, d, week) } }
    val streak = children.maxOfOrNull { state.streak(it.id) } ?: 0
    val badges = state.achievements.size
    val perDay = (0..6).map { d -> children.sumOf { c -> state.choresFor(c.id).count { state.isDone(it.id, d, week) } } }
    val maxDay = (perDay.maxOrNull() ?: 0).coerceAtLeast(1)

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(stringResource(R.string.stats_history), style = MaterialTheme.typography.headlineMedium) }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { FilterChip(selected = childId == null, onClick = { childId = null }, label = { Text(stringResource(R.string.filter_all)) }) }
                items(state.children, key = { it.id }) { c -> FilterChip(selected = childId == c.id, onClick = { childId = c.id }, label = { Text(c.name) }, leadingIcon = { ChildAvatar(c, 22.dp) }) }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Tile(Modifier.weight(1f), "✅", "$completions", stringResource(R.string.stat_completed))
                Tile(Modifier.weight(1f), "⭐", Money.format(earnings, state.currency), stringResource(R.string.total_earned))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Tile(Modifier.weight(1f), "🏆", "$badges", stringResource(R.string.total_badges))
                Tile(Modifier.weight(1f), "📈", "${avgPerfect * 100 / 7}%", stringResource(R.string.completion_label))
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(stringResource(R.string.completions_this_week), style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth().height(150.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
                        order.forEach { d ->
                            Column(Modifier.weight(1f).fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                                Text("${perDay[d]}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Box(Modifier.fillMaxWidth().height((110 * perDay[d] / maxDay).dp.coerceAtLeast(4.dp)).clip(RoundedCornerShape(6.dp)).background(MaterialTheme.colorScheme.primary.copy(alpha = if (d == state.today) 1f else 0.55f)))
                                Text(Dates.shortDayName(d).take(3), style = MaterialTheme.typography.labelSmall, color = if (d == state.today) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
        if (childId == null && state.children.size > 1) item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(stringResource(R.string.by_child), style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(10.dp))
                    val counts = state.children.map { c -> c to state.choresFor(c.id).sumOf { ch -> (0..6).count { state.isDone(ch.id, it, week) } } }
                    val maxC = (counts.maxOfOrNull { it.second } ?: 0).coerceAtLeast(1)
                    counts.forEach { (c, n) ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                            Text(c.name, modifier = Modifier.width(90.dp), style = MaterialTheme.typography.bodyMedium)
                            Box(Modifier.weight(1f).height(18.dp).clip(RoundedCornerShape(6.dp)).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                if (n > 0) Box(Modifier.fillMaxWidth(n.toFloat() / maxC).height(18.dp).background(avatarColor(c.avatarColor), RoundedCornerShape(6.dp)))
                            }
                            Spacer(Modifier.width(8.dp)); Text("$n", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(stringResource(R.string.stats_perfect_days), style = MaterialTheme.typography.titleMedium)
                        Text("${dailyStatus.count { it }}/7", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        order.forEach { d ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(if (dailyStatus[d]) "⭐" else "☆", style = MaterialTheme.typography.headlineSmall, color = if (dailyStatus[d]) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline)
                                Text(Dates.shortDayName(d).take(3), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    if (dailyStatus.all { it }) Text(stringResource(R.string.perfect_week_line), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 8.dp))
                }
            }
        }
        if (streak > 0) item {
            Card(Modifier.fillMaxWidth().border(1.dp, Color(0xFFF97316).copy(alpha = 0.3f), RoundedCornerShape(12.dp))) {
                Row(Modifier.padding(16.dp).background(Color(0xFFF97316).copy(alpha = 0.06f)), verticalAlignment = Alignment.CenterVertically) {
                    Text("🔥", style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.width(12.dp))
                    Column { Text(stringResource(R.string.day_streak, streak), style = MaterialTheme.typography.titleMedium); Text(stringResource(R.string.streak_subtitle), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(stringResource(R.string.family_leaderboard), style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    val ranked = state.children.map { c -> c to state.choresFor(c.id).sumOf { ch -> (0..6).count { state.isDone(ch.id, it, week) } } }.sortedByDescending { it.second }
                    ranked.forEachIndexed { i, (c, _) ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(when (i) { 0 -> "🥇"; 1 -> "🥈"; 2 -> "🥉"; else -> "#${i + 1}" }, modifier = Modifier.width(32.dp))
                            ChildAvatar(c, 36.dp); Spacer(Modifier.width(10.dp))
                            Text(c.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Chip("✅ ${state.doneOn(c.id, state.today)}"); Spacer(Modifier.width(4.dp))
                            Chip("⭐ " + Money.format(state.earnedCents(c.id, state.today), state.currency)); Spacer(Modifier.width(4.dp))
                            Chip("🏆 ${state.badgeCount(c.id)}")
                        }
                    }
                }
            }
        }
    }
}

private fun weeklyBonus(state: DashboardState, childId: String): Int {
    val s = state.settings ?: return 0
    val dueDays = (0..6).count { state.dueOn(childId, it).isNotEmpty() }
    val perfect = (0..6).count { state.isPerfectDay(childId, it) }
    return if (dueDays > 0 && perfect == dueDays) (s.weeklyBonusCents ?: 0) else 0
}

@Composable
private fun Tile(modifier: Modifier, icon: String, value: String, label: String) {
    Card(modifier) {
        Column(Modifier.padding(14.dp)) {
            Text(icon); Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, maxLines = 1)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun Chip(text: String) = Text(text, style = MaterialTheme.typography.labelSmall, modifier = Modifier.background(MaterialTheme.colorScheme.surfaceVariant, CircleShape).padding(horizontal = 8.dp, vertical = 3.dp))
