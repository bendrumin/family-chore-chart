package com.chorestar.app.ui.money

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.LedgerItem
import com.chorestar.app.data.MinutesItem
import com.chorestar.app.data.Money
import com.chorestar.app.data.MoneyKid
import com.chorestar.app.data.MoneyResponse
import com.chorestar.app.data.MoneyRules
import com.chorestar.app.data.WebApiError
import com.chorestar.app.data.Dates
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.components.LockedFeatureRow
import com.chorestar.app.ui.components.PremiumTag
import com.chorestar.app.ui.settings.SettingsCard
import com.chorestar.app.ui.settings.SubScreen
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

/**
 * Kid money management for parents (Premium, migration 030), the web's
 * Settings > Rewards > Money: Spend/Save/Give jars, the weekly allowance with
 * payday and threshold, interest on Save, fines with a reason, weekly
 * paybacks, donations, screen-time minutes. Everything goes through
 * /api/money, which owns the rules; switching anything on needs Premium,
 * switching off never does.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MoneyScreen(vm: DashboardViewModel, state: DashboardState, initialChildId: String?, onBack: () -> Unit, onPaywall: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var data by remember { mutableStateOf<MoneyResponse?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf(initialChildId) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    suspend fun load() {
        val family = state.effectiveUserId ?: return
        runCatching { vm.premiumApi.money(family) }
            .onSuccess { r -> data = r; loadError = null; if (selected == null || r.kids.none { it.childId == selected }) selected = r.kids.firstOrNull()?.childId }
            .onFailure { e -> loadError = e.message }
    }
    LaunchedEffect(state.effectiveUserId) { load() }

    /** One POST; a refusal for Premium opens the paywall with that tool's source. */
    fun act(action: String, childId: String, fields: Map<String, JsonElement>, feature: MoneyRules.Feature?, onDone: () -> Unit = {}) {
        if (busy) return
        busy = true; message = null
        scope.launch {
            runCatching { vm.premiumApi.moneyAction(action, childId, fields) }
                .onSuccess { kid ->
                    val d = data
                    if (kid != null && d != null) data = d.copy(kids = d.kids.map { if (it.childId == kid.childId) kid else it }) else load()
                    message = context.getString(R.string.money_saved)
                    onDone()
                    vm.loadWallet(childId)
                }
                .onFailure { e ->
                    message = when {
                        e is WebApiError && e.premiumRequired -> { onPaywall((MoneyRules.Feature.of(e.code) ?: feature ?: MoneyRules.Feature.Jars).paywallSource); null }
                        e is WebApiError && e.notEnough -> context.getString(R.string.money_not_enough, Money.format(e.available ?: 0, data?.currencyCode))
                        else -> e.message
                    }
                }
            busy = false
        }
    }

    SubScreen(stringResource(R.string.money_title), onBack) { padding ->
        val d = data
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item { Text(stringResource(R.string.money_intro), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            when {
                d == null && loadError == null -> item { Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                d == null -> item { Text(loadError ?: "", color = MaterialTheme.colorScheme.error) }
                !d.ready -> item { Text(stringResource(R.string.money_not_ready), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                d.kids.isEmpty() -> item { Text(stringResource(R.string.add_a_child_first)) }
                else -> {
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(d.kids, key = { it.childId }) { k -> FilterChip(selected = k.childId == selected, onClick = { selected = k.childId; message = null }, label = { Text(k.name) }) }
                        }
                    }
                    val kid = d.kids.firstOrNull { it.childId == selected } ?: d.kids.first()
                    if (!d.premium || kid.balance == null) {
                        item { MoneyPreview(kid.name, onPaywall) }
                    } else {
                        item { BalanceCard(kid, d.currencyCode) }
                        item { JarsCard(kid, busy) { enabled, split -> act("jars", kid.childId, mapOf("enabled" to JsonPrimitive(enabled), "spend" to JsonPrimitive(split.spend), "save" to JsonPrimitive(split.save), "give" to JsonPrimitive(split.give)), MoneyRules.Feature.Jars) } }
                        item { ScheduleCard(kid, d.currencyCode, busy) { payday, allowance, threshold, bps ->
                            act("schedule", kid.childId, mapOf("paydayWeekday" to JsonPrimitive(payday), "allowanceCents" to JsonPrimitive(allowance), "thresholdPct" to (threshold?.let { JsonPrimitive(it) } ?: kotlinx.serialization.json.JsonNull), "interestBps" to JsonPrimitive(bps)),
                                if (allowance > 0) MoneyRules.Feature.Allowance else MoneyRules.Feature.Interest)
                        } }
                        item { FineCard(d.currencyCode, busy) { cents, reason, allowNegative, onDone -> act("fine", kid.childId, mapOf("amountCents" to JsonPrimitive(cents), "reason" to JsonPrimitive(reason), "allowNegative" to JsonPrimitive(allowNegative)), MoneyRules.Feature.Fines, onDone) } }
                        item { RepaymentCard(kid, d.currencyCode, busy,
                            onAdd = { title, cents, allowNegative, onDone -> act("repayment", kid.childId, mapOf("title" to JsonPrimitive(title), "amountCents" to JsonPrimitive(cents), "allowNegative" to JsonPrimitive(allowNegative)), MoneyRules.Feature.Fines, onDone) },
                            onStop = { id -> act("repayment-stop", kid.childId, mapOf("repaymentId" to JsonPrimitive(id)), null) }) }
                        if (kid.balance.jars.enabled) item { DonationCard(kid, d.currencyCode, busy) { cents, note, onDone -> act("donation", kid.childId, mapOf("amountCents" to JsonPrimitive(cents), "note" to JsonPrimitive(note)), MoneyRules.Feature.Jars, onDone) } }
                        item { MinutesCard(kid, busy,
                            onUse = { minutes -> act("minutes-use", kid.childId, mapOf("minutes" to JsonPrimitive(minutes)), MoneyRules.Feature.Minutes) },
                            onReward = { target, id, minutes -> act("minutes-reward", kid.childId, mapOf("target" to JsonPrimitive(target), "id" to JsonPrimitive(id), "minutes" to JsonPrimitive(minutes)), MoneyRules.Feature.Minutes) }) }
                        item { ActivityCard(kid.ledger, d.currencyCode) }
                    }
                    message?.let { m -> item { Text(m, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium) } }
                }
            }
        }
    }
}

/** A free family sees what each tool does; every one opens the paywall with its own source. */
@Composable
private fun MoneyPreview(name: String, onPaywall: (String) -> Unit) {
    SettingsCard(stringResource(R.string.money_preview_title, name)) {
        Row(verticalAlignment = Alignment.CenterVertically) { Text(stringResource(R.string.money_preview_body), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f)); PremiumTag() }
        LockedFeatureRow("🫙", stringResource(R.string.money_jars), stringResource(R.string.money_jars_hint)) { onPaywall(MoneyRules.Feature.Jars.paywallSource) }
        LockedFeatureRow("📅", stringResource(R.string.money_allowance), stringResource(R.string.money_allowance_hint)) { onPaywall(MoneyRules.Feature.Allowance.paywallSource) }
        LockedFeatureRow("📈", stringResource(R.string.money_interest), stringResource(R.string.money_interest_hint)) { onPaywall(MoneyRules.Feature.Interest.paywallSource) }
        LockedFeatureRow("⚖️", stringResource(R.string.money_fines), stringResource(R.string.money_fines_hint)) { onPaywall(MoneyRules.Feature.Fines.paywallSource) }
        LockedFeatureRow("⏱️", stringResource(R.string.money_minutes), stringResource(R.string.money_minutes_hint)) { onPaywall(MoneyRules.Feature.Minutes.paywallSource) }
    }
}

