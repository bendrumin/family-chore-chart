package com.chorestar.app.ui.settings

import android.Manifest
import android.content.Intent
import android.os.Build
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chorestar.app.BuildConfig
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.R
import com.chorestar.app.data.Prefs
import com.chorestar.app.data.SeasonalTheme
import com.chorestar.app.data.SeasonalThemes
import com.chorestar.app.data.ThemePreference
import com.chorestar.app.notify.DailyReminder
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.main.Routes
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/** iOS SettingsView, section for section. Device-local toggles live in Prefs; family ones in family_settings. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(vm: DashboardViewModel, state: DashboardState, email: String?, onSignOut: () -> Unit, onNavigate: (String) -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as ChoreStarApp
    val prefs = app.prefs
    val darkMode by prefs.darkMode.collectAsStateWithLifecycle()
    val theme = state.themePreference
    val scope = rememberCoroutineScope()
    var sound by remember { mutableStateOf(prefs.soundEnabled) }
    var reminderOn by remember { mutableStateOf(prefs.dailyReminderEnabled) }
    var reminderMinutes by remember { mutableStateOf(prefs.dailyReminderMinutes) }
    var showTime by remember { mutableStateOf(false) }
    var showPassword by remember { mutableStateOf(false) }
    var accentField by remember(theme.accentHex) { mutableStateOf(theme.accentHex ?: "") }
    val s = state.settings
    val onVacation = s?.vacationStartsOn != null && s.vacationEndsOn != null && runCatching { !LocalDate.parse(s.vacationEndsOn).isBefore(LocalDate.now()) }.getOrDefault(false)
    var vacationFrom by remember(s?.vacationStartsOn) { mutableStateOf(s?.vacationStartsOn?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: LocalDate.now()) }
    var vacationThrough by remember(s?.vacationEndsOn) { mutableStateOf(s?.vacationEndsOn?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: LocalDate.now().plusDays(6)) }
    var pickFrom by remember { mutableStateOf(false) }
    var pickThrough by remember { mutableStateOf(false) }

    val askNotifications = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (!granted) { reminderOn = false; prefs.dailyReminderEnabled = false }
        DailyReminder.sync(context, s?.vacationEndsOn, s?.vacationStartsOn)
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(stringResource(R.string.settings_title), style = MaterialTheme.typography.headlineMedium) }

        // Appearance
        item {
            SettingsCard(stringResource(R.string.appearance)) {
                Text(stringResource(R.string.theme_mode), style = MaterialTheme.typography.bodyLarge)
                Spacer(Modifier.height(6.dp))
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    Prefs.DarkMode.entries.forEachIndexed { i, m ->
                        SegmentedButton(selected = darkMode == m, onClick = { prefs.setDarkMode(m) }, shape = SegmentedButtonDefaults.itemShape(i, 3)) {
                            Text(stringResource(when (m) { Prefs.DarkMode.Light -> R.string.mode_light; Prefs.DarkMode.Dark -> R.string.mode_dark; Prefs.DarkMode.System -> R.string.mode_system }))
                        }
                    }
                }
            }
        }

        // Theme gallery
        item {
            SettingsCard(stringResource(R.string.theme_section)) {
                ThemeGallery(theme, isPremium = state.isPremium, onSelect = { id, locked -> if (locked) onNavigate(Routes.PAYWALL) else vm.setThemeSelection(id) })
                Spacer(Modifier.height(6.dp))
                val footer = when {
                    theme.accentHex != null -> stringResource(R.string.theme_footer_accent)
                    theme.activeTheme != null -> stringResource(R.string.theme_footer_active, "${theme.activeTheme!!.emoji} ${theme.activeTheme!!.name}")
                    else -> stringResource(R.string.theme_footer_syncs)
                }
                Text(footer, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // Accent colour
        item {
            SettingsCard(stringResource(R.string.accent_colour)) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    ACCENT_SWATCHES.forEach { hex ->
                        val selected = theme.accentHex == hex
                        Box(
                            Modifier.size(40.dp).clip(CircleShape).background(Color(android.graphics.Color.parseColor(hex)))
                                .border(if (selected) 3.dp else 0.dp, if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent, CircleShape)
                                .clickable { vm.setAccent(hex) },
                            contentAlignment = Alignment.Center,
                        ) { if (selected) Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White) }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = accentField, onValueChange = { accentField = it }, singleLine = true, modifier = Modifier.weight(1f),
                        label = { Text(stringResource(R.string.custom_accent)) }, placeholder = { Text("#6366f1") },
                    )
                    Spacer(Modifier.width(8.dp))
                    TextButton(onClick = { ThemePreference.normalizeHex(accentField)?.let { vm.setAccent(it) } }, enabled = ThemePreference.normalizeHex(accentField) != null) { Text(stringResource(R.string.save)) }
                }
                if (theme.accentHex != null) TextButton(onClick = { vm.setAccent(null) }) { Text(stringResource(R.string.reset_to_theme_colours)) }
                Text(stringResource(R.string.accent_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // Audio
        item {
            SettingsCard(stringResource(R.string.audio)) {
                ToggleRow(stringResource(R.string.sound_effects), null, sound) { sound = it; prefs.soundEnabled = it }
            }
        }

        // Subscription
        item {
            SettingsCard(stringResource(R.string.subscription)) {
                ValueRow(stringResource(R.string.plan), (state.profile?.subscriptionType ?: "free").replaceFirstChar { it.uppercase() } + if (state.isPremium) " 👑" else "")
                if (!state.isPremium) {
                    NavRow(stringResource(R.string.upgrade_to_premium), stringResource(R.string.upgrade_subtitle)) { onNavigate(Routes.PAYWALL) }
                    NavRow(stringResource(R.string.restore_purchases), null) { app.billing.restore() }
                } else {
                    NavRow(stringResource(R.string.manage_subscription), stringResource(R.string.manage_subscription_subtitle)) {
                        context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://play.google.com/store/account/subscriptions?package=${BuildConfig.APPLICATION_ID}")))
                    }
                }
                ValueRow(stringResource(R.string.children_label), "${state.children.size}/${if (state.isPremium) "∞" else state.childLimit}")
                ValueRow(stringResource(R.string.chores_title), "${state.chores.size}/${if (state.isPremium) "∞" else state.choreLimit}")
            }
        }

        // Account
        item {
            SettingsCard(stringResource(R.string.settings_account)) {
                ValueRow(stringResource(R.string.auth_email), email ?: stringResource(R.string.not_signed_in))
                NavRow(stringResource(R.string.change_password), null) { showPassword = true }
                NavRow(stringResource(R.string.delete_account), null, destructive = true) { onNavigate(Routes.SETTINGS_DELETE) }
            }
        }

        // Family
        item {
            SettingsCard(stringResource(R.string.family_title)) {
                NavRow(stringResource(R.string.family_sharing_kid_login), null) { onNavigate(Routes.SETTINGS_SHARING) }
                NavRow(stringResource(R.string.rewards_currency), null) { onNavigate(Routes.SETTINGS_REWARDS) }
                NavRow(stringResource(R.string.reward_store), null) { onNavigate(Routes.SETTINGS_STORE) }
            }
        }

        // Vacation
        item {
            SettingsCard(stringResource(R.string.vacation)) {
                ToggleRow("✈️ " + stringResource(R.string.vacation_mode), null, onVacation) { on ->
                    if (on) vm.setVacation(vacationFrom.toString(), maxOf(vacationThrough, vacationFrom).toString()) else vm.clearVacation()
                }
                if (onVacation) {
                    val fmt = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(Locale.getDefault())
                    ValueRow(stringResource(R.string.vacation_from), vacationFrom.format(fmt)) { pickFrom = true }
                    ValueRow(stringResource(R.string.vacation_through), vacationThrough.format(fmt)) { pickThrough = true }
                }
                Text(stringResource(R.string.vacation_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // Approve chores first
        item {
            SettingsCard(null) {
                ToggleRow("🛡️ " + stringResource(R.string.approve_chores_first), stringResource(R.string.approve_chores_first_subtitle), s?.requireApproval == true) { vm.setRequireApproval(it) }
            }
        }

        // Notifications
        item {
            SettingsCard(stringResource(R.string.notifications)) {
                ToggleRow(stringResource(R.string.activity_alerts), null, s?.activityPushEnabled != false) { vm.setActivityPush(it) }
                ToggleRow(stringResource(R.string.daily_reminder), null, reminderOn) { on ->
                    reminderOn = on; prefs.dailyReminderEnabled = on
                    if (on && Build.VERSION.SDK_INT >= 33) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
                    else DailyReminder.sync(context, s?.vacationEndsOn, s?.vacationStartsOn)
                }
                if (reminderOn) ValueRow(stringResource(R.string.reminder_time), "%02d:%02d".format(reminderMinutes / 60, reminderMinutes % 60)) { showTime = true }
                Text(stringResource(R.string.notifications_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // Data + About
        item {
            SettingsCard(stringResource(R.string.data)) { NavRow(stringResource(R.string.refresh_data), null) { vm.refresh() } }
        }
        item {
            SettingsCard(stringResource(R.string.about)) {
                NavRow("⭐ " + stringResource(R.string.rate_chorestar), null) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://play.google.com/store/apps/details?id=${BuildConfig.APPLICATION_ID}")))
                }
                NavRow("↗️ " + stringResource(R.string.share_chorestar), null) {
                    val send = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_SUBJECT, "ChoreStar"); putExtra(Intent.EXTRA_TEXT, context.getString(R.string.share_message)) }
                    context.startActivity(Intent.createChooser(send, null))
                }
                NavRow("✨ " + stringResource(R.string.whats_new), null) { onNavigate(Routes.WHATS_NEW) }
                NavRow(stringResource(R.string.chore_icons_by_openmoji), "CC BY-SA 4.0") { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://openmoji.org"))) }
                Text(stringResource(R.string.about_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        item {
            OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text(stringResource(R.string.settings_sign_out)) }
        }
        item { Text("ChoreStar ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }

    if (showTime) {
        val tp = rememberTimePickerState(reminderMinutes / 60, reminderMinutes % 60)
        AlertDialog(
            onDismissRequest = { showTime = false },
            title = { Text(stringResource(R.string.reminder_time)) },
            text = { TimePicker(tp) },
            confirmButton = { TextButton(onClick = { reminderMinutes = tp.hour * 60 + tp.minute; prefs.dailyReminderMinutes = reminderMinutes; DailyReminder.sync(context, s?.vacationEndsOn, s?.vacationStartsOn); showTime = false }) { Text(stringResource(R.string.save)) } },
            dismissButton = { TextButton(onClick = { showTime = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
    if (pickFrom || pickThrough) {
        val initial = (if (pickFrom) vacationFrom else vacationThrough).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val dp = rememberDatePickerState(initialSelectedDateMillis = initial)
        DatePickerDialog(
            onDismissRequest = { pickFrom = false; pickThrough = false },
            confirmButton = {
                TextButton(onClick = {
                    dp.selectedDateMillis?.let { ms ->
                        val d = Instant.ofEpochMilli(ms).atZone(ZoneOffset.UTC).toLocalDate()
                        if (pickFrom) { vacationFrom = d; if (vacationThrough.isBefore(d)) vacationThrough = d } else vacationThrough = maxOf(d, vacationFrom)
                        vm.setVacation(vacationFrom.toString(), vacationThrough.toString())
                    }
                    pickFrom = false; pickThrough = false
                }) { Text(stringResource(R.string.save)) }
            },
            dismissButton = { TextButton(onClick = { pickFrom = false; pickThrough = false }) { Text(stringResource(R.string.cancel)) } },
        ) { DatePicker(dp) }
    }
    if (showPassword) ChangePasswordDialog(vm) { showPassword = false }
}

private val ACCENT_SWATCHES = listOf("#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#14b8a6", "#0284c7", "#3b82f6")

@Composable
private fun ThemeGallery(theme: ThemePreference, isPremium: Boolean, onSelect: (String, Boolean) -> Unit) {
    val selection = theme.selection
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            item { ThemeCard(stringResource(R.string.theme_auto), "✨", listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)), selected = selection == "auto", locked = false) { onSelect("auto", false) } }
            item { ThemeCard(stringResource(R.string.theme_classic), "⭐", listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)), selected = selection == "none", locked = false) { onSelect("none", false) } }
        }
        GalleryRow(stringResource(R.string.theme_holidays), SeasonalThemes.holidays, selection, false, onSelect)
        GalleryRow(stringResource(R.string.theme_seasons), SeasonalThemes.seasons, selection, false, onSelect)
        GalleryRow(stringResource(R.string.theme_premium), SeasonalThemes.premium, selection, !isPremium, onSelect)
    }
}

@Composable
private fun GalleryRow(title: String, themes: List<SeasonalTheme>, selection: String, locked: Boolean, onSelect: (String, Boolean) -> Unit) {
    Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        items(themes, key = { it.id }) { t ->
            ThemeCard(t.name, t.emoji, listOf(Color(t.primary), Color(t.secondary)), selected = selection.equals(t.id, true), locked = locked) { onSelect(t.id, locked) }
        }
    }
}

@Composable
private fun ThemeCard(name: String, emoji: String, colors: List<Color>, selected: Boolean, locked: Boolean, onTap: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(96.dp).clickable(onClick = onTap)) {
        Box(
            Modifier.size(width = 96.dp, height = 64.dp).clip(RoundedCornerShape(14.dp)).background(Brush.linearGradient(colors))
                .border(3.dp, if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent, RoundedCornerShape(14.dp)),
        ) {
            Text(emoji, modifier = Modifier.align(Alignment.BottomEnd).padding(6.dp))
            if (selected) Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.align(Alignment.TopStart).padding(6.dp))
            if (locked) Box(Modifier.align(Alignment.Center).size(26.dp).background(Color.Black.copy(alpha = 0.5f), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Lock, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp)) }
        }
        Text(name, style = MaterialTheme.typography.labelSmall, maxLines = 1)
    }
}

@Composable
fun SettingsCard(title: String?, content: @Composable () -> Unit) {
    Column {
        if (title != null) Text(title.uppercase(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 6.dp, start = 4.dp))
        Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { content() } }
    }
}

@Composable
fun ToggleRow(title: String, subtitle: String?, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
fun ValueRow(title: String, value: String, onTap: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().then(if (onTap != null) Modifier.clickable(onClick = onTap) else Modifier).padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodyMedium, color = if (onTap != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun NavRow(title: String, subtitle: String?, destructive: Boolean = false, onTap: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onTap).padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge, color = if (destructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ChangePasswordDialog(vm: DashboardViewModel, onClose: () -> Unit) {
    val scope = rememberCoroutineScope()
    var current by remember { mutableStateOf("") }
    var new by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val valid = current.isNotEmpty() && new.length >= 8 && new == confirm
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text(stringResource(R.string.change_password)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(current, { current = it }, label = { Text(stringResource(R.string.current_password)) }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
                OutlinedTextField(new, { new = it }, label = { Text(stringResource(R.string.new_password)) }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
                OutlinedTextField(confirm, { confirm = it }, label = { Text(stringResource(R.string.confirm_new_password)) }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
                Text((if (new.length >= 8) "✅ " else "○ ") + stringResource(R.string.at_least_8_chars), style = MaterialTheme.typography.bodySmall)
                Text((if (new.isNotEmpty() && new == confirm) "✅ " else "○ ") + stringResource(R.string.passwords_match), style = MaterialTheme.typography.bodySmall)
                message?.let { Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            val changed = stringResource(R.string.password_changed)
            TextButton(enabled = valid && !busy, onClick = {
                busy = true
                scope.launch { vm.changePassword(new).onSuccess { message = changed; busy = false }.onFailure { message = it.message; busy = false } }
            }) { Text(stringResource(R.string.change)) }
        },
        dismissButton = { TextButton(onClick = onClose) { Text(stringResource(R.string.cancel)) } },
    )
}
