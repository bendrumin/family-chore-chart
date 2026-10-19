package com.chorestar.app.ui.challenges

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.R
import com.chorestar.app.data.ChallengePhase
import com.chorestar.app.data.ChallengeView
import com.chorestar.app.data.Challenges
import com.chorestar.app.data.KidApi
import com.chorestar.app.data.Money
import com.chorestar.app.data.Sounds
import com.chorestar.app.data.WebApiError
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.Confetti
import com.chorestar.app.ui.components.PremiumGateCard
import com.chorestar.app.ui.components.PremiumTag
import com.chorestar.app.ui.components.avatarColor
import com.chorestar.app.ui.theme.LocalActiveTheme
import com.chorestar.app.ui.theme.Success
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** "50 chores together", "5 bedtime routines each", localized. */
@Composable
fun challengeTargetText(metric: String, mode: String, target: Int, choreFilter: String?, routineType: String?): String {
    val each = mode == "each"
    return when {
        metric == "chores" && choreFilter == "bonus" -> stringResource(if (each) R.string.challenge_bonus_each else R.string.challenge_bonus_team, target)
        metric == "chores" -> stringResource(if (each) R.string.challenge_chores_each else R.string.challenge_chores_team, target)
        else -> {
            val base = stringResource(if (each) R.string.challenge_routines_each else R.string.challenge_routines_team, target)
            routineType?.let { "$base · " + routineTypeLabel(it) } ?: base
        }
    }
}

@Composable
private fun routineTypeLabel(type: String): String = stringResource(when (type) {
    "morning" -> R.string.challenge_type_morning
    "bedtime" -> R.string.challenge_type_bedtime
    "afterschool" -> R.string.challenge_type_afterschool
    else -> R.string.challenge_type_custom
})

// ── Parent: the dashboard card ──────────────────────────────────────────────

/**
 * Family challenges on Home (the web's FamilyChallengesCard). Premium families
 * see every running challenge with the team bar and each kid's part, deliver a
 * won reward and end one early. A free family sees a locked sample with its
 * own kids' names; one-kid families don't see the card at all.
 */