@Composable
private fun BalanceCard(kid: MoneyKid, currency: String) {
    val b = kid.balance ?: return
    SettingsCard(stringResource(R.string.money_balance)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.money_balance), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            Text(signed(b.balanceCents, currency), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = if (b.balanceCents < 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
        }
        if (b.balanceCents < 0) Text(stringResource(R.string.money_parent_owes, kid.name, Money.format(-b.balanceCents, currency)), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        if (b.jars.enabled) JarRow(b.jars.spendCents, b.jars.saveCents, b.jars.giveCents, currency)
    }
}

/** The three jars side by side, filled relative to the fullest. Shared with kid mode. */
@Composable
fun JarRow(spend: Int, save: Int, give: Int, currency: String?) {
    val fullest = maxOf(spend, save, give, 1)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Jar(Modifier.weight(1f), "🛍️", stringResource(R.string.jar_spend), stringResource(R.string.jar_spend_hint), spend, MoneyRules.jarLevel(spend, fullest), Color(0xFF10B981), currency)
        Jar(Modifier.weight(1f), "🐷", stringResource(R.string.jar_save), stringResource(R.string.jar_save_hint), save, MoneyRules.jarLevel(save, fullest), Color(0xFF0EA5E9), currency)
        Jar(Modifier.weight(1f), "💗", stringResource(R.string.jar_give), stringResource(R.string.jar_give_hint), give, MoneyRules.jarLevel(give, fullest), Color(0xFFF43F5E), currency)
    }
}

