package com.chorestar.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.chorestar.app.BuildConfig
import com.chorestar.app.R
import com.chorestar.app.data.Money
import com.chorestar.app.ui.DashboardState

@Composable
fun SettingsScreen(state: DashboardState, email: String?, onSignOut: () -> Unit) {
    val s = state.settings
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(stringResource(R.string.settings_title), style = MaterialTheme.typography.headlineMedium) }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(stringResource(R.string.settings_account), style = MaterialTheme.typography.titleMedium)
                    Text(email ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(state.profile?.familyName ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(stringResource(R.string.settings_plan, state.profile?.subscriptionType ?: "free"), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(stringResource(R.string.settings_rewards), style = MaterialTheme.typography.titleMedium)
                    val mode = if (s?.isPerChore == true) stringResource(R.string.settings_per_chore)
                    else stringResource(R.string.settings_daily_rate, Money.format(s?.dailyRewardCents ?: 0, s?.currencyCode))
                    Text(mode, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(stringResource(R.string.settings_currency, s?.currencyCode ?: "USD"), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (s?.requireApproval == true) Text(stringResource(R.string.settings_require_approval), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item {
            OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.settings_sign_out)) }
        }
        item {
            Text("ChoreStar ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
