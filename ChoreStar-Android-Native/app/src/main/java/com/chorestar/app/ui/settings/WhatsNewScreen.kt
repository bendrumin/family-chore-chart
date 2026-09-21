package com.chorestar.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chorestar.app.R

/** The changelog the web and iOS show (lib/constants/changelog.ts), newest first. */
data class ChangelogFeature(val icon: String, val title: String, val description: String)
data class ChangelogEntry(val version: String, val date: String, val title: String, val features: List<ChangelogFeature>)

object Changelog {
    const val LATEST = "2026.9.6"
    val entries = listOf(
        ChangelogEntry("2026.9.6", "September 2026", "Vacation Mode", listOf(
            ChangelogFeature("🏖️", "Pause the Chart, Keep the Streaks", "Going away? Set a date range in Settings and nothing is due while you're gone: no misses, no broken streaks, no red grid to come home to. Kids see a friendly note that their streak is safe, the reward store stays open, and it all ends on its own."),
        )),
        ChangelogEntry("2026.9.5", "September 2026", "Your Kids Lead the Dashboard", listOf(
            ChangelogFeature("👨‍👩‍👧‍👦", "A Hero Built Around Your Family", "The dashboard now opens with your family name and each kid's own progress ring around their avatar, so you see who's done what at a glance. Tap a kid to jump straight to their chores. Seasonal themes paint it exactly like before."),
        )),
        ChangelogEntry("2026.9.3", "September 2026", "Catch-Up Tools for Busy Weeks", listOf(
            ChangelogFeature("✅", "Mark Today or the Week Done", "Life happens and the chart falls behind. Two buttons above the week grid check off everything due through today in one tap: only scheduled days count, anything waiting for your OK gets approved, and the confirmation shows exactly what will change."),
            ChangelogFeature("💵", "Pay Out Any Amount", "Your kid spends a dollar at the dollar store? Subtract exactly that dollar. The Paid Out button asks how much, defaults to the full balance, and shows what will remain. Goals and balances update everywhere on their own."),
        )),
        ChangelogEntry("2026.9.2", "September 2026", "ChoreStar Around the World", listOf(
            ChangelogFeature("🗣️", "Kid Mode in Spanish, Portuguese, and Arabic", "The kid dashboard, routines, celebrations, and store follow each device's language, so kids can use ChoreStar on their own long before their English catches up. Arabic runs right to left."),
            ChangelogFeature("💰", "Dozens of Currencies", "Pick your family's currency in Settings, from riyals to reais, and every reward, goal, and payout shows the right symbol and decimals. Yen and Chilean pesos skip the decimals entirely, as they should."),
            ChangelogFeature("📅", "Weeks That Match Your Calendar", "The chore grid and day pickers start the week on your calendar's first day: Monday in Europe, Sunday in the Americas. In the Gulf, the Weekdays and Weekends presets mean Sunday to Thursday and Friday to Saturday."),
        )),
        ChangelogEntry("2026.9.1", "September 2026", "Somewhere for the Money to Go", listOf(
            ChangelogFeature("🎯", "Goals", "Kids pick what they are saving for, right from their dashboard, and watch the bar fill as their unspent allowance grows. When it is full, you get a nudge to pay it out and the goal goes on their trophy shelf."),
            ChangelogFeature("🛍️", "The Reward Store", "Price the things money cannot buy: 30 minutes of screen time, picking Friday dinner, staying up late. Kids see what they can afford and ask with one tap; you say yes or no from the Needs your OK tray, and the price comes off their balance."),
        )),
    )
}

@Composable
fun WhatsNewScreen(onBack: () -> Unit) {
    SubScreen(stringResource(R.string.whats_new), onBack) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Changelog.entries.forEach { entry ->
                item(key = entry.version) {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(entry.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text("${entry.version} · ${entry.date}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            entry.features.forEach { f ->
                                Row {
                                    Text(f.icon, style = MaterialTheme.typography.headlineSmall); Spacer(Modifier.width(12.dp))
                                    Column { Text(f.title, style = MaterialTheme.typography.titleMedium); Text(f.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
