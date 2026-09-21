package com.chorestar.app.ui.kid

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.R
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Images
import com.chorestar.app.data.KidApi
import com.chorestar.app.data.KidSession
import com.chorestar.app.data.Money
import com.chorestar.app.data.Sounds
import com.chorestar.app.data.model.Child
import com.chorestar.app.data.model.Chore
import com.chorestar.app.data.model.Routine
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.achievements.AchievementsScreen
import com.chorestar.app.ui.components.AvatarCircle
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.ParticleOverlay
import com.chorestar.app.ui.components.avatarColor
import com.chorestar.app.ui.components.diceBearPng
import com.chorestar.app.ui.routines.KidRoutineCard
import com.chorestar.app.ui.routines.RoutinePlayerScreen
import com.chorestar.app.ui.theme.LocalActiveTheme
import com.chorestar.app.ui.theme.Success
import com.chorestar.app.ui.theme.Warning
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

// ── Standalone kid login (iOS KidLoginView) ─────────────────────────────────

@Composable
fun KidLoginScreen(kidApi: KidApi, initialCode: String?, onBack: () -> Unit, onSuccess: (KidSession) -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val prefs = (context.applicationContext as ChoreStarApp).prefs
    var code by remember { mutableStateOf(initialCode ?: "") }
    var step by remember { mutableStateOf(if (initialCode.isNullOrBlank()) 0 else 1) }
    var pin by remember { mutableStateOf("") }
    var verifying by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    var errorText by remember { mutableStateOf<String?>(null) }

    fun verify() {
        if (verifying) return
        verifying = true; error = null; errorText = null
        scope.launch {
            kidApi.verifyPin(code, pin).onSuccess { r ->
                val child = r.child!!
                prefs.lastFamilyCode = code
                Sounds.play(Sounds.Cue.Cheer, prefs)
                onSuccess(KidSession(child.id, child.name, child.avatarColor, child.avatarUrl, child.avatarFile, child.avatarSignedUrl, r.kidToken ?: "", code, System.currentTimeMillis() + 8L * 60 * 60 * 1000))
            }.onFailure { e ->
                pin = ""
                when (e) {
                    KidApi.KidLoginError.Unreachable -> error = R.string.kid_unreachable
                    KidApi.KidLoginError.TooMany -> error = R.string.kid_too_many
                    else -> { error = R.string.kid_wrong_pin }
                }
            }
            verifying = false
        }
    }
    LaunchedEffect(pin) { if (pin.length == 6) verify() }

    Box(Modifier.fillMaxSize().background(Brush.linearGradient(listOf(Color(0xFF6366F1).copy(alpha = 0.25f), Color(0xFF10B981).copy(alpha = 0.25f), Color(0xFF16A34A).copy(alpha = 0.25f))))) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("⭐", style = MaterialTheme.typography.displayLarge)
            Text(stringResource(R.string.kid_login), style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
            Text(stringResource(if (step == 0) R.string.ask_parent_for_code else R.string.enter_secret_pin), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(24.dp))
            if (step == 0) {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        OutlinedTextField(
                            code, { code = it.lowercase().filter { c -> c.isLetterOrDigit() }.take(12); error = null },
                            placeholder = { Text(stringResource(R.string.family_code)) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                            textStyle = MaterialTheme.typography.headlineSmall.copy(fontFamily = FontFamily.Monospace, textAlign = TextAlign.Center),
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false, keyboardType = KeyboardType.Ascii),
                        )
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = { step = 1 }, enabled = code.isNotBlank(), modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(stringResource(R.string.next_label) + " →") }
                    }
                }
            } else {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        TextButton(onClick = { step = 0; pin = "" }) { Text("🏠 ${code.uppercase()} ✏️", fontFamily = FontFamily.Monospace) }
                        PinPad(pin = pin, verifying = verifying, onDigit = { if (pin.length < 6 && !verifying) pin += it }, onBackspace = { pin = pin.dropLast(1) }, onBack = { step = 0; pin = "" }, onGo = { verify() })
                        error?.let { Text(stringResource(it), color = MaterialTheme.colorScheme.error, modifier = Modifier.background(MaterialTheme.colorScheme.error.copy(alpha = 0.1f), RoundedCornerShape(10.dp)).padding(10.dp)) }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            TextButton(onClick = onBack) { Text("← " + stringResource(R.string.back_to_parent_login)) }
        }
    }
}

