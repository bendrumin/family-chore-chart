package com.chorestar.app.ui.chores

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import com.chorestar.app.ui.theme.Success
import com.chorestar.app.ui.theme.Warning

/** The iOS Chores tab: one line per chore, grouped under each child, tap to tick today. */
@Composable
fun ChoresScreen(state: DashboardState, onToggleToday: (Chore) -> Unit) {
    val today = state.today
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Text(stringResource(R.string.chores_title), style = MaterialTheme.typography.headlineMedium)
            Text(Dates.longDayName(today), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
        }
        state.children.forEach { child ->
            val chores = state.choresFor(child.id)
            if (chores.isEmpty()) return@forEach
            item(key = "h-${child.id}") {
                Text(child.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
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
                            )
                        }
                    }
                }
            }
        }
        if (state.chores.isEmpty() && !state.loading) {
            item { Text(stringResource(R.string.chores_none), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

@Composable
private fun ChoreRow(chore: Chore, done: Boolean, pending: Boolean, due: Boolean, perChore: Boolean, currency: String?, onTap: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onTap).padding(horizontal = 12.dp, vertical = 10.dp),
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
