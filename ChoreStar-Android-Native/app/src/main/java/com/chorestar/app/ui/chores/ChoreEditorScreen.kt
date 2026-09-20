package com.chorestar.app.ui.chores

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
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
import androidx.compose.material3.Switch
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.ChoreCategory
import com.chorestar.app.data.ChoreIconCatalog
import com.chorestar.app.data.ChoreSchedule
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Money
import com.chorestar.app.data.Palette
import com.chorestar.app.data.WeekendStyle
import com.chorestar.app.data.model.Chore
import com.chorestar.app.data.model.NewChoreRow
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.LimitReached
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.avatarColor
import com.chorestar.app.ui.family.Section
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch

private val PRESET_CENTS = listOf(10, 25, 50, 100, 200, 500)
private const val MAX_CENTS = 10_000

/** Add (chore == null) or edit a chore. Mirrors iOS AddEditChoreView. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ChoreEditorScreen(vm: DashboardViewModel, chore: Chore?, preselectedChildId: String?, onDone: () -> Unit) {
    val state by vm.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val perChore = state.settings?.isPerChore == true
    val currency = state.currency

    var name by remember { mutableStateOf(chore?.name ?: "") }
    var childId by remember { mutableStateOf(chore?.childId ?: preselectedChildId ?: state.children.singleOrNull()?.id) }
    var cents by remember { mutableStateOf(chore?.rewardCents ?: if (perChore) 10 else (state.settings?.dailyRewardCents ?: 7)) }
    var rewardText by remember { mutableStateOf(Money.plain(cents, currency)) }
    var category by remember { mutableStateOf(ChoreCategory.normalize(chore?.category)) }
    var icon by remember { mutableStateOf(chore?.icon?.takeIf { it.isNotBlank() } ?: "📝") }
    var color by remember { mutableStateOf(chore?.color?.takeIf { it in Palette.chore } ?: "blue") }
    var notes by remember { mutableStateOf(chore?.notes ?: "") }
    var days by remember { mutableStateOf(ChoreSchedule.normalized(chore?.daysOfWeek)) }
    var requiresPhoto by remember { mutableStateOf(chore?.requiresPhoto ?: false) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    var categoryMenu by remember { mutableStateOf(false) }

    val weekendStyle = remember(state.settings?.timezone) { WeekendStyle.infer(state.settings?.timezone) }

    LaunchedEffect(childId, chore == null) { if (chore == null) vm.loadSuggestions(childId) }

    fun setCents(c: Int) { cents = c.coerceIn(0, MAX_CENTS); rewardText = Money.plain(cents, currency) }
    val stepCents = if (cents < 100) 5 else 25

    val selectChildMsg = stringResource(R.string.please_select_child)
    fun save() {
        val cid = childId ?: run { error = selectChildMsg; return }
        if (name.isBlank() || saving) return
        saving = true; error = null
        val row = NewChoreRow(
            name = name.trim(), childId = cid, rewardCents = cents, category = category.raw, icon = icon, color = color,
            notes = notes.trim().ifEmpty { null }, daysOfWeek = ChoreSchedule.normalized(days), requiresPhoto = requiresPhoto,
        )
        scope.launch {
            val result = if (chore == null) vm.createChore(row).map { } else vm.updateChore(chore.id, row)
            saving = false
            result.onSuccess { onDone() }.onFailure { e -> if (e !is LimitReached) error = e.message }
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0),
                title = { Text(stringResource(if (chore == null) R.string.add_chore else R.string.edit_chore)) },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.cancel)) } },
                actions = {
                    TextButton(onClick = { save() }, enabled = name.isNotBlank() && childId != null && !saving) {
                        if (saving) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        else Text(stringResource(if (chore == null) R.string.add else R.string.save))
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            if (chore == null && state.suggestions.isNotEmpty()) {
                Section(stringResource(if (state.suggestionsPersonalized) R.string.suggestions_personalized else R.string.suggestions)) {
                    Card(Modifier.fillMaxWidth()) {
                        Column {
                            state.suggestions.forEach { s ->
                                Row(
                                    Modifier.fillMaxWidth().clickable {
                                        name = s.name; setCents(s.rewardCents); category = s.editorCategory; icon = s.icon
                                    }.padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(s.icon, style = MaterialTheme.typography.titleLarge)
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(s.name, style = MaterialTheme.typography.bodyLarge)
                                        val reason = s.reasonRes?.let { if (s.reasonArg != null) stringResource(it, s.reasonArg) else stringResource(it) } ?: s.reason
                                        if (reason.isNotBlank()) Text(reason, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text(Money.format(s.rewardCents, currency), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.width(8.dp))
                                    Icon(Icons.Filled.AddCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }

            Section(stringResource(R.string.chore_details)) {
                OutlinedTextField(
                    value = name, onValueChange = { name = it }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.name)) }, placeholder = { Text(stringResource(R.string.chore_name_placeholder)) },
                )
                Spacer(Modifier.height(12.dp))
                Text(stringResource(R.string.assigned_to), style = MaterialTheme.typography.labelLarge)
                Spacer(Modifier.height(6.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.children.forEach { c ->
                        FilterChip(
                            selected = c.id == childId, onClick = { childId = c.id },
                            label = { Text(c.name) },
                            leadingIcon = { ChildAvatar(c, 22.dp) },
                        )
                    }
                }
            }

            Section(stringResource(R.string.reward)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = rewardText,
                        onValueChange = { t -> rewardText = t; Money.parseCents(t)?.let { cents = it.coerceIn(0, MAX_CENTS) } },
                        singleLine = true, modifier = Modifier.weight(1f),
                        prefix = { Text(Money.symbol(currency)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    )
                    Spacer(Modifier.width(8.dp))
                    OutlinedButton(onClick = { setCents(cents - stepCents) }, enabled = cents > 0) { Text("−") }
                    Spacer(Modifier.width(4.dp))
                    OutlinedButton(onClick = { setCents(cents + stepCents) }, enabled = cents < MAX_CENTS) { Text("+") }
                }
                Spacer(Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PRESET_CENTS.forEach { p -> AssistChip(onClick = { setCents(p) }, label = { Text(Money.format(p, currency)) }) }
                }
                Spacer(Modifier.height(6.dp))
                Text(stringResource(R.string.reward_current, Money.format(cents, currency)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (!perChore) {
                    Spacer(Modifier.height(4.dp))
                    Text(stringResource(R.string.flat_rate_notice), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Section(stringResource(R.string.which_days)) {
                DaysOfWeekPicker(days = days, onChange = { days = it }, weekendStyle = weekendStyle)
                Spacer(Modifier.height(6.dp))
                Text(stringResource(R.string.which_days_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.ask_for_photo), style = MaterialTheme.typography.bodyLarge)
                    Text(stringResource(R.string.ask_for_photo_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(checked = requiresPhoto, onCheckedChange = { requiresPhoto = it })
            }

            Section(stringResource(R.string.category)) {
                Box {
                    OutlinedButton(onClick = { categoryMenu = true }) { Text("${category.emoji} ${stringResource(category.label)}") }
                    DropdownMenu(expanded = categoryMenu, onDismissRequest = { categoryMenu = false }) {
                        ChoreCategory.entries.forEach { c ->
                            DropdownMenuItem(text = { Text("${c.emoji} ${stringResource(c.label)}") }, onClick = { category = c; categoryMenu = false })
                        }
                    }
                }
            }

            Section(stringResource(R.string.icon)) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    ChoreIconCatalog.all.forEach { e ->
                        val selected = e == icon
                        Box(
                            Modifier.size(46.dp).clip(RoundedCornerShape(10.dp))
                                .background(if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant)
                                .border(if (selected) 2.dp else 0.dp, if (selected) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(10.dp))
                                .clickable { icon = e },
                            contentAlignment = Alignment.Center,
                        ) { Text(e, style = MaterialTheme.typography.titleLarge) }
                    }
                }
            }

            Section(stringResource(R.string.color)) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Palette.chore.forEach { c ->
                        val selected = c == color
                        Box(
                            Modifier.size(40.dp).clip(CircleShape).background(avatarColor(c))
                                .border(if (selected) 3.dp else 0.dp, if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent, CircleShape)
                                .clickable { color = c },
                            contentAlignment = Alignment.Center,
                        ) { if (selected) Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White) }
                    }
                }
            }

            Section(stringResource(R.string.notes_optional)) {
                OutlinedTextField(value = notes, onValueChange = { notes = it }, modifier = Modifier.fillMaxWidth().height(100.dp))
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

            if (chore != null) {
                OutlinedButton(
                    onClick = { confirmDelete = true }, modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) {
                    Icon(Icons.Filled.Delete, contentDescription = null); Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.delete_named, chore.name))
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }

    if (confirmDelete && chore != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(stringResource(R.string.delete_named, chore.name)) },
            text = { Text(stringResource(R.string.cannot_be_undone)) },
            confirmButton = { TextButton(onClick = { confirmDelete = false; vm.deleteChore(chore); onDone() }) { Text(stringResource(R.string.delete), color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

/** Seven toggles in the locale's day order plus Every day / Weekdays / Weekends chips. The last day cannot be cleared. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DaysOfWeekPicker(days: List<Int>, onChange: (List<Int>) -> Unit, weekendStyle: WeekendStyle) {
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Dates.displayOrder().forEach { d ->
                val on = d in days
                val only = on && days.size == 1
                Box(
                    Modifier.weight(1f).height(44.dp).clip(RoundedCornerShape(10.dp))
                        .background(if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                        .clickable(enabled = !only) { onChange(if (on) days - d else (days + d).sorted()) },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        Dates.shortDayName(d).take(3), style = MaterialTheme.typography.labelLarge,
                        color = if (on) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AssistChip(onClick = { onChange(ChoreSchedule.everyDay) }, label = { Text(stringResource(R.string.every_day)) })
            AssistChip(onClick = { onChange(weekendStyle.weekdays) }, label = { Text(stringResource(R.string.weekdays)) })
            AssistChip(onClick = { onChange(weekendStyle.weekend) }, label = { Text(stringResource(R.string.weekends)) })
        }
    }
}