/** Dots + 3×4 keypad, shared by both PIN screens; Go! appears at 4 digits, 6 auto-submits. */
@Composable
fun PinPad(pin: String, verifying: Boolean, onDigit: (Char) -> Unit, onBackspace: () -> Unit, onBack: () -> Unit, onGo: () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(vertical = 12.dp)) {
        repeat(maxOf(4, pin.length)) { i -> Box(Modifier.size(16.dp).clip(CircleShape).background(if (i < pin.length) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline)) }
    }
    val rows = listOf(listOf('1', '2', '3'), listOf('4', '5', '6'), listOf('7', '8', '9'))
    rows.forEach { r -> Row(horizontalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(vertical = 5.dp)) { r.forEach { d -> NumberKey(d.toString()) { onDigit(d) } } } }
    Row(horizontalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(66.dp).clip(CircleShape).clickable(onClick = onBack), contentAlignment = Alignment.Center) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) }
        NumberKey("0") { onDigit('0') }
        Box(Modifier.size(66.dp).clip(CircleShape).clickable(onClick = onBackspace), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Backspace, contentDescription = null) }
    }
    if (pin.length >= 4) Button(onClick = onGo, enabled = !verifying, modifier = Modifier.fillMaxWidth().height(52.dp).padding(top = 6.dp)) {
        if (verifying) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White) else Text(stringResource(R.string.go), style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun NumberKey(label: String, onTap: () -> Unit) {
    Box(Modifier.size(66.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant).clickable(onClick = onTap), contentAlignment = Alignment.Center) {
        Text(label, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
    }
}

// ── Kid mode on the parent's phone (iOS ChildAuthView) ──────────────────────

@Composable
fun ChildAuthScreen(state: DashboardState, kidApi: KidApi, onBack: () -> Unit, onAuthenticated: (Child) -> Unit) {
    val scope = rememberCoroutineScope()
    val eligible = state.children.filter { it.id in state.pinChildIds }
    var selected by remember { mutableStateOf<Child?>(null) }
    var pin by remember { mutableStateOf("") }
    var verifying by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    val code = state.profile?.kidLoginCode

    fun verify() {
        val child = selected ?: return
        if (verifying) return
        if (code == null) { error = R.string.kid_login_not_set_up; return }
        verifying = true; error = null
        scope.launch {
            kidApi.verifyPin(code, pin).onSuccess { r -> if (r.child?.id == child.id) onAuthenticated(child) else { error = R.string.kid_wrong_pin; pin = "" } }
                .onFailure { e -> pin = ""; error = when (e) { KidApi.KidLoginError.Unreachable -> R.string.kid_unreachable; KidApi.KidLoginError.TooMany -> R.string.kid_too_many; else -> R.string.kid_wrong_pin } }
            verifying = false
        }
    }
    LaunchedEffect(pin) { if (pin.length == 6) verify() }
    BackHandler { if (selected != null) { selected = null; pin = "" } else onBack() }

    Box(Modifier.fillMaxSize().background(Brush.linearGradient(listOf(Color(0xFF16A34A).copy(alpha = 0.3f), Color(0xFF10B981).copy(alpha = 0.3f), Color(0xFF6366F1).copy(alpha = 0.3f))))) {
        Row(Modifier.safeDrawingPadding().padding(8.dp).align(Alignment.TopStart), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = { if (selected != null) { selected = null; pin = "" } else onBack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null); Spacer(Modifier.width(4.dp)); Text(stringResource(if (selected != null) R.string.back_label else R.string.cancel)) }
        }
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            val child = selected
            if (child == null) {
                Text("🧒", style = MaterialTheme.typography.displayLarge)
                Text(stringResource(R.string.kids_login), style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                Text(stringResource(R.string.tap_your_name), color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(24.dp))
                LazyVerticalGrid(GridCells.Adaptive(150.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.height(320.dp)) {
                    items(eligible, key = { it.id }) { c ->
                        Card(Modifier.clickable { selected = c }) {
                            Column(Modifier.padding(16.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) { ChildAvatar(c, 70.dp); Spacer(Modifier.height(8.dp)); Text(c.name, style = MaterialTheme.typography.titleMedium) }
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                TextButton(onClick = onBack) { Text(stringResource(R.string.parent_login)) }
            } else {
                ChildAvatar(child, 80.dp)
                Text(child.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text(stringResource(R.string.enter_your_pin), color = MaterialTheme.colorScheme.onSurfaceVariant)
                Card(Modifier.fillMaxWidth().padding(top = 16.dp)) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        PinPad(pin, verifying, onDigit = { if (pin.length < 6 && !verifying) pin += it }, onBackspace = { pin = pin.dropLast(1) }, onBack = { selected = null; pin = "" }, onGo = { verify() })
                        error?.let { Text(stringResource(it), color = MaterialTheme.colorScheme.error) }
                    }
                }
            }
        }
    }
}

// ── The kid dashboard (iOS ChildMainView) ───────────────────────────────────

private enum class KidRoute { Home, Badges }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChildMainScreen(vm: KidViewModel) {
    val s by vm.state.collectAsStateWithLifecycle()
    val child = s.child ?: run {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            if (s.error == null) CircularProgressIndicator() else {
                Text(s.error!!.resolve(LocalContext.current), color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                Spacer(Modifier.height(12.dp))
                Button(onClick = { vm.clearError(); vm.refresh() }) { Text(stringResource(R.string.refresh_data)) }
                TextButton(onClick = { vm.signOut() }) { Text(stringResource(R.string.settings_sign_out)) }
            }
        }
        return
    }
    val theme = LocalActiveTheme.current
    val context = LocalContext.current
    val prefs = (context.applicationContext as ChoreStarApp).prefs
    val scope = rememberCoroutineScope()
    var route by remember { mutableStateOf(KidRoute.Home) }
    var playing by remember { mutableStateOf<Routine?>(null) }
    var goalEditor by remember { mutableStateOf(false) }
    var storeConfirm by remember { mutableStateOf<KidApi.StoreItemView?>(null) }
    var notice by remember { mutableStateOf<String?>(null) }
    var proofFor by remember { mutableStateOf<Chore?>(null) }
    val takeProof = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bmp ->
        val chore = proofFor; proofFor = null
        if (bmp != null && chore != null) scope.launch { vm.submitProof(chore, Images.squareJpeg(bmp)).onSuccess { Sounds.play(Sounds.Cue.Success, prefs) } }
    }
    LaunchedEffect(notice) { if (notice != null) { delay(3000); notice = null } }
    LaunchedEffect(s.perfectDay) { if (s.perfectDay) Sounds.play(Sounds.Cue.Cheer, prefs) }

    playing?.let { r ->
        RoutinePlayerScreen(r, child.name, s.currency, onComplete = { done, secs -> vm.completeRoutine(r, done, secs); Sounds.play(Sounds.Cue.Cheer, prefs) }, onClose = { playing = null })
        return
    }
    if (route == KidRoute.Badges) {
        AchievementsScreen(child.name, s.badgeProgress, onBack = { route = KidRoute.Home })
        BackHandler { route = KidRoute.Home }
        return
    }

    val wallet = s.wallet
    val currency = wallet?.currencyCode ?: s.currency
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(theme.primary.copy(alpha = 0.14f), theme.secondary.copy(alpha = 0.05f), MaterialTheme.colorScheme.background)))) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 32.dp)) {
            item {
                Box(Modifier.fillMaxWidth().background(Brush.linearGradient(theme.gradient))) {
                    ParticleOverlay(theme.glyph, count = 14, alpha = 0.45f)
                    Column(Modifier.safeDrawingPadding().padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(stringResource(R.string.hi_name, child.name), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Color.White)
                                Text(
                                    when {
                                        s.onVacation -> stringResource(R.string.no_chores_today_break)
                                        s.perChore == false && s.dailyRewardCents != null -> stringResource(R.string.finish_all_to_earn, Money.format(s.dailyRewardCents!!, currency))
                                        else -> stringResource(R.string.lets_get_chores_done)
                                    },
                                    color = Color.White.copy(alpha = 0.9f),
                                )
                            }
                            TextButton(onClick = { vm.signOut() }, modifier = Modifier.background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(12.dp)), colors = ButtonDefaults.textButtonColors(contentColor = Color.White)) {
                                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(6.dp))
                                Text(stringResource(if (vm.onParentDevice) R.string.exit_kid_mode else R.string.settings_sign_out), style = MaterialTheme.typography.labelLarge)
                            }
                        }
                        Spacer(Modifier.height(14.dp))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            StatBubble(Modifier.weight(1f), "✅", "${s.done.size}", stringResource(R.string.done_label), Success)
                            StatBubble(Modifier.weight(1f), "⏰", "${s.pending.size}", stringResource(R.string.to_do), Warning)
                            StatBubble(Modifier.weight(1f), "⭐", Money.format(if (s.perChore != null) s.earnedToday else s.weekEarnedCents, currency), stringResource(R.string.stats_earned), Color(0xFFF59E0B))
                            StatBubble(Modifier.weight(1f), "🔥", "${s.streak}", stringResource(R.string.streak_label), Color(0xFFF97316))
                        }
                        Spacer(Modifier.height(12.dp))
                        val earned = s.badgeProgress.count { it.earned }
                        val next = s.badgeProgress.filter { !it.earned }.maxByOrNull { it.ratio }
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = 0.18f)).clickable { route = KidRoute.Badges }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("🏆", style = MaterialTheme.typography.headlineSmall); Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(stringResource(R.string.n_of_m_badges, earned, s.badgeProgress.size), color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text(if (next != null) stringResource(R.string.next_badge, "${next.def.icon} ${stringResource(next.def.name)}") else stringResource(R.string.earned_them_all), color = Color.White.copy(alpha = 0.85f), style = MaterialTheme.typography.bodySmall)
                            }
                            Text("›", color = Color.White, style = MaterialTheme.typography.headlineSmall)
                        }
                    }
                }
            }
            if (s.onVacation) item {
                Card(Modifier.padding(16.dp).fillMaxWidth()) {
                    Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🏖️", style = MaterialTheme.typography.displayMedium)
                        Text(stringResource(R.string.youre_on_vacation), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        val resume = s.vacationEndsOn?.let { runCatching { LocalDate.parse(it).plusDays(1) }.getOrNull() }
                        val day = resume?.let { d -> if (ChronoUnit.DAYS.between(LocalDate.now(), d) <= 6) Dates.longDayName(Dates.dayOfWeek(d)) else d.format(DateTimeFormatter.ofPattern("MMMM d", Locale.getDefault())) } ?: ""
                        Text(stringResource(R.string.no_chores_until, day) + if (s.streak > 0) " " + stringResource(R.string.streak_safe, s.streak) else "", textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            item { GoalCard(wallet, currency, onEdit = { goalEditor = true }, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }
            if (s.routines.isNotEmpty()) {
                item { Text(stringResource(R.string.my_routines), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }
                items(s.routines.size) { i -> val r = s.routines[i]; Box(Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) { KidRoutineCard(r, r.id in s.completedRoutineIds, currency, onPlay = { playing = r }) } }
            }
            if (s.pending.isNotEmpty() || s.waiting.isNotEmpty()) {
                item { Text(stringResource(R.string.your_chores), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }
                items((s.pending + s.waiting).size) { i ->
                    val c = (s.pending + s.waiting)[i]
                    Box(Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) {
                        BigChoreCard(c, done = false, pending = s.today[c.id] == "pending", perChore = s.perChore == true, currency = currency, accent = avatarColor(child.avatarColor),
                            onTap = { if (s.today[c.id] == null && c.requiresPhoto) { proofFor = c; takeProof.launch(null) } else vm.toggle(c) })
                    }
                }
            }
            if (s.done.isNotEmpty()) {
                item { Text(stringResource(R.string.completed_celebrate), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Success, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }
                items(s.done.size) { i -> val c = s.done[i]; Box(Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) { BigChoreCard(c, done = true, pending = false, perChore = s.perChore == true, currency = currency, accent = avatarColor(child.avatarColor), onTap = { vm.toggle(c) }) } }
            }
            if (wallet != null && wallet.store.isNotEmpty()) item { StoreSection(wallet, currency, onAsk = { storeConfirm = it }, onCancel = { id -> scope.launch { vm.cancelRedeem(id) } }) }
            if (s.dueToday.isEmpty() && !s.onVacation && !s.loading) item {
                Column(Modifier.fillMaxWidth().padding(40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("🎉", style = MaterialTheme.typography.displayMedium)
                    Text(stringResource(R.string.no_chores_yet_kid), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.check_back_later), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        notice?.let { Text(it, modifier = Modifier.align(Alignment.BottomCenter).padding(24.dp).background(MaterialTheme.colorScheme.inverseSurface, RoundedCornerShape(12.dp)).padding(12.dp), color = MaterialTheme.colorScheme.inverseOnSurface) }
        if (s.perfectDay) PerfectDayOverlay(onDismiss = vm::dismissPerfectDay)
    }

    if (goalEditor) GoalEditorSheet(wallet?.goal, currency, onDismiss = { goalEditor = false },
        onSave = { title, cents, emoji -> scope.launch { vm.saveGoal(wallet?.goal, title, cents, emoji).onSuccess { Sounds.play(Sounds.Cue.Success, prefs) }; goalEditor = false } },
        onRemove = { wallet?.goal?.let { g -> scope.launch { vm.archiveGoal(g.id); goalEditor = false } } })
    storeConfirm?.let { item ->
        val asked = stringResource(R.string.asked_notice, item.title)
        AlertDialog(
            onDismissRequest = { storeConfirm = null },
            title = { Text("${item.emoji ?: "🎁"} ${item.title}") },
            text = { Text(stringResource(R.string.spend_confirm, Money.format(item.priceCents, currency), Money.format(wallet?.owedCents ?: 0, currency))) },
            confirmButton = { TextButton(onClick = { storeConfirm = null; scope.launch { vm.redeem(item.id).onSuccess { Sounds.play(Sounds.Cue.Success, prefs); notice = asked } } }) { Text(stringResource(R.string.yes_please)) } },
            dismissButton = { TextButton(onClick = { storeConfirm = null }) { Text(stringResource(R.string.not_now)) } },
        )
    }
}

@Composable
private fun StatBubble(modifier: Modifier, icon: String, value: String, label: String, tint: Color) {
    Column(modifier.clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.92f)).border(2.dp, tint.copy(alpha = 0.4f), RoundedCornerShape(14.dp)).padding(vertical = 10.dp, horizontal = 4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(icon); Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.Black.copy(alpha = 0.85f), maxLines = 1)
        Text(label, style = MaterialTheme.typography.labelSmall, color = Color.Black.copy(alpha = 0.6f), maxLines = 1)
    }
}

/** iOS BigChoreCard: big tap target; photo chores open the camera; pending shows the hourglass line. */
@Composable
private fun BigChoreCard(chore: Chore, done: Boolean, pending: Boolean, perChore: Boolean, currency: String, accent: Color, onTap: () -> Unit) {
    val ring = when { done -> Success; pending -> Warning; else -> MaterialTheme.colorScheme.outline }
    Card(
        Modifier.fillMaxWidth().border(2.dp, if (done) Success.copy(alpha = 0.4f) else accent.copy(alpha = 0.2f), RoundedCornerShape(20.dp)).clickable(onClick = onTap),
        shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (done) Success.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(60.dp).clip(RoundedCornerShape(16.dp)).background(accent.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) { Text(chore.icon ?: "📝", style = MaterialTheme.typography.headlineMedium) }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(chore.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, textDecoration = if (done) TextDecoration.LineThrough else null, color = if (done) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                chore.notes?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2) }
                when {
                    pending -> Text("⏳ " + stringResource(R.string.waiting_for_grown_up), color = Warning, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                    !done && chore.requiresPhoto -> Text("📷 " + stringResource(R.string.take_photo_to_check), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                }
                if (perChore) Text("⭐ " + stringResource(R.string.earn_amount, Money.format(chore.rewardCents, currency)), style = MaterialTheme.typography.labelMedium, color = accent)
            }
            Box(Modifier.size(40.dp).clip(CircleShape).border(2.dp, ring, CircleShape).background(if (done) Success else Color.Transparent), contentAlignment = Alignment.Center) {
                when { done -> Icon(Icons.Filled.Check, null, tint = Color.White); pending -> Text("⏰"); chore.requiresPhoto -> Icon(Icons.Filled.PhotoCamera, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
private fun GoalCard(wallet: KidApi.WalletView?, currency: String, onEdit: () -> Unit, modifier: Modifier) {
    val theme = LocalActiveTheme.current
    val goal = wallet?.goal
    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            if (goal != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(goal.emoji ?: "🎯", style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) { Text(stringResource(R.string.saving_for), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(goal.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
                    IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, contentDescription = null) }
                }
                LinearProgressIndicator(progress = { goal.percent / 100f }, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).height(14.dp).clip(CircleShape), color = if (goal.reached) Warning else theme.primary)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${Money.format(goal.progressCents, currency)} / ${Money.format(goal.targetCents, currency)}", style = MaterialTheme.typography.bodySmall)
                    Text(if (goal.reached) stringResource(R.string.you_did_it) else stringResource(R.string.to_go, Money.format(goal.targetCents - goal.progressCents, currency)), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                }
                if (goal.reached) Text(stringResource(R.string.ask_grown_up_payout), color = Warning, style = MaterialTheme.typography.bodySmall)
            } else {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable(onClick = onEdit)) {
                    Text("🎯", style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(R.string.what_saving_for), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(stringResource(R.string.pick_goal_hint, Money.format(wallet?.owedCents ?: 0, currency)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            val reached = wallet?.reachedGoals?.size ?: 0
            if (reached > 0) Text("🏆 " + pluralStringResource(R.plurals.goals_reached, reached, reached), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
        }
    }
}

private val GOAL_EMOJI = listOf("🧱", "🎮", "🧸", "📚", "⚽", "🎨", "🚲", "🎧", "👟", "🐶", "🎁", "💰")

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun GoalEditorSheet(goal: KidApi.GoalView?, currency: String, onDismiss: () -> Unit, onSave: (String, Int, String?) -> Unit, onRemove: () -> Unit) {
    var emoji by remember { mutableStateOf(goal?.emoji ?: "🧱") }
    var title by remember { mutableStateOf(goal?.title ?: "") }
    var cents by remember { mutableStateOf(goal?.targetCents ?: 1000) }
    var custom by remember { mutableStateOf("") }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(if (goal == null) R.string.pick_a_goal else R.string.change_your_goal), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.pick_a_picture), style = MaterialTheme.typography.labelMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                GOAL_EMOJI.forEach { e -> Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(if (e == emoji) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant).clickable { emoji = e }, contentAlignment = Alignment.Center) { Text(e, style = MaterialTheme.typography.headlineSmall) } }
            }
            Text(stringResource(R.string.what_is_it), style = MaterialTheme.typography.labelMedium)
            OutlinedTextField(title, { title = it }, placeholder = { Text(stringResource(R.string.goal_placeholder)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Text(stringResource(R.string.how_much), style = MaterialTheme.typography.labelMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(500, 1000, 2000, 5000).forEach { p -> OutlinedButton(onClick = { cents = p; custom = "" }, colors = if (cents == p && custom.isEmpty()) ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.primaryContainer) else ButtonDefaults.outlinedButtonColors()) { Text(Money.format(p, currency)) } }
            }
            OutlinedTextField(custom, { custom = it; Money.parseCents(it)?.let { c -> cents = c.coerceIn(0, 50_000) } }, placeholder = { Text(stringResource(R.string.or_type_amount)) }, prefix = { Text(Money.symbol(currency)) }, singleLine = true, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            Button(onClick = { onSave(title.trim(), cents, emoji) }, enabled = title.isNotBlank() && cents >= 100, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(stringResource(if (goal == null) R.string.start_saving else R.string.save_changes)) }
            if (goal != null) TextButton(onClick = onRemove, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.remove_goal), color = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
private fun StoreSection(wallet: KidApi.WalletView, currency: String, onAsk: (KidApi.StoreItemView) -> Unit, onCancel: (String) -> Unit) {
    Column(Modifier.padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("🛍️ " + stringResource(R.string.reward_store), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Text(stringResource(R.string.to_spend, Money.format(wallet.owedCents, currency)), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.height(8.dp))
        wallet.store.chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                pair.forEach { item ->
                    Card(Modifier.weight(1f)) {
                        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(item.emoji ?: "🎁", style = MaterialTheme.typography.displaySmall)
                            Text(item.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, maxLines = 2)
                            Text(Money.format(item.priceCents, currency), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(6.dp))
                            when {
                                item.pendingRequestId != null -> { Text("⏰ " + stringResource(R.string.asked), style = MaterialTheme.typography.labelMedium); TextButton(onClick = { onCancel(item.pendingRequestId) }) { Text(stringResource(R.string.never_mind)) } }
                                item.affordable -> Button(onClick = { onAsk(item) }) { Text(stringResource(R.string.get_it)) }
                                else -> Text(stringResource(R.string.short_by, Money.format(item.shortByCents, currency)), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
                if (pair.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

/** iOS PerfectDayOverlay: scrim, star, copy, auto-dismiss after six seconds. */
@Composable
fun PerfectDayOverlay(onDismiss: () -> Unit) {
    LaunchedEffect(Unit) { delay(6000); onDismiss() }
    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)).clickable(onClick = onDismiss), contentAlignment = Alignment.Center) {
        Card(Modifier.padding(32.dp)) {
            Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🌟", style = MaterialTheme.typography.displayLarge)
                Text(stringResource(R.string.perfect_day), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
                Text(stringResource(R.string.every_chore_done), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            }
        }
    }
}
