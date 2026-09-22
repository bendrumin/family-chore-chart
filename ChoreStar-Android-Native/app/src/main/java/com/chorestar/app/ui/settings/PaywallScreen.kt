package com.chorestar.app.ui.settings

import android.app.Activity
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.R
import com.chorestar.app.data.PlayBilling
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel

/** iOS PaywallView on Google Play: two plan cards, Continue, Restore, and the unavailable state until the products are live. */
@Composable
fun PaywallScreen(vm: DashboardViewModel, state: DashboardState, onBack: () -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as ChoreStarApp
    val billing = app.billing
    val plans by billing.plans.collectAsStateWithLifecycle()
    val event by billing.events.collectAsStateWithLifecycle()
    var selected by remember { mutableStateOf(PlayBilling.YEARLY) }
    var welcome by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { if (plans == null) billing.loadPlans() }
    LaunchedEffect(event) {
        when (val e = event) {
            is PlayBilling.Event.Purchased -> { welcome = true; vm.refresh(); billing.clearEvent() }
            is PlayBilling.Event.Failed -> { error = e.message; billing.clearEvent() }
            PlayBilling.Event.Cancelled -> billing.clearEvent()
            null -> Unit
        }
    }

    SubScreen(stringResource(R.string.premium), onBack) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("👑", style = MaterialTheme.typography.displayMedium)
            Text(stringResource(R.string.paywall_title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
            Text(stringResource(R.string.paywall_subtitle), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(R.string.paywall_feat_unlimited, R.string.paywall_feat_store, R.string.premium_bullet_themes, R.string.paywall_feat_indie).forEach { Text("✅ " + stringResource(it)) }
                }
            }
            when {
                state.isPremium -> Text(stringResource(R.string.already_premium), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                plans == null -> CircularProgressIndicator()
                plans!!.isEmpty() -> {
                    Text(stringResource(R.string.paywall_unavailable), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://chorestar.app/dashboard?tab=settings"))) }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.paywall_web_upgrade)) }
                }
                else -> {
                    plans!!.forEach { plan ->
                        val yearly = plan.productId == PlayBilling.YEARLY
                        val isSel = selected == plan.productId
                        Card(
                            Modifier.fillMaxWidth().border(2.dp, if (isSel) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(14.dp)).clickable { selected = plan.productId },
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(stringResource(if (yearly) R.string.plan_annual else R.string.plan_monthly), style = MaterialTheme.typography.titleMedium)
                                        // White on its own was invisible against the light card; the badge carries its own fill.
                                        if (yearly) {
                                            Spacer(Modifier.width(8.dp))
                                            Text(
                                                stringResource(R.string.best_value),
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onPrimary,
                                                modifier = Modifier
                                                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(50))
                                                    .padding(horizontal = 8.dp, vertical = 2.dp),
                                            )
                                        }
                                    }
                                    Text(stringResource(if (yearly) R.string.billed_yearly else R.string.billed_monthly), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(plan.price, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    val chosen = plans!!.firstOrNull { it.productId == selected } ?: plans!!.first()
                    Button(
                        onClick = { state.profile?.id?.let { pid -> (context as? Activity)?.let { billing.purchase(it, chosen, pid) } } },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) { Text(stringResource(R.string.continue_label)) }
                }
            }
            if (!state.isPremium) TextButton(onClick = { billing.restore() }) { Text(stringResource(R.string.restore_purchases)) }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            Text(stringResource(R.string.paywall_legal), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row {
                TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://chorestar.app/terms"))) }) { Text(stringResource(R.string.terms)) }
                TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://chorestar.app/privacy"))) }) { Text(stringResource(R.string.privacy)) }
            }
        }
    }
    if (welcome) {
        AlertDialog(
            onDismissRequest = { welcome = false; onBack() },
            title = { Text(stringResource(R.string.welcome_premium_title)) },
            text = { Text(stringResource(R.string.welcome_premium_body)) },
            confirmButton = { TextButton(onClick = { welcome = false; onBack() }) { Text(stringResource(R.string.done_label)) } },
        )
    }
}