@Composable
private fun Jar(modifier: Modifier, icon: String, label: String, hint: String, cents: Int, level: Int, tint: Color, currency: String?) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(tint.copy(alpha = 0.12f)).padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(44.dp, 52.dp).clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp, bottomStart = 16.dp, bottomEnd = 16.dp)).background(MaterialTheme.colorScheme.surface), contentAlignment = Alignment.BottomCenter) {
            Box(Modifier.fillMaxWidth().height((52 * level / 100).dp).background(tint.copy(alpha = 0.7f)))
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(icon) }
        }
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
        Text(signed(cents, currency), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = if (cents < 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
        Text(hint, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
    }
}

private fun signed(cents: Int, currency: String?): String = (if (cents < 0) "-" else "") + Money.format(kotlin.math.abs(cents), currency)

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun JarsCard(kid: MoneyKid, busy: Boolean, onSave: (Boolean, MoneyRules.Split) -> Unit) {
    val current = kid.split
    val on = current?.enabled == true && kid.balance?.jars?.enabled == true
    var split by remember(kid.childId, current) { mutableStateOf(current?.asSplit?.takeIf { MoneyRules.isValidSplit(it) && it.spend != 100 } ?: MoneyRules.DEFAULT_SPLIT) }
    SettingsCard("🫙 " + stringResource(R.string.money_jars)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.money_jars_toggle), style = MaterialTheme.typography.bodyLarge)
                Text(stringResource(R.string.money_jars_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = on, enabled = !busy, onCheckedChange = { onSave(it, split) })
        }
        Text(stringResource(R.string.money_split_label), style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val presets = if (MoneyRules.SPLIT_PRESETS.contains(split)) MoneyRules.SPLIT_PRESETS else MoneyRules.SPLIT_PRESETS + split
            presets.forEach { p -> FilterChip(selected = p == split, onClick = { split = p; if (on) onSave(true, p) }, label = { Text(p.label) }) }
        }
        Text(stringResource(R.string.money_split_legend), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (on) Text(stringResource(R.string.money_jars_off_note), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ScheduleCard(kid: MoneyKid, currency: String, busy: Boolean, onSave: (payday: Int, allowanceCents: Int, thresholdPct: Int?, interestBps: Int) -> Unit) {
    val s = kid.schedule
    var payday by remember(kid.childId, s) { mutableStateOf(s?.paydayWeekday ?: 6) }
    var amount by remember(kid.childId, s) { mutableStateOf(if ((s?.allowanceCents ?: 0) > 0) Money.plain(s!!.allowanceCents, currency) else "") }
    var threshold by remember(kid.childId, s) { mutableStateOf(s?.thresholdPct) }
    var rate by remember(kid.childId, s) { mutableStateOf(if ((s?.interestBps ?: 0) > 0) MoneyRules.formatRate(s!!.interestBps).removeSuffix("%") else "") }
    val cents = if (amount.isBlank()) 0 else Money.parseCents(amount)
    val bps = MoneyRules.parseRateBps(rate)
    SettingsCard("📅 " + stringResource(R.string.money_allowance)) {
        Text(stringResource(R.string.money_allowance_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedTextField(amount, { amount = it }, label = { Text(stringResource(R.string.money_allowance_amount)) }, prefix = { Text(Money.symbol(currency)) }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), isError = cents == null)
        Text(stringResource(R.string.money_payday), style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            (0..6).forEach { d -> FilterChip(selected = payday == d, onClick = { payday = d }, label = { Text(Dates.shortDayName(d)) }) }
        }
        s?.nextPayday?.takeIf { (s.allowanceCents > 0 || s.interestBps > 0) }?.let { Text(stringResource(R.string.money_next_payday, runCatching { Dates.formatMedium(java.time.LocalDate.parse(it)) }.getOrDefault(it)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        Text(stringResource(R.string.money_threshold), style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            FilterChip(selected = threshold == null, onClick = { threshold = null }, label = { Text(stringResource(R.string.money_threshold_none)) })
            MoneyRules.THRESHOLD_PRESETS.forEach { p -> FilterChip(selected = threshold == p, onClick = { threshold = p }, label = { Text("$p%") }) }
        }
        Text(stringResource(R.string.money_threshold_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        HorizontalDivider(Modifier.padding(vertical = 4.dp))
        Text("📈 " + stringResource(R.string.money_interest), style = MaterialTheme.typography.labelLarge)
        OutlinedTextField(rate, { rate = it }, label = { Text(stringResource(R.string.money_interest_rate)) }, suffix = { Text("%") }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), isError = bps == null)
        Text(stringResource(R.string.money_interest_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Button(onClick = { onSave(payday, (cents ?: 0).coerceIn(0, MoneyRules.ALLOWANCE_MAX_CENTS), threshold, bps ?: 0) }, enabled = !busy && cents != null && bps != null, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.save))
        }
    }
}

@Composable
private fun FineCard(currency: String, busy: Boolean, onFine: (Int, String, Boolean, () -> Unit) -> Unit) {
    var amount by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var allowNegative by remember { mutableStateOf(false) }
    val cents = Money.parseCents(amount)
    SettingsCard("⚖️ " + stringResource(R.string.money_fine)) {
        Text(stringResource(R.string.money_fine_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(amount, { amount = it }, label = { Text(stringResource(R.string.money_amount)) }, prefix = { Text(Money.symbol(currency)) }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.weight(0.4f))
            OutlinedTextField(reason, { reason = it.take(100) }, label = { Text(stringResource(R.string.money_reason)) }, singleLine = true, modifier = Modifier.weight(0.6f))
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { allowNegative = !allowNegative }) {
            Checkbox(allowNegative, { allowNegative = it }); Text(stringResource(R.string.money_allow_negative), style = MaterialTheme.typography.bodyMedium)
        }
        OutlinedButton(onClick = { onFine(cents!!, reason.trim(), allowNegative) { amount = ""; reason = ""; allowNegative = false } },
            enabled = !busy && cents != null && cents in 1..MoneyRules.DEDUCTION_MAX_CENTS && reason.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.money_take_off))
        }
    }
}

@Composable
private fun RepaymentCard(kid: MoneyKid, currency: String, busy: Boolean, onAdd: (String, Int, Boolean, () -> Unit) -> Unit, onStop: (String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var allowNegative by remember { mutableStateOf(false) }
    var confirmStop by remember { mutableStateOf<String?>(null) }
    val cents = Money.parseCents(amount)
    SettingsCard("🔁 " + stringResource(R.string.money_payback)) {
        Text(stringResource(R.string.money_payback_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        kid.repayments.forEach { r ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(r.title, style = MaterialTheme.typography.bodyLarge)
                    Text(stringResource(R.string.money_per_week, Money.format(r.amountCents, currency)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                TextButton(onClick = { confirmStop = r.id }, enabled = !busy) { Text(stringResource(R.string.money_stop), color = MaterialTheme.colorScheme.error) }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(title, { title = it.take(60) }, label = { Text(stringResource(R.string.money_payback_for)) }, singleLine = true, modifier = Modifier.weight(0.6f))
            OutlinedTextField(amount, { amount = it }, label = { Text(stringResource(R.string.money_weekly)) }, prefix = { Text(Money.symbol(currency)) }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.weight(0.4f))
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { allowNegative = !allowNegative }) {
            Checkbox(allowNegative, { allowNegative = it }); Text(stringResource(R.string.money_allow_negative), style = MaterialTheme.typography.bodyMedium)
        }
        OutlinedButton(onClick = { onAdd(title.trim(), cents!!, allowNegative) { title = ""; amount = ""; allowNegative = false } },
            enabled = !busy && cents != null && cents in 1..MoneyRules.DEDUCTION_MAX_CENTS && title.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.money_add_payback))
        }
    }
    confirmStop?.let { id ->
        AlertDialog(
            onDismissRequest = { confirmStop = null },
            title = { Text(stringResource(R.string.money_stop_payback_title)) },
            text = { Text(stringResource(R.string.money_stop_payback_body)) },
            confirmButton = { TextButton(onClick = { onStop(id); confirmStop = null }) { Text(stringResource(R.string.money_stop), color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { confirmStop = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun DonationCard(kid: MoneyKid, currency: String, busy: Boolean, onGive: (Int, String, () -> Unit) -> Unit) {
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    val cents = Money.parseCents(amount)
    val give = kid.balance?.jars?.giveCents ?: 0
    SettingsCard("💗 " + stringResource(R.string.money_donation)) {
        Text(stringResource(R.string.money_donation_hint, Money.format(maxOf(0, give), currency)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(amount, { amount = it }, label = { Text(stringResource(R.string.money_amount)) }, prefix = { Text(Money.symbol(currency)) }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.weight(0.4f))
            OutlinedTextField(note, { note = it.take(100) }, label = { Text(stringResource(R.string.money_donation_to)) }, singleLine = true, modifier = Modifier.weight(0.6f))
        }
        OutlinedButton(onClick = { onGive(cents!!, note.trim()) { amount = ""; note = "" } }, enabled = !busy && cents != null && cents > 0 && note.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.money_record_giving))
        }
    }
}

@Composable
private fun MinutesCard(kid: MoneyKid, busy: Boolean, onUse: (Int) -> Unit, onReward: (String, String, Int) -> Unit) {
    val m = kid.minutes ?: return
    var editing by remember { mutableStateOf<Pair<String, MinutesItem>?>(null) }
    SettingsCard("⏱️ " + stringResource(R.string.money_minutes)) {
        Text(stringResource(R.string.money_minutes_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (!m.available) { Text(stringResource(R.string.money_not_ready), style = MaterialTheme.typography.bodySmall); return@SettingsCard }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Stat(stringResource(R.string.money_minutes_banked), minutesText(m.balance))
            Stat(stringResource(R.string.money_minutes_earned), minutesText(m.earned))
            Stat(stringResource(R.string.money_minutes_used), minutesText(m.used))
        }
        Text(stringResource(R.string.money_minutes_use), style = MaterialTheme.typography.labelLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MoneyRules.MINUTES_USE_PRESETS.forEach { p -> OutlinedButton(onClick = { onUse(p) }, enabled = !busy && m.balance >= p) { Text(minutesText(p)) } }
        }
        if (m.chores.isNotEmpty() || m.routines.isNotEmpty()) {
            HorizontalDivider(Modifier.padding(vertical = 4.dp))
            Text(stringResource(R.string.money_minutes_per), style = MaterialTheme.typography.labelLarge)
            m.chores.forEach { c -> MinutesRow("🧹", c) { editing = "chore" to c } }
            m.routines.forEach { r -> MinutesRow("🔁", r) { editing = "routine" to r } }
        }
    }
    editing?.let { (target, item) ->
        var text by remember(item.id) { mutableStateOf(if (item.minutes > 0) item.minutes.toString() else "") }
        val n = if (text.isBlank()) 0 else text.trim().toIntOrNull()
        AlertDialog(
            onDismissRequest = { editing = null },
            title = { Text(item.name) },
            text = {
                OutlinedTextField(text, { text = it.filter { ch -> ch.isDigit() }.take(3) }, label = { Text(stringResource(R.string.money_minutes_field)) }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), isError = n == null || n > MoneyRules.MINUTES_MAX_PER_REWARD)
            },
            confirmButton = { TextButton(enabled = n != null && n <= MoneyRules.MINUTES_MAX_PER_REWARD, onClick = { onReward(target, item.id, n ?: 0); editing = null }) { Text(stringResource(R.string.save)) } },
            dismissButton = { TextButton(onClick = { editing = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun MinutesRow(icon: String, item: MinutesItem, onTap: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onTap).padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(icon); Spacer(Modifier.width(8.dp))
        Text(item.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f), maxLines = 1)
        Text(if (item.minutes > 0) "+" + minutesText(item.minutes) else "—", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** "1 h 30 min", "45 min", localized. */
@Composable
fun minutesText(total: Int): String {
    val hm = MoneyRules.splitMinutes(total)
    val sign = if (hm.negative) "-" else ""
    return sign + when {
        hm.hours == 0 -> stringResource(R.string.n_min, hm.minutes)
        hm.minutes == 0 -> stringResource(R.string.n_hours_short, hm.hours)
        else -> stringResource(R.string.n_hours_minutes_short, hm.hours, hm.minutes)
    }
}

@Composable
private fun ActivityCard(ledger: List<LedgerItem>, currency: String) {
    SettingsCard("🧾 " + stringResource(R.string.money_activity)) {
        if (ledger.isEmpty()) Text(stringResource(R.string.money_activity_empty), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        ledger.take(12).forEach { MoneyNewsRow(it, currency) }
    }
}

/** One money_ledger row: what happened, the parent's reason for a deduction, and the signed amount. Shared with kid mode. */
@Composable
fun MoneyNewsRow(item: LedgerItem, currency: String?) {
    val title = when (MoneyRules.newsKind(item.kind, item.amountCents)) {
        MoneyRules.NewsKind.Allowance -> stringResource(R.string.news_allowance)
        MoneyRules.NewsKind.AllowanceSkipped -> stringResource(R.string.news_allowance_skipped)
        MoneyRules.NewsKind.Interest -> stringResource(R.string.news_interest)
        MoneyRules.NewsKind.Fine -> stringResource(R.string.news_fine)
        MoneyRules.NewsKind.Repayment -> stringResource(R.string.news_repayment)
        MoneyRules.NewsKind.Donation -> stringResource(R.string.news_donation)
        MoneyRules.NewsKind.ChallengeReward -> stringResource(R.string.news_challenge)
        MoneyRules.NewsKind.Other -> item.kind
    }
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
            if (MoneyRules.showsNote(item.kind, item.amountCents, item.note)) Text(item.note!!, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        val color = when { item.amountCents > 0 -> Color(0xFF059669); item.amountCents < 0 -> MaterialTheme.colorScheme.error; else -> MaterialTheme.colorScheme.onSurfaceVariant }
        Text((if (item.amountCents > 0) "+" else if (item.amountCents < 0) "-" else "") + Money.format(kotlin.math.abs(item.amountCents), currency), color = color, fontWeight = FontWeight.Bold)
    }
}
