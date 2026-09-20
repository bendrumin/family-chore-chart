package com.chorestar.app.ui.stats

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
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Money
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.components.ChildAvatar
import java.time.LocalDate

/** This week, per child: how much of the grid is filled, perfect days, and money earned. */
@Composable
fun StatsScreen(state: DashboardState) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text(stringResource(R.string.stats_title), style = MaterialTheme.typography.headlineMedium)
            Text(stringResource(R.string.stats_week_of, Dates.formatMedium(LocalDate.parse(state.weekStart))), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(state.children, key = { it.id }) { child ->
            val slots = (0..6).sumOf { state.dueOn(child.id, it).size }
            val filled = (0..6).sumOf { state.doneOn(child.id, it) }
            val perfect = (0..6).count { state.isPerfectDay(child.id, it) }
            val earned = (0..6).sumOf { state.earnedCents(child.id, it) }
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ChildAvatar(child, 40.dp)
                        Spacer(Modifier.width(12.dp))
                        Text(child.name, style = MaterialTheme.typography.titleMedium)
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Stat("$perfect", stringResource(R.string.stats_perfect_days))
                        Stat(Money.format(earned, state.currency), stringResource(R.string.stats_earned))
                        Stat(if (slots == 0) "0%" else "${filled * 100 / slots}%", stringResource(R.string.stats_complete))
                    }
                    Spacer(Modifier.height(12.dp))
                    LinearProgressIndicator(progress = { if (slots == 0) 0f else filled.toFloat() / slots }, modifier = Modifier.fillMaxWidth().height(6.dp))
                }
            }
        }
    }
}

@Composable
private fun Stat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.headlineSmall)
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
