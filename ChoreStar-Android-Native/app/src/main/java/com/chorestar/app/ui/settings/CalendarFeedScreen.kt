package com.chorestar.app.ui.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.CalendarFeed
import com.chorestar.app.data.CalendarFeedsResponse
import com.chorestar.app.data.WebApiError
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.components.PremiumGateCard
import kotlinx.coroutines.launch

/**
 * The family calendar feed (Premium, migration 033), Settings > Family on the
 * web: one secret iCalendar URL for the whole family and one per kid, for
 * Google, Apple or Outlook calendars. Turning a feed off is never gated.
 */
@Composable
fun CalendarFeedScreen(vm: DashboardViewModel, onBack: () -> Unit, onPaywall: (String) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf<CalendarFeedsResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf<String?>(null) }
    var confirmRegen by remember { mutableStateOf<String?>(null) }
    var notice by remember { mutableStateOf<String?>(null) }
    val familyKey = "family"

    suspend fun load() {
        runCatching { vm.premiumApi.calendarFeeds() }
            .onSuccess { data = it; error = null }
            .onFailure { e -> error = if (e is WebApiError && e.status == 503) context.getString(R.string.calendar_not_ready) else e.message }
    }
    LaunchedEffect(Unit) { load() }

    fun enable(childId: String?) {
        busy = childId ?: familyKey
        scope.launch {
            runCatching { vm.premiumApi.enableCalendarFeed(childId, java.util.TimeZone.getDefault().id) }
                .onSuccess { load() }
                .onFailure { e -> if (e is WebApiError && e.premiumRequired) onPaywall("gate_calendar") else notice = e.message }
            busy = null
        }
    }

    fun disable(childId: String?) {
        busy = childId ?: familyKey
        scope.launch {
            runCatching { vm.premiumApi.disableCalendarFeed(childId) }.onSuccess { load() }.onFailure { e -> notice = e.message }
            busy = null
        }
    }

    SubScreen(stringResource(R.string.calendar_title), onBack) { padding ->
        val d = data
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item { Text(stringResource(R.string.calendar_intro), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            when {
                d == null && error == null -> item { Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                d == null -> item { Text(error ?: "", color = MaterialTheme.colorScheme.error) }
                else -> {
                    if (!d.premium) item {
                        PremiumGateCard("📅", stringResource(R.string.calendar_title), stringResource(R.string.calendar_locked_body), onSeePremium = { onPaywall("gate_calendar") })
                    }
                    val scopes: List<Pair<String?, String>> = listOf<Pair<String?, String>>(null to context.getString(R.string.calendar_whole_family)) + d.children.map { it.id to it.name }
                    scopes.forEach { (childId, label) ->
                        val feed = d.feeds.firstOrNull { it.childId == childId }
                        // A free family only sees scopes that already have a feed, so it can turn them off.
                        if (!d.premium && feed == null) return@forEach
                        item(key = childId ?: familyKey) {
                            FeedCard(label, feed, premium = d.premium, busy = busy == (childId ?: familyKey),
                                onEnable = { enable(childId) }, onDisable = { disable(childId) }, onRegenerate = { confirmRegen = childId ?: familyKey },
                                onCopy = { copy(context, it.https); notice = context.getString(R.string.calendar_copied) },
                                onOpen = { open(context, it) })
                        }
                    }
                    notice?.let { n -> item { Text(n, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall) } }
                    item { Text(stringResource(R.string.calendar_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }

    confirmRegen?.let { key ->
        AlertDialog(
            onDismissRequest = { confirmRegen = null },
            title = { Text(stringResource(R.string.calendar_regenerate_title)) },
            text = { Text(stringResource(R.string.calendar_regenerate_body)) },
            confirmButton = { TextButton(onClick = { confirmRegen = null; enable(if (key == familyKey) null else key) }) { Text(stringResource(R.string.calendar_regenerate)) } },
            dismissButton = { TextButton(onClick = { confirmRegen = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun FeedCard(label: String, feed: CalendarFeed?, premium: Boolean, busy: Boolean, onEnable: () -> Unit, onDisable: () -> Unit, onRegenerate: () -> Unit, onCopy: (CalendarFeed) -> Unit, onOpen: (CalendarFeed) -> Unit) {
    SettingsCard(label) {
        if (feed == null) {
            Text(stringResource(R.string.calendar_off), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(onClick = onEnable, enabled = premium && !busy, modifier = Modifier.fillMaxWidth()) {
                if (busy) CircularProgressIndicator(Modifier.padding(2.dp), strokeWidth = 2.dp) else Text(stringResource(R.string.calendar_turn_on))
            }
            return@SettingsCard
        }
        Text(feed.https, style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace, maxLines = 2)
        Text(if (feed.lastFetchedAt != null) stringResource(R.string.calendar_in_use) else stringResource(R.string.calendar_not_used_yet), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { onOpen(feed) }, modifier = Modifier.weight(1f)) { Text(stringResource(R.string.calendar_add)) }
            OutlinedButton(onClick = { onCopy(feed) }, modifier = Modifier.weight(1f)) { Text(stringResource(R.string.calendar_copy)) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (premium) TextButton(onClick = onRegenerate, enabled = !busy) { Text(stringResource(R.string.calendar_regenerate)) }
            TextButton(onClick = onDisable, enabled = !busy) { Text(stringResource(R.string.calendar_turn_off), color = MaterialTheme.colorScheme.error) }
        }
    }
}

private fun copy(context: Context, text: String) {
    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(ClipData.newPlainText("ChoreStar calendar", text))
}

/** webcal:// opens a calendar app that subscribes; without one, Google Calendar's add-by-URL page. */
private fun open(context: Context, feed: CalendarFeed) {
    val webcal = Intent(Intent.ACTION_VIEW, Uri.parse(feed.webcal))
    val ok = runCatching { context.startActivity(webcal) }.isSuccess
    if (!ok) runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(feed.google ?: feed.https))) }
}
