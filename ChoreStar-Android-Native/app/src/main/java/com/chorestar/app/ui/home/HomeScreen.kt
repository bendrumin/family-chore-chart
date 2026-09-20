package com.chorestar.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Money
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.theme.Indigo500
import com.chorestar.app.ui.theme.Violet500
import java.time.LocalDate
import java.time.LocalTime

@Composable
fun HomeScreen(state: DashboardState, onRefresh: () -> Unit, onOpenChores: () -> Unit) {
    PullToRefreshBox(isRefreshing = state.loading, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
        if (state.loading && state.children.isEmpty()) {
            Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                CircularProgressIndicator()
            }
            return@PullToRefreshBox
        }
        val today = state.today
        val familyDue = state.children.sumOf { state.dueOn(it.id, today).size }
        val familyDone = state.children.sumOf { state.doneOn(it.id, today) }
        val earnedToday = state.children.sumOf { state.earnedCents(it.id, today) }

        LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { HeroCard(state, familyDone, familyDue, earnedToday, onOpenChores) }

            if (state.pendingCompletions.isNotEmpty()) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text(stringResource(R.string.home_needs_your_ok), style = MaterialTheme.typography.titleMedium)
                            val pending = state.pendingCompletions.size
                            Text(
                                pluralStringResource(R.plurals.home_pending_count, pending, pending),
                                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            item { Text(stringResource(R.string.home_today), style = MaterialTheme.typography.titleLarge) }
            items(state.children, key = { it.id }) { child ->
                val due = state.dueOn(child.id, today)
                val done = state.doneOn(child.id, today)
                Card(Modifier.fillMaxWidth().clickable(onClick = onOpenChores)) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        ChildAvatar(child, 48.dp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(child.name, style = MaterialTheme.typography.titleMedium)
                            Text(
                                if (due.isEmpty()) stringResource(R.string.home_nothing_due_today)
                                else stringResource(R.string.home_child_done_of_due, done, due.size),
                                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (due.isNotEmpty()) {
                                Spacer(Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = { done.toFloat() / due.size },
                                    modifier = Modifier.fillMaxWidth().height(6.dp),
                                )
                            }
                        }
                        val earned = state.earnedCents(child.id, today)
                        if (earned > 0) {
                            Spacer(Modifier.width(12.dp))
                            Text(Money.format(earned, state.currency), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
            if (state.children.isEmpty()) {
                item {
                    Text(
                        stringResource(R.string.home_no_children),
                        style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun HeroCard(state: DashboardState, done: Int, due: Int, earnedCents: Int, onOpenChores: () -> Unit) {
    val hour = LocalTime.now().hour
    val greeting = stringResource(
        when { hour < 12 -> R.string.greeting_morning; hour < 17 -> R.string.greeting_afternoon; else -> R.string.greeting_evening },
    )
    val date = Dates.formatLong(LocalDate.now())
    Card(
        Modifier.fillMaxWidth().clickable(onClick = onOpenChores),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Column(
            Modifier.background(Brush.linearGradient(listOf(Indigo500, Violet500))).padding(20.dp),
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(greeting, color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodyLarge)
                Text(date, color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodyMedium)
            }
            Spacer(Modifier.height(4.dp))
            Text(
                state.profile?.familyName?.ifBlank { null } ?: stringResource(R.string.home_your_family),
                color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold,
            )
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(stringResource(R.string.home_done_of_due, done, due), color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.home_chores_done_today), color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodyMedium)
            }
            if (earnedCents > 0) {
                Text(stringResource(R.string.home_earned_today, Money.format(earnedCents, state.currency)), color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodyMedium)
            }
            if (state.children.isNotEmpty()) {
                Spacer(Modifier.height(14.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.children, key = { it.id }) { child ->
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            ChildAvatar(child, 52.dp)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "${child.name} ${state.doneOn(child.id, state.today)}/${state.dueOn(child.id, state.today).size}",
                                color = Color.White, style = MaterialTheme.typography.labelMedium,
                            )
                        }
                    }
                }
            }
        }
    }
}