@Composable
fun FamilyChallengesCard(vm: DashboardViewModel, state: DashboardState, onNew: () -> Unit, onPaywall: (String) -> Unit) {
    if (state.children.size < 2) return
    val list = state.challenges.orEmpty()
    val scope = rememberCoroutineScope()
    var confirm by remember { mutableStateOf<Pair<String, ChallengeView>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    if (!state.hasNewPremium && list.isEmpty()) {
        val names = state.children.take(3).joinToString(", ") { it.name }
        PremiumGateCard("🏆", stringResource(R.string.challenges_title), stringResource(R.string.challenges_locked_body), onSeePremium = { onPaywall("gate_challenges") }) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)).padding(12.dp)) {
                Text("🍕 " + stringResource(R.string.challenges_sample, names), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                LinearProgressIndicator(progress = { 0.6f }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp).height(8.dp).clip(CircleShape))
                Text(stringResource(R.string.challenges_sample_progress), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }
    if (state.challenges == null) return // 031 not applied yet
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("🏆 " + stringResource(R.string.challenges_title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (state.hasNewPremium) TextButton(onClick = onNew) { Text("+ " + stringResource(R.string.challenges_new)) } else PremiumTag(Modifier.clickable { onPaywall("gate_challenges") })
            }
            if (list.isEmpty()) Text(stringResource(R.string.challenges_empty), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            list.forEachIndexed { i, v ->
                if (i > 0) HorizontalDivider()
                ChallengeRowView(v, state, onDeliver = { confirm = "deliver" to v }, onEnd = { confirm = "end" to v })
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
    }
    confirm?.let { (what, v) ->
        val c = v.challenge
        AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text(stringResource(if (what == "deliver") R.string.challenge_deliver_title else R.string.challenge_end_title)) },
            text = {
                Text(if (what == "deliver") {
                    if (c.rewardCents > 0) stringResource(R.string.challenge_deliver_money, c.rewardText, Money.format(c.rewardCents, state.currency)) else stringResource(R.string.challenge_deliver_body, c.rewardText)
                } else stringResource(R.string.challenge_end_body))
            },
            confirmButton = {
                TextButton(onClick = {
                    confirm = null
                    scope.launch {
                        val r = if (what == "deliver") vm.deliverChallenge(c.id) else vm.cancelChallenge(c.id)
                        error = r.exceptionOrNull()?.message
                    }
                }) { Text(stringResource(if (what == "deliver") R.string.challenge_deliver else R.string.challenge_end), color = if (what == "end") MaterialTheme.colorScheme.error else Color.Unspecified) }
            },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun ChallengeRowView(v: ChallengeView, state: DashboardState, onDeliver: () -> Unit, onEnd: () -> Unit) {
    val c = v.challenge
    val p = v.progress
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(c.emoji ?: "🏆", style = MaterialTheme.typography.headlineSmall); Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(c.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(challengeTargetText(c.metric, c.mode, c.target, c.choreFilter, c.routineType) + " · " + stringResource(R.string.challenge_reward_line, c.rewardText) +
                    if (c.rewardCents > 0) " " + stringResource(R.string.challenge_plus_money, Money.format(c.rewardCents, state.currency)) else "",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            PhaseChip(v.phase, v.daysLeft)
        }
        LinearProgressIndicator(progress = { p.percent / 100f }, modifier = Modifier.fillMaxWidth().height(10.dp).clip(CircleShape), color = if (p.met) Success else MaterialTheme.colorScheme.primary)
        Text(stringResource(R.string.challenge_progress, p.current, p.goal), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        // Every kid's part, in the family's order, never ranked.
        p.kids.forEach { k ->
            val child = state.child(k.childId) ?: return@forEach
            Row(verticalAlignment = Alignment.CenterVertically) {
                ChildAvatar(child, 22.dp); Spacer(Modifier.width(6.dp))
                Text(child.name, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                Text(when {
                    c.mode == "each" && k.done -> stringResource(R.string.challenge_kid_done)
                    c.mode == "each" -> stringResource(R.string.challenge_kid_so_far, k.count, k.toGo)
                    k.count == 0 -> stringResource(R.string.challenge_ready_to_help)
                    else -> stringResource(R.string.challenge_helped, k.count)
                }, style = MaterialTheme.typography.labelSmall, color = if (k.done) Success else MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (v.phase == ChallengePhase.Won) Button(onClick = onDeliver, colors = ButtonDefaults.buttonColors(containerColor = Success)) { Text("🎁 " + stringResource(R.string.challenge_deliver)) }
            if (v.phase == ChallengePhase.Active || v.phase == ChallengePhase.Upcoming || v.phase == ChallengePhase.Won) TextButton(onClick = onEnd) { Text(stringResource(R.string.challenge_end), color = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
private fun PhaseChip(phase: ChallengePhase, daysLeft: Int) {
    val (text, color) = when (phase) {
        ChallengePhase.Won -> stringResource(R.string.challenge_phase_won) to Success
        ChallengePhase.Delivered -> stringResource(R.string.challenge_phase_delivered) to Success
        ChallengePhase.Missed -> stringResource(R.string.challenge_phase_missed) to MaterialTheme.colorScheme.onSurfaceVariant
        ChallengePhase.Upcoming -> stringResource(R.string.challenge_starts_soon) to MaterialTheme.colorScheme.primary
        ChallengePhase.Cancelled -> "" to Color.Transparent
        ChallengePhase.Active -> (if (daysLeft <= 1) stringResource(R.string.challenge_last_day) else stringResource(R.string.challenge_days_left, daysLeft)) to MaterialTheme.colorScheme.primary
    }
    if (text.isNotEmpty()) Text(text, style = MaterialTheme.typography.labelSmall, color = color, fontWeight = FontWeight.SemiBold,
        modifier = Modifier.background(color.copy(alpha = 0.12f), RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 3.dp))
}

// ── Parent: create one (POST /api/challenges) ───────────────────────────────

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ChallengeBuilderScreen(vm: DashboardViewModel, state: DashboardState, onDone: () -> Unit, onPaywall: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    val first = Challenges.TEMPLATES.first()
    var emoji by remember { mutableStateOf(first.emoji) }
    var title by remember { mutableStateOf(first.title) }
    var reward by remember { mutableStateOf(first.rewardText) }
    var money by remember { mutableStateOf("") }
    var metric by remember { mutableStateOf(first.metric) }
    var mode by remember { mutableStateOf(first.mode) }
    var target by remember { mutableIntStateOf(first.target) }
    var choreFilter by remember { mutableStateOf(first.choreFilter) }
    var routineType by remember { mutableStateOf(first.routineType) }
    var kids by remember { mutableStateOf(state.children.map { it.id }.toSet()) }
    var weeks by remember { mutableIntStateOf(1) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var template by remember { mutableStateOf(first.key) }

    val today = Challenges.todayIn(state.settings?.timezone)
    val (startsOn, weekEnd) = Challenges.weekWindow(today)
    val endsOn = Challenges.addDays(weekEnd, 7L * (weeks - 1))
    val cents = if (money.isBlank()) 0 else Money.parseCents(money)
    val invalid = Challenges.validate(title, reward, target, kids, startsOn, endsOn)

    fun save() {
        if (invalid != null || cents == null) return
        saving = true; error = null
        val body = JsonObject(buildMap {
            put("title", JsonPrimitive(title.trim())); put("emoji", JsonPrimitive(emoji)); put("rewardText", JsonPrimitive(reward.trim()))
            put("rewardCents", JsonPrimitive(cents.coerceIn(0, 100_000))); put("metric", JsonPrimitive(metric)); put("mode", JsonPrimitive(mode)); put("target", JsonPrimitive(target))
            put("choreFilter", JsonPrimitive(choreFilter))
            if (metric == "routines") routineType?.let { put("routineType", JsonPrimitive(it)) }
            put("childIds", JsonArray(kids.map { JsonPrimitive(it.lowercase()) })); put("startsOn", JsonPrimitive(startsOn)); put("endsOn", JsonPrimitive(endsOn))
        })
        scope.launch {
            vm.createChallenge(body).onSuccess { onDone() }.onFailure { e ->
                if (e is WebApiError && e.premiumRequired) onPaywall("gate_challenges") else error = e.message
            }
            saving = false
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0),
                title = { Text(stringResource(R.string.challenges_new)) },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.cancel)) } },
                actions = { TextButton(onClick = { save() }, enabled = !saving && invalid == null && cents != null) { if (saving) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text(stringResource(R.string.create)) } },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(stringResource(R.string.challenge_templates), style = MaterialTheme.typography.labelLarge)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(Challenges.TEMPLATES, key = { it.key }) { t ->
                    FilterChip(selected = template == t.key, onClick = {
                        template = t.key; emoji = t.emoji; title = t.title; reward = t.rewardText; metric = t.metric; mode = t.mode; target = t.target; choreFilter = t.choreFilter; routineType = t.routineType
                    }, label = { Text("${t.emoji} ${t.title}") })
                }
            }
            Text(stringResource(R.string.challenge_who), style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                state.children.forEach { c -> FilterChip(selected = c.id in kids, onClick = { kids = if (c.id in kids) kids - c.id else kids + c.id }, label = { Text(c.name) }, leadingIcon = { ChildAvatar(c, 22.dp) }) }
            }
            if (kids.size < 2) Text(stringResource(R.string.challenge_pick_two), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            OutlinedTextField(title, { title = it.take(60) }, label = { Text(stringResource(R.string.challenge_name)) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Text(emoji, modifier = Modifier.clickable { emoji = Challenges.EMOJIS[(Challenges.EMOJIS.indexOf(emoji) + 1) % Challenges.EMOJIS.size] }) })
            Text(stringResource(R.string.challenge_goal), style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = metric == "chores" && choreFilter == "any", onClick = { metric = "chores"; choreFilter = "any" }, label = { Text("🧹 " + stringResource(R.string.challenge_metric_chores)) })
                FilterChip(selected = metric == "chores" && choreFilter == "bonus", onClick = { metric = "chores"; choreFilter = "bonus" }, label = { Text("⭐ " + stringResource(R.string.challenge_metric_bonus)) })
                FilterChip(selected = metric == "routines", onClick = { metric = "routines"; choreFilter = "any" }, label = { Text("🔁 " + stringResource(R.string.challenge_metric_routines)) })
            }
            if (metric == "routines") FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = routineType == null, onClick = { routineType = null }, label = { Text(stringResource(R.string.filter_all)) })
                Challenges.ROUTINE_TYPES.forEach { t -> FilterChip(selected = routineType == t, onClick = { routineType = t }, label = { Text(routineTypeLabel(t)) }) }
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = mode == "team", onClick = { mode = "team" }, label = { Text(stringResource(R.string.challenge_mode_team)) })
                FilterChip(selected = mode == "each", onClick = { mode = "each" }, label = { Text(stringResource(R.string.challenge_mode_each)) })
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(challengeTargetText(metric, mode, target, choreFilter, routineType), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                OutlinedButton(onClick = { target = maxOf(1, target - if (target > 10) 5 else 1) }, enabled = target > 1) { Text("−") }; Spacer(Modifier.width(6.dp))
                OutlinedButton(onClick = { target = minOf(1000, target + if (target >= 10) 5 else 1) }) { Text("+") }
            }
            OutlinedTextField(reward, { reward = it.take(80) }, label = { Text(stringResource(R.string.challenge_reward)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(money, { money = it }, label = { Text(stringResource(R.string.challenge_money_each)) }, prefix = { Text(Money.symbol(state.currency)) }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), isError = cents == null,
                supportingText = { Text(stringResource(R.string.challenge_money_hint)) })
            Text(stringResource(R.string.challenge_when), style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = weeks == 1, onClick = { weeks = 1 }, label = { Text(stringResource(R.string.challenge_this_week)) })
                FilterChip(selected = weeks == 2, onClick = { weeks = 2 }, label = { Text(stringResource(R.string.challenge_two_weeks)) })
                FilterChip(selected = weeks == 4, onClick = { weeks = 4 }, label = { Text(stringResource(R.string.challenge_four_weeks)) })
            }
            Text(stringResource(R.string.challenge_window, formatDay(startsOn), formatDay(endsOn)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            Spacer(Modifier.height(24.dp))
        }
    }
}

private fun formatDay(iso: String): String = runCatching { com.chorestar.app.data.Dates.formatMedium(java.time.LocalDate.parse(iso)) }.getOrDefault(iso)

// ── Kid mode: the team card (GET /api/kid/challenges) ───────────────────────

/**
 * Every challenge this kid is in: the team bar, each teammate's part (never
 * ranked), days left, and a celebration the first time the team wins it on
 * this device. White cards on the themed gradient like the rest of kid mode.
 */
@Composable
fun KidChallengesSection(list: List<KidApi.KidChallenge>, currency: String, modifier: Modifier = Modifier) {
    if (list.isEmpty()) return
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("🏆 " + stringResource(R.string.challenge_team), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        list.forEach { c -> KidChallengeCard(c, currency) }
    }
}

/** The first won challenge this device hasn't celebrated yet; marked so it shows once. */
@Composable
fun rememberChallengeToCelebrate(list: List<KidApi.KidChallenge>): androidx.compose.runtime.MutableState<KidApi.KidChallenge?> {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as ChoreStarApp
    val state = remember { mutableStateOf<KidApi.KidChallenge?>(null) }
    LaunchedEffect(list.map { it.id to it.phase }) {
        val won = list.firstOrNull { it.phase == "won" && !app.prefs.challengeCelebrated(it.id) } ?: return@LaunchedEffect
        app.prefs.markChallengeCelebrated(won.id)
        state.value = won
        Sounds.play(Sounds.Cue.Cheer, app.prefs)
    }
    return state
}

/** Full-screen confetti and "You did it together!" over kid mode. */
@Composable
fun ChallengeCelebration(c: KidApi.KidChallenge, onDismiss: () -> Unit) {
    val theme = LocalActiveTheme.current
    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)).clickable(onClick = onDismiss), contentAlignment = Alignment.Center) {
        Confetti(trigger = c.id, palette = listOf(theme.primary, theme.secondary, Color(0xFFF59E0B), Color.White))
        Card(Modifier.padding(32.dp)) {
            Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(c.emoji ?: "🏆", style = MaterialTheme.typography.displayLarge)
                Text(stringResource(R.string.challenge_you_did_it), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center)
                Text(stringResource(R.string.challenge_win, c.rewardText), textAlign = TextAlign.Center)
                Text(stringResource(R.string.challenge_ask_reward), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                Button(onClick = onDismiss) { Text("🎉 " + stringResource(R.string.ok_label)) }
            }
        }
    }
}

@Composable
private fun KidChallengeCard(c: KidApi.KidChallenge, currency: String) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(c.emoji ?: "🏆", style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(c.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.challenge_win, c.rewardText) + if (c.rewardCents > 0) " " + stringResource(R.string.challenge_plus_money, Money.format(c.rewardCents, currency)) else "",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text(challengeTargetText(c.metric, c.mode, c.target, c.choreFilter, c.routineType), style = MaterialTheme.typography.labelMedium)
            LinearProgressIndicator(progress = { c.percent / 100f }, modifier = Modifier.fillMaxWidth().height(16.dp).clip(CircleShape), color = if (c.met) Success else MaterialTheme.colorScheme.primary)
            Text(when (c.phase) {
                "won" -> stringResource(R.string.challenge_you_did_it) + " " + stringResource(R.string.challenge_ask_reward)
                "delivered" -> stringResource(R.string.challenge_delivered_kid)
                "upcoming" -> stringResource(R.string.challenge_starts_soon)
                else -> stringResource(R.string.challenge_to_go, c.remaining) + " · " + if (c.daysLeft <= 1) stringResource(R.string.challenge_last_day) else stringResource(R.string.challenge_days_left, c.daysLeft)
            }, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = if (c.met) Success else MaterialTheme.colorScheme.onSurface)
            c.teammates.forEach { t ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(26.dp).clip(CircleShape).background(avatarColor(t.avatarColor)), contentAlignment = Alignment.Center) {
                        Text(t.avatarEmoji?.takeIf { it.isNotBlank() && !it.first().isLetterOrDigit() } ?: t.name.take(1).uppercase(), color = Color.White, style = MaterialTheme.typography.labelMedium)
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(if (t.isMe) stringResource(R.string.challenge_you) else t.name, style = MaterialTheme.typography.bodyMedium, fontWeight = if (t.isMe) FontWeight.Bold else FontWeight.Normal, modifier = Modifier.weight(1f))
                    Text(when {
                        c.mode == "each" && t.done -> stringResource(R.string.challenge_kid_done)
                        c.mode == "each" -> stringResource(R.string.challenge_kid_to_go, t.toGo)
                        t.count == 0 -> stringResource(R.string.challenge_ready_to_help)
                        else -> stringResource(R.string.challenge_helped, t.count)
                    }, style = MaterialTheme.typography.labelMedium, color = if (t.done) Success else MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
