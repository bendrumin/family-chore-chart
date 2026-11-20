package com.chorestar.app.ui.settings

import android.icu.text.ListFormatter
import android.text.format.DateFormat
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.PlanLimits
import com.chorestar.app.data.WebApiError
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.theme.Warning
import kotlinx.coroutines.launch
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Home: the free limits around Premium ending (iOS PlanLimitsCard).
 * Ending (renewal off): what will pause and when. Ended: what is paused,
 * that nothing is deleted, Resume Premium, and Choose what stays on.
 * Renders nothing for every other family.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PlanLimitsCard(vm: DashboardViewModel, state: DashboardState, onPaywall: (String) -> Unit) {
    var limits by remember { mutableStateOf<PlanLimits.State?>(null) }
    var choosing by remember { mutableStateOf(false) }
    // Reload when the plan changes or a kid's paused flag does (a refresh after resubscribing, or a save).
    val pausedKey = state.children.map { it.id to it.pausedByPlan }
    LaunchedEffect(state.isPremium, pausedKey) {
        if (state.profile == null) return@LaunchedEffect
        runCatching { vm.planLimitsApi.load() }.onSuccess { limits = it }
    }
    val s = limits ?: return
    val card = PlanLimits.card(s) ?: return

    val title: String
    val body: String
    when (card) {
        is PlanLimits.Card.Ending -> {
            val will = summary(card.kids, card.chores)
            title = monthDay(card.endsAt)?.let { stringResource(R.string.plan_ends_on, it) } ?: stringResource(R.string.plan_set_to_end)
            body = stringResource(R.string.plan_ending_body, will, s.limits.kids, s.limits.chores)
        }
        is PlanLimits.Card.Paused -> {
            title = stringResource(R.string.plan_paused_title, summary(card.kids, card.chores))
            body = stringResource(R.string.plan_paused_body, s.limits.kids, s.limits.chores)
        }
    }

    Card(Modifier.fillMaxWidth().testTag("plan-limits-card"), border = BorderStroke(1.dp, Warning.copy(alpha = 0.45f))) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Icon(Icons.Filled.PauseCircle, contentDescription = null, tint = Warning)
                Spacer(Modifier.width(10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            // Ending only comes from App Store renewal notices, which an Android phone can't manage: the text says what to do.
            if (card is PlanLimits.Card.Paused && !state.isSharedMember) {
                // Flows onto a second line when both don't fit (longer languages, big text).
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp), itemVerticalAlignment = Alignment.CenterVertically) {
                    Button(onClick = { onPaywall("plan_paused") }) { Text(stringResource(R.string.plan_resume)) }
                    TextButton(onClick = { choosing = true }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.plan_choose)) }
                }
            }
        }
    }

    if (choosing) ChooseActiveSheet(vm, s, onDismiss = { choosing = false }) { next ->
        limits = next
        choosing = false
        vm.refresh()
    }
}

/** "Leo and 25 chores" / "Leo, Mia and 3 chores", in the phone's language. */
@Composable
private fun summary(kids: List<String>, chores: Int): String {
    val parts = buildList {
        if (kids.isNotEmpty()) add(ListFormatter.getInstance().format(kids))
        if (chores > 0) add(stringResource(R.string.plan_n_chores, chores))
    }
    return ListFormatter.getInstance().format(parts)
}

private fun monthDay(iso: String?): String? {
    val date = iso?.let { runCatching { OffsetDateTime.parse(it) }.getOrNull() } ?: return null
    val locale = Locale.getDefault()
    return date.format(DateTimeFormatter.ofPattern(DateFormat.getBestDateTimePattern(locale, "MMMMd"), locale))
}

/** Pick up to the free limits of kids and chores to keep on; the rest pause, never deleted. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChooseActiveSheet(vm: DashboardViewModel, s: PlanLimits.State, onDismiss: () -> Unit, onSaved: (PlanLimits.State) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val initial = remember(s) { PlanLimits.initialPick(s) }
    var kids by remember { mutableStateOf(initial.first) }
    var chores by remember { mutableStateOf(initial.second) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val kept = s.kids.filter { it.id in kids }
    val choreCount = PlanLimits.keptChores(s, kids, chores).size

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        LazyColumn(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            item {
                Text(stringResource(R.string.plan_choose), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.padding(4.dp))
                Text(stringResource(R.string.plan_kids_count, kids.size, s.limits.kids), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            }
            items(s.kids, key = { "k" + it.id }) { kid ->
                val on = kid.id in kids
                ToggleRow(kid.name, on, enabled = on || kids.size < s.limits.kids) { kids = if (it) kids + kid.id else kids - kid.id }
            }
            kept.forEach { kid ->
                item(key = "h" + kid.id) {
                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    Text(kid.name, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                }
                items(kid.chores, key = { "c" + it.id }) { chore ->
                    val on = chore.id in chores
                    ToggleRow(chore.name, on, enabled = on || choreCount < s.limits.chores) { chores = if (it) chores + chore.id else chores - chore.id }
                }
            }
            item {
                Spacer(Modifier.padding(4.dp))
                Text(stringResource(R.string.plan_chores_footer, choreCount, s.limits.chores), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 6.dp)) }
                Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End)) {
                    TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
                    Button(enabled = !saving, onClick = {
                        saving = true; error = null
                        scope.launch {
                            runCatching { vm.planLimitsApi.choose(kids, PlanLimits.keptChores(s, kids, chores)) }
                                .onSuccess(onSaved)
                                .onFailure { e ->
                                    error = if (e is WebApiError) context.getString(R.string.plan_save_failed) else context.getString(R.string.plan_save_offline)
                                }
                            saving = false
                        }
                    }) { Text(stringResource(if (saving) R.string.saving else R.string.save)) }
                }
            }
        }
    }
}

@Composable
private fun ToggleRow(label: String, on: Boolean, enabled: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge,
            color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
        Switch(checked = on, onCheckedChange = onChange, enabled = enabled)
    }
}
