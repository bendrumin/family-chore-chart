package com.chorestar.app.ui.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.data.Currencies
import com.chorestar.app.data.Money
import com.chorestar.app.data.TimeZones
import com.chorestar.app.data.WeekendStyle
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.LimitReached
import com.chorestar.app.ui.components.avatarColor
import kotlinx.coroutines.launch
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubScreen(title: String, onBack: () -> Unit, content: @Composable (PaddingValues) -> Unit) {
    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0),
                title = { Text(title) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) } },
            )
        },
    ) { padding -> content(padding) }
}

/** iOS FamilyRewardsSettingsView: reward mode, amounts in cents, currency, time zone; one Save. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RewardsSettingsScreen(vm: DashboardViewModel, state: DashboardState, onBack: () -> Unit) {
    val s = state.settings
    val scope = rememberCoroutineScope()
    var mode by remember(s) { mutableStateOf(s?.rewardMode ?: "flat") }
    var daily by remember(s) { mutableStateOf((s?.dailyRewardCents ?: 100).toString()) }
    var weekly by remember(s) { mutableStateOf((s?.weeklyBonusCents ?: 1).toString()) }
    var currency by remember(s) { mutableStateOf(s?.currencyCode ?: "USD") }
    var timezone by remember(s) { mutableStateOf(s?.timezone?.takeIf { it.isNotBlank() && it != "UTC" && runCatching { ZoneId.of(it) }.isSuccess } ?: ZoneId.systemDefault().id) }
    var currencyMenu by remember { mutableStateOf(false) }
    var tzMenu by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<Int?>(null) }
    val perChore = mode == "per_chore"

    SubScreen(stringResource(R.string.rewards_currency), onBack) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                SettingsCard(stringResource(R.string.reward_mode)) {
                    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                        SegmentedButton(selected = !perChore, onClick = { mode = "flat" }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text(stringResource(R.string.daily_flat_rate)) }
                        SegmentedButton(selected = perChore, onClick = { mode = "per_chore" }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text(stringResource(R.string.settings_per_chore)) }
                    }
                    Text(stringResource(if (perChore) R.string.reward_mode_per_chore_footer else R.string.reward_mode_flat_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            item {
                SettingsCard(stringResource(R.string.amounts_cents)) {
                    OutlinedTextField(daily, { daily = it.filter(Char::isDigit) }, label = { Text(stringResource(if (perChore) R.string.default_chore else R.string.daily_reward)) }, suffix = { Text("¢") }, singleLine = true, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    OutlinedTextField(weekly, { weekly = it.filter(Char::isDigit) }, label = { Text(stringResource(R.string.weekly_bonus)) }, suffix = { Text("¢") }, singleLine = true, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    Text(stringResource(R.string.amounts_footer, Money.format(100, currency)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            item {
                SettingsCard(stringResource(R.string.currency)) {
                    val cur = Currencies.find(currency)
                    Box {
                        OutlinedButton(onClick = { currencyMenu = true }) { Text("${cur.flag} ${cur.name} (${cur.symbol})") }
                        DropdownMenu(expanded = currencyMenu, onDismissRequest = { currencyMenu = false }) {
                            Currencies.all.forEach { c -> DropdownMenuItem(text = { Text("${c.flag} ${c.name} (${c.symbol})") }, onClick = { currency = c.code; currencyMenu = false }) }
                        }
                    }
                    Text(stringResource(R.string.currency_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            item {
                SettingsCard(stringResource(R.string.time_zone)) {
                    val label = TimeZones.all.firstOrNull { it.first == timezone }?.second ?: timezone
                    Box {
                        OutlinedButton(onClick = { tzMenu = true }) { Text(label) }
                        DropdownMenu(expanded = tzMenu, onDismissRequest = { tzMenu = false }) {
                            TimeZones.all.forEach { (id, city) -> DropdownMenuItem(text = { Text(city) }, onClick = { timezone = id; tzMenu = false }) }
                        }
                    }
                    val style = WeekendStyle.infer(timezone)
                    Text(stringResource(if (style == WeekendStyle.FriSat) R.string.timezone_footer_gulf else R.string.timezone_footer_default), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            item {
                Button(
                    onClick = {
                        saving = true; status = null
                        scope.launch {
                            vm.saveRewards(mode, daily.toIntOrNull() ?: 100, weekly.toIntOrNull() ?: 0, currency, timezone)
                                .onSuccess { status = R.string.rewards_saved }.onFailure { status = R.string.rewards_save_failed }
                            saving = false
                        }
                    },
                    enabled = !saving, modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(if (saving) R.string.saving else R.string.save_rewards)) }
                status?.let { Text(stringResource(it), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp)) }
            }
        }
    }
}

/** iOS FamilySharingView. Owners invite and manage members; a shared member only sees the leave section. */
@Composable
fun FamilySharingScreen(vm: DashboardViewModel, state: DashboardState, onBack: () -> Unit, onPaywall: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var joinCode by remember { mutableStateOf("") }
    var joinError by remember { mutableStateOf<Int?>(null) }
    var busy by remember { mutableStateOf(false) }
    var confirmRemove by remember { mutableStateOf<String?>(null) }
    var confirmLeave by remember { mutableStateOf(false) }
    var copied by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.loadSharing() }

    SubScreen(stringResource(R.string.family_sharing), onBack) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                SettingsCard(stringResource(R.string.family_kid_login_code)) {
                    val code = state.profile?.kidLoginCode
                    if (code == null) Text(stringResource(R.string.kid_code_pending), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    else {
                        Text(code.uppercase(), style = MaterialTheme.typography.headlineMedium, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                        Row {
                            TextButton(onClick = { copy(context, code); copied = true }) { Text(stringResource(if (copied) R.string.copied else R.string.copy)) }
                            TextButton(onClick = { share(context, context.getString(R.string.share_kid_code, code) + " https://chorestar.app/kid-login/$code") }) { Text(stringResource(R.string.share)) }
                        }
                    }
                    Text(stringResource(R.string.kid_code_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (!state.isSharedMember) {
                item {
                    SettingsCard(stringResource(R.string.invite_co_parent)) {
                        if (!state.isPremium) {
                            Text(stringResource(R.string.sharing_premium_title), style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.sharing_premium_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Button(onClick = onPaywall) { Text("👑 " + stringResource(R.string.see_premium)) }
                        } else {
                            val code = state.joinCode
                            if (code == null) Button(onClick = { busy = true; scope.launch { vm.createJoinCode(); busy = false } }, enabled = !busy) { Text(stringResource(R.string.create_invite_code)) }
                            else {
                                Text(code, style = MaterialTheme.typography.headlineMedium, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                                Row {
                                    TextButton(onClick = { copy(context, code) }) { Text(stringResource(R.string.copy)) }
                                    TextButton(onClick = { share(context, context.getString(R.string.share_invite_code, code)) }) { Text(stringResource(R.string.share)) }
                                }
                            }
                            Text(stringResource(R.string.invite_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                item {
                    SettingsCard(stringResource(R.string.family_members)) {
                        if (state.members.isEmpty()) Text(stringResource(R.string.no_one_joined), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        state.members.forEach { m ->
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text("👤 " + stringResource(R.string.co_parent), style = MaterialTheme.typography.bodyLarge)
                                    m.createdAt?.let { Text(stringResource(R.string.joined_on, runCatching { java.time.OffsetDateTime.parse(it).toLocalDate().format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(Locale.getDefault())) }.getOrDefault(it)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                                TextButton(onClick = { confirmRemove = m.id }, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text(stringResource(R.string.remove)) }
                            }
                        }
                    }
                }
                item {
                    SettingsCard(stringResource(R.string.join_a_family)) {
                        OutlinedTextField(joinCode, { joinCode = it.lowercase().filter { c -> c.isLetterOrDigit() } }, placeholder = { Text(stringResource(R.string.enter_invite_code)) }, singleLine = true, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false))
                        Button(onClick = {
                            busy = true; joinError = null
                            scope.launch {
                                vm.joinFamily(joinCode).onSuccess { onBack() }.onFailure { e ->
                                    joinError = when (e) { is ChoreStarRepository.JoinError.NotFound -> R.string.join_not_found; is ChoreStarRepository.JoinError.OwnFamily -> R.string.join_own_family; is ChoreStarRepository.JoinError.Already -> R.string.join_already; else -> R.string.error_generic }
                                }
                                busy = false
                            }
                        }, enabled = joinCode.isNotBlank() && !busy) { Text(stringResource(R.string.join_family)) }
                        joinError?.let { Text(stringResource(it), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                        Text(stringResource(R.string.join_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                item {
                    SettingsCard(stringResource(R.string.family_membership)) {
                        Text(stringResource(R.string.sharing_another_family), style = MaterialTheme.typography.bodyLarge)
                        OutlinedButton(onClick = { confirmLeave = true }, colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text(stringResource(R.string.leave_family)) }
                        Text(stringResource(R.string.leave_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
    confirmRemove?.let { id ->
        AlertDialog(
            onDismissRequest = { confirmRemove = null },
            title = { Text(stringResource(R.string.remove_co_parent_title)) },
            text = { Text(stringResource(R.string.remove_co_parent_body)) },
            confirmButton = { TextButton(onClick = { vm.removeMember(id); confirmRemove = null }) { Text(stringResource(R.string.remove), color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { confirmRemove = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
    if (confirmLeave) {
        AlertDialog(
            onDismissRequest = { confirmLeave = false },
            title = { Text(stringResource(R.string.leave_family_title)) },
            confirmButton = { TextButton(onClick = { vm.leaveFamily(); confirmLeave = false; onBack() }) { Text(stringResource(R.string.leave_family), color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { confirmLeave = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

private fun copy(context: Context, text: String) {
    context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("ChoreStar", text))
}

private fun share(context: Context, text: String) {
    context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, text) }, null))
}

private val REWARD_EMOJI = listOf("🎁", "📱", "🌙", "🎬", "🍕", "🍦", "🎲", "🧸", "🎮", "🏊", "🚲", "📚", "⭐")

/** iOS RewardStoreSettingsView: the things kids can ask for with their balance. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RewardStoreScreen(vm: DashboardViewModel, state: DashboardState, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var title by remember { mutableStateOf("") }
    var emoji by remember { mutableStateOf("🎁") }
    var price by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<Int?>(null) }
    var busy by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.loadRewardItems() }
    val atLimit = state.rewardItems.size >= state.rewardItemLimit

    SubScreen(stringResource(R.string.reward_store), onBack) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                val header = if (state.isPremium) stringResource(R.string.rewards_count, state.rewardItems.size) else stringResource(R.string.rewards_count_of, state.rewardItems.size, state.rewardItemLimit)
                SettingsCard(header) {
                    if (state.rewardItems.isEmpty()) {
                        Text(stringResource(R.string.no_rewards_yet), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Button(onClick = { busy = true; scope.launch { vm.addStarterRewards().onFailure { if (it is LimitReached) message = R.string.store_free_limit }; busy = false } }, enabled = !busy) { Text(stringResource(R.string.add_starter_set)) }
                    }
                    state.rewardItems.forEach { item ->
                        var priceText by remember(item.id) { mutableStateOf(Money.plain(item.priceCents, state.currency)) }
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(item.emoji ?: "🎁", style = MaterialTheme.typography.headlineSmall)
                            Spacer(Modifier.width(10.dp))
                            Text(item.title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                            OutlinedTextField(
                                priceText, { t -> priceText = t; Money.parseCents(t)?.takeIf { it > 0 }?.let { vm.updateRewardPrice(item.id, it) } },
                                singleLine = true, modifier = Modifier.width(120.dp), prefix = { Text(Money.symbol(state.currency)) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            )
                            IconButton(onClick = { vm.removeRewardItem(item.id) }) { Icon(Icons.Filled.Delete, contentDescription = stringResource(R.string.remove), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                    }
                    Text(stringResource(R.string.store_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            item {
                SettingsCard(stringResource(R.string.add_a_reward)) {
                    if (atLimit) Text("🔒 " + stringResource(R.string.store_free_limit), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    else {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            REWARD_EMOJI.forEach { e -> FilterChip(selected = e == emoji, onClick = { emoji = e }, label = { Text(e) }) }
                        }
                        OutlinedTextField(title, { title = it }, placeholder = { Text(stringResource(R.string.reward_title_placeholder)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(price, { price = it }, prefix = { Text(Money.symbol(state.currency)) }, singleLine = true, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                        Button(onClick = {
                            val cents = Money.parseCents(price)?.takeIf { it > 0 } ?: run { message = R.string.store_price_required; return@Button }
                            busy = true
                            scope.launch { vm.addRewardItem(title, emoji, cents).onSuccess { title = ""; price = ""; message = null }.onFailure { message = if (it is LimitReached) R.string.store_free_limit else R.string.error_generic }; busy = false }
                        }, enabled = title.isNotBlank() && !busy) { Text(stringResource(R.string.add_reward)) }
                        if (state.rewardItems.isNotEmpty()) TextButton(onClick = { busy = true; scope.launch { vm.addStarterRewards().onFailure { if (it is LimitReached) message = R.string.store_free_limit }; busy = false } }) { Text(stringResource(R.string.add_more_starter)) }
                    }
                    message?.let { Text(stringResource(it), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
    }
}

/** iOS DeleteAccountView, copy for copy; the server does the erasing. */
@Composable
fun DeleteAccountScreen(vm: DashboardViewModel, state: DashboardState, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var confirm by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    SubScreen(stringResource(R.string.delete_account), onBack) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text("⚠️ " + stringResource(R.string.delete_permanent_title), style = MaterialTheme.typography.titleLarge)
                Text(stringResource(R.string.delete_permanent_body), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            item {
                SettingsCard(stringResource(R.string.what_gets_deleted)) {
                    listOf(R.string.del_login, R.string.del_children, R.string.del_chores, R.string.del_routines, R.string.del_allowance, R.string.del_badges, R.string.del_sharing).forEach { Text("• " + stringResource(it)) }
                }
            }
            if (state.isPremium) item { Text(stringResource(R.string.delete_premium_play_notice), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium) }
            item { Text(stringResource(if (state.isSharedMember) R.string.delete_sharing_member_notice else R.string.delete_sharing_owner_notice), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium) }
            item {
                OutlinedTextField(confirm, { confirm = it }, label = { Text(stringResource(R.string.type_delete_to_confirm)) }, placeholder = { Text("DELETE") }, singleLine = true, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, autoCorrectEnabled = false))
            }
            item {
                Button(
                    onClick = { busy = true; error = null; scope.launch { vm.deleteAccount().onFailure { error = it.message; busy = false } } },
                    enabled = confirm.trim().equals("DELETE", ignoreCase = true) && !busy, modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                ) {
                    if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White) else Text(stringResource(R.string.delete_my_account))
                }
                OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text(stringResource(R.string.keep_my_account)) }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp)) }
            }
        }
    }
}
