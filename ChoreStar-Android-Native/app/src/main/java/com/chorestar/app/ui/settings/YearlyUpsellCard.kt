package com.chorestar.app.ui.settings

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.R
import com.chorestar.app.data.PlayBilling
import com.chorestar.app.data.YearlyUpsell
import com.chorestar.app.ui.DashboardState

/**
 * Home: "Switch to yearly and save 33%" for a monthly Play subscriber past
 * their first renewal (iOS YearlyUpsellCard). Prices are Play's own for this
 * account's country; it never shows under a 10% saving, and Not now hides it
 * for 30 days. Only the family owner, who is the one paying, sees it.
 */
@Composable
fun YearlyUpsellCard(state: DashboardState) {
    val context = LocalContext.current
    val app = context.applicationContext as ChoreStarApp
    val billing = app.billing
    val plans by billing.plans.collectAsStateWithLifecycle()
    var current by remember { mutableStateOf<PlayBilling.Current?>(null) }
    var hidden by remember { mutableStateOf(YearlyUpsell.snoozed(app.prefs.yearlyUpsellSnoozedUntil, System.currentTimeMillis())) }
    val candidate = state.isPremium && !state.isSharedMember && !hidden

    LaunchedEffect(candidate) {
        if (!candidate) return@LaunchedEffect
        current = billing.current()
        if (current != null && plans == null) billing.loadPlans()
    }
    // After the switch Play reports the yearly plan, and the card goes away.
    val event by billing.events.collectAsStateWithLifecycle()
    LaunchedEffect(event) { if (event is PlayBilling.Event.Purchased && candidate) current = billing.current() }
    val now = current ?: return
    if (!candidate || !YearlyUpsell.eligible(now.productId, now.purchaseTimeMillis, System.currentTimeMillis())) return
    val monthly = plans?.firstOrNull { it.productId == PlayBilling.MONTHLY } ?: return
    val yearly = plans?.firstOrNull { it.productId == PlayBilling.YEARLY } ?: return
    val percent = YearlyUpsell.savingsPercent(monthly.priceMicros, yearly.priceMicros)
    if (percent < YearlyUpsell.MINIMUM_SAVINGS_PERCENT) return

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("📅 " + stringResource(R.string.yearly_title, percent), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.yearly_body_play, yearly.price, monthly.price), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = {
                    val pid = state.profile?.id ?: return@Button
                    (context as? Activity)?.let { billing.switchPlan(it, yearly, now, pid) }
                }) { Text(stringResource(R.string.yearly_switch)) }
                TextButton(onClick = {
                    app.prefs.yearlyUpsellSnoozedUntil = System.currentTimeMillis() + YearlyUpsell.SNOOZE_DAYS * 24 * 60 * 60 * 1000
                    hidden = true
                }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.not_now)) }
            }
        }
    }
}
