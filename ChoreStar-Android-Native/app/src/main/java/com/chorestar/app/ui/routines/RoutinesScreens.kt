package com.chorestar.app.ui.routines

import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.Money
import com.chorestar.app.data.model.Child
import com.chorestar.app.data.model.EditableStep
import com.chorestar.app.data.model.NewStepRow
import com.chorestar.app.data.model.Routine
import com.chorestar.app.data.model.RoutineIcons
import com.chorestar.app.data.model.RoutineTemplate
import com.chorestar.app.data.model.RoutineTemplates
import com.chorestar.app.data.model.RoutineType
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.Confetti
import com.chorestar.app.ui.theme.LocalActiveTheme
import com.chorestar.app.ui.theme.Success
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

fun routineColor(hex: String?): Color = runCatching { Color(android.graphics.Color.parseColor(hex ?: "#6366f1")) }.getOrDefault(Color(0xFF6366F1))

/** iOS RoutineTemplate.localizedName: template text is localised, parent-typed text is not. */
@Composable
fun localizedRoutineText(text: String): String = RoutineTemplates.localized[text]?.let { stringResource(it) } ?: text

/** The Routines segment of the Chores tab (iOS RoutinesListView). */
@Composable
fun RoutinesList(vm: DashboardViewModel, state: DashboardState, onBuild: () -> Unit, onStarter: () -> Unit, onEdit: (Routine) -> Unit) {
    var filter by remember { mutableStateOf<RoutineType?>(null) }
    var menu by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf<Routine?>(null) }
    val filtered = state.routines.filter { filter == null || it.routineType == filter }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item { FilterChip(selected = filter == null, onClick = { filter = null }, label = { Text(stringResource(R.string.filter_all)) }) }
                    items(RoutineType.entries) { t -> FilterChip(selected = filter == t, onClick = { filter = t }, label = { Text("${t.emoji} " + stringResource(t.label)) }) }
                }
            }
            if (state.routines.isEmpty()) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🔁", style = MaterialTheme.typography.displayMedium)
                        Text(stringResource(R.string.no_routines_yet), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.no_routines_hint), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = onStarter) { Text("✨ " + stringResource(R.string.try_starter_routine)) }
                        TextButton(onClick = onBuild) { Text(stringResource(R.string.build_your_own)) }
                    }
                }
            }
            state.children.forEach { child ->
                val mine = filtered.filter { it.childId == child.id }
                if (mine.isEmpty()) return@forEach
                item(key = "h-${child.id}") {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                        ChildAvatar(child, 28.dp); Spacer(Modifier.width(8.dp))
                        Text(child.name, style = MaterialTheme.typography.titleMedium); Spacer(Modifier.width(8.dp))
                        Text("${mine.size}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                items(mine, key = { it.id }) { r -> RoutineCard(r, child, state.currency, onEdit = { onEdit(r) }, onDelete = { confirmDelete = r }) }
            }
        }
        Box(Modifier.align(Alignment.BottomEnd).padding(20.dp)) {
            FloatingActionButton(onClick = { menu = true }) { Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.new_routine)) }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(text = { Text("✏️ " + stringResource(R.string.build_your_own)) }, onClick = { menu = false; onBuild() })
                DropdownMenuItem(text = { Text("✨ " + stringResource(R.string.starter_routines)) }, onClick = { menu = false; onStarter() })
            }
        }
    }
    confirmDelete?.let { r ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text(stringResource(R.string.delete_named, localizedRoutineText(r.name))) },
            text = { Text(stringResource(R.string.cannot_be_undone)) },
            confirmButton = { TextButton(onClick = { vm.deleteRoutine(r); confirmDelete = null }) { Text(stringResource(R.string.delete), color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun RoutineCard(r: Routine, child: Child, currency: String?, onEdit: () -> Unit, onDelete: () -> Unit) {
    val color = routineColor(r.color)
    var menu by remember { mutableStateOf(false) }
    Card(Modifier.fillMaxWidth().border(1.dp, color.copy(alpha = 0.2f), RoundedCornerShape(16.dp)).clickable { menu = true }, shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Text(RoutineIcons.display(r.icon, r.routineType.emoji), style = MaterialTheme.typography.headlineSmall)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(localizedRoutineText(r.name), style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${r.routineType.emoji} ${stringResource(r.routineType.label)} · ${stringResource(R.string.n_steps, r.steps.size)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("⭐ " + Money.format(r.rewardCents, currency), style = MaterialTheme.typography.labelMedium)
                    Text(child.name, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (r.steps.isNotEmpty()) {
                HorizontalDivider(Modifier.padding(vertical = 10.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(r.sortedSteps.take(5)) { s ->
                        Text("${s.orderIndex + 1}. ${localizedRoutineText(s.title)}", style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 4.dp))
                    }
                    if (r.steps.size > 5) item { Text(stringResource(R.string.n_more, r.steps.size - 5), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
            DropdownMenuItem(text = { Text(stringResource(R.string.edit_53016)) }, onClick = { menu = false; onEdit() })
            DropdownMenuItem(text = { Text(stringResource(R.string.delete), color = MaterialTheme.colorScheme.error) }, onClick = { menu = false; onDelete() })
        }
    }
}

/** iOS RoutineBuilderView. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun RoutineBuilderScreen(vm: DashboardViewModel, state: DashboardState, routine: Routine?, preselectedChildId: String?, onDone: () -> Unit, onPaywall: (String) -> Unit = {}) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    var name by remember { mutableStateOf(routine?.name ?: "") }
    var childId by remember { mutableStateOf(routine?.childId ?: preselectedChildId ?: state.children.singleOrNull()?.id) }
    var type by remember { mutableStateOf(routine?.routineType ?: RoutineType.Morning) }
    var icon by remember { mutableStateOf(routine?.icon ?: RoutineType.Morning.defaultIcon) }
    var color by remember { mutableStateOf(routine?.color ?: RoutineType.Morning.defaultColor) }
    var reward by remember { mutableIntStateOf(routine?.rewardCents ?: 7) }
    val initialSteps: List<EditableStep> = routine?.sortedSteps.orEmpty().map { st ->
        val secs = st.durationSeconds ?: 0
        EditableStep(st.title, st.icon ?: "📝", if (secs > 0) secs / 60 else null, st.imagePath, state.stepPhotoUrl(st))
    }
    var steps by remember { mutableStateOf<List<EditableStep>>(initialSteps) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val stepMissing = stringResource(R.string.add_step_with_title)
    // Migration 032: read-aloud is free; the finish-by timer, pictures and Build with AI are Premium (not grandfathered).
    val premium = state.hasNewPremium
    var autoRead by remember { mutableStateOf(routine?.autoReadAloud ?: false) }
    var targetText by remember { mutableStateOf(routine?.targetDurationSeconds?.let { (it / 60).toString() } ?: "") }
    var photoFor by remember { mutableStateOf<Int?>(null) }
    var uploading by remember { mutableStateOf<Int?>(null) }
    var aiOpen by remember { mutableStateOf(false) }
    var aiTip by remember { mutableStateOf<String?>(null) }
    val pickPhoto = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.GetContent()) { uri ->
        val i = photoFor; photoFor = null
        val cid = childId
        if (uri == null || i == null || cid == null) return@rememberLauncherForActivityResult
        uploading = i
        scope.launch {
            val jpeg = com.chorestar.app.data.Images.loadScaledJpeg(context, uri, 1280)
            if (jpeg == null) { error = context.getString(R.string.photo_could_not_read); uploading = null; return@launch }
            runCatching { vm.premiumApi.uploadStepPhoto(cid, jpeg) }
                .onSuccess { p -> steps = steps.toMutableList().also { list -> if (i in list.indices) list[i] = list[i].copy(imagePath = p.path, previewUrl = p.url ?: vm.signStepPhoto(p.path)) } }
                .onFailure { e -> if (e is com.chorestar.app.data.WebApiError && e.premiumRequired) onPaywall("gate_routine_photos") else error = e.message }
            uploading = null
        }
    }

    fun save() {
        val cid = childId ?: return
        val kept = steps.filter { it.title.isNotBlank() }
        if (kept.isEmpty()) { error = stepMissing; return }
        saving = true; error = null
        val rows = kept.mapIndexed { i, s ->
            // A picture only stays with the kid it was taken for (its folder is that child's).
            val path = s.imagePath?.takeIf { "/${cid.lowercase()}/" in it }
            NewStepRow("", s.title.trim(), s.icon, i, s.durationMinutes?.let { it * 60 }, path)
        }
        val targetSeconds = com.chorestar.app.data.RoutineTimer.minutesToSeconds(targetText)
        // Premium sets it; anyone may clear it; a lapsed family that leaves it alone keeps it.
        val sendTarget = premium || (targetSeconds == null && routine?.targetDurationSeconds != null)
        val extras = com.chorestar.app.data.ChoreStarRepository.RoutineExtrasInput(autoRead, targetSeconds, sendTarget, hadAutoRead = routine?.autoReadAloud == true)
        scope.launch {
            val r = if (routine == null) vm.createRoutine(cid, name.trim(), type.raw, icon, color, reward, rows, extras)
            else vm.updateRoutine(routine.id, cid, name.trim(), type.raw, icon, color, reward, rows, extras)
            saving = false
            r.onSuccess { onDone() }.onFailure { error = it.message }
        }
    }

    fun applyDraft(d: com.chorestar.app.data.RoutineDraft) {
        name = d.name
        val t = RoutineType.of(d.type)
        type = t; icon = t.defaultIcon; color = t.defaultColor
        steps = d.steps.map { s -> EditableStep(s.title, s.icon ?: "📝", s.durationSeconds?.takeIf { it >= 60 }?.let { it / 60 }) }
        aiTip = d.tip
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0),
                title = { Text(stringResource(if (routine == null) R.string.new_routine else R.string.edit_routine)) },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.cancel)) } },
                actions = {
                    TextButton(onClick = { save() }, enabled = !saving && name.isNotBlank() && childId != null && steps.isNotEmpty()) {
                        if (saving) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text(stringResource(if (routine == null) R.string.create else R.string.save))
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            if (routine == null) {
                Card(Modifier.fillMaxWidth().clickable { if (premium) aiOpen = true else onPaywall("gate_ai_routine") }) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("✨", style = MaterialTheme.typography.headlineSmall); Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.build_with_ai), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text(stringResource(R.string.build_with_ai_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (!premium) com.chorestar.app.ui.components.PremiumTag()
                    }
                }
                aiTip?.let { Text("💡 $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                SectionTitle(stringResource(R.string.quick_start_templates))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(RoutineTemplates.all) { t ->
                        Card(Modifier.width(160.dp).clickable {
                            name = t.name; type = t.type; icon = t.icon; color = t.type.defaultColor
                            steps = t.steps.map { (title, ic, sec) -> EditableStep(title, ic, sec?.let { if (it >= 60) it / 60 else null }) }
                        }) {
                            Column(Modifier.padding(12.dp)) {
                                Text(t.icon, style = MaterialTheme.typography.headlineSmall)
                                Text(localizedRoutineText(t.name), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(stringResource(R.string.n_steps, t.steps.size), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
            SectionTitle(stringResource(R.string.routine_details))
            OutlinedTextField(name, { name = it }, label = { Text(stringResource(R.string.routine_name)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Text(stringResource(R.string.assign_to), style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                state.children.forEach { c -> FilterChip(selected = c.id == childId, onClick = { childId = c.id }, label = { Text(c.name) }, leadingIcon = { ChildAvatar(c, 22.dp) }) }
            }
            Text(stringResource(R.string.routine_type), style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                RoutineType.entries.forEach { t ->
                    FilterChip(selected = t == type, onClick = { type = t; color = t.defaultColor; icon = t.defaultIcon }, label = { Text("${t.emoji} " + stringResource(t.label)) })
                }
            }
            Text(stringResource(R.string.icon), style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                RoutineIcons.choices.take(24).forEach { (key, emoji) ->
                    val selected = key == icon || emoji == icon
                    Box(Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)).background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant).clickable { icon = key }, contentAlignment = Alignment.Center) { Text(emoji) }
                }
            }
            Text(stringResource(R.string.color), style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                RoutineIcons.colors.forEach { hex ->
                    val selected = hex.equals(color, true)
                    Box(Modifier.size(40.dp).clip(CircleShape).background(routineColor(hex)).border(if (selected) 3.dp else 0.dp, if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent, CircleShape).clickable { color = hex }, contentAlignment = Alignment.Center) { if (selected) Icon(Icons.Filled.Check, null, tint = Color.White) }
                }
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text(stringResource(R.string.routine_reward, reward, Money.format(reward, state.currency)), style = MaterialTheme.typography.bodyLarge)
                Row {
                    OutlinedButton(onClick = { if (reward > 1) reward-- }, enabled = reward > 1) { Text("−") }; Spacer(Modifier.width(8.dp))
                    OutlinedButton(onClick = { if (reward < 100) reward++ }, enabled = reward < 100) { Text("+") }
                }
            }

            SectionTitle(stringResource(R.string.routine_helpers))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("🔊 " + stringResource(R.string.auto_read_aloud), style = MaterialTheme.typography.bodyLarge)
                    Text(stringResource(R.string.auto_read_aloud_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                androidx.compose.material3.Switch(checked = autoRead, onCheckedChange = { autoRead = it })
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    targetText, { targetText = it.filter { c -> c.isDigit() }.take(3) },
                    label = { Text("⏳ " + stringResource(R.string.finish_by_minutes)) }, singleLine = true, enabled = premium || targetText.isNotEmpty(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f),
                    supportingText = {
                        val suggested = com.chorestar.app.data.RoutineTimer.suggestedSeconds(steps.map { s -> s.durationMinutes?.let { it * 60 } })
                        Text(if (suggested != null) stringResource(R.string.finish_by_hint_suggest, suggested / 60) else stringResource(R.string.finish_by_hint))
                    },
                )
                Spacer(Modifier.width(8.dp))
                if (!premium) {
                    if (targetText.isNotEmpty()) TextButton(onClick = { targetText = "" }) { Text(stringResource(R.string.clear)) }
                    else com.chorestar.app.ui.components.PremiumTag(Modifier.clickable { onPaywall("gate_routine_timer") })
                }
            }

            SectionTitle(stringResource(R.string.steps_count, steps.size))
            if (steps.isEmpty()) Text("📋 " + stringResource(R.string.add_at_least_one_step), color = MaterialTheme.colorScheme.onSurfaceVariant)
            steps.forEachIndexed { i, s ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(28.dp).clip(CircleShape).background(routineColor(color)), contentAlignment = Alignment.Center) { Text("${i + 1}", color = Color.White, style = MaterialTheme.typography.labelMedium) }
                            Spacer(Modifier.width(8.dp))
                            OutlinedTextField(s.title, { t -> steps = steps.toMutableList().also { it[i] = s.copy(title = t) } }, placeholder = { Text(stringResource(R.string.step_title)) }, singleLine = true, modifier = Modifier.weight(1f))
                            Spacer(Modifier.width(6.dp))
                            Box(Modifier.size(48.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant).clickable {
                                when {
                                    !premium -> onPaywall("gate_routine_photos")
                                    childId == null -> error = context.getString(R.string.pick_kid_first)
                                    else -> { photoFor = i; pickPhoto.launch("image/*") }
                                }
                            }, contentAlignment = Alignment.Center) {
                                when {
                                    uploading == i -> CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                                    s.previewUrl != null -> coil3.compose.AsyncImage(s.previewUrl, contentDescription = stringResource(R.string.step_picture), contentScale = androidx.compose.ui.layout.ContentScale.Crop, modifier = Modifier.size(48.dp))
                                    else -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(RoutineIcons.display(s.icon), style = MaterialTheme.typography.titleMedium)
                                        Text(if (premium) "📷" else "🔒", style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                        }
                        if (s.imagePath != null) TextButton(onClick = { steps = steps.toMutableList().also { it[i] = s.copy(imagePath = null, previewUrl = null) } }) {
                            Text(stringResource(R.string.remove_picture), style = MaterialTheme.typography.labelSmall)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
                            Text(if ((s.durationMinutes ?: 0) > 0) stringResource(R.string.n_min, s.durationMinutes!!) else "—", modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            OutlinedButton(onClick = { steps = steps.toMutableList().also { it[i] = s.copy(durationMinutes = ((s.durationMinutes ?: 0) - 1).takeIf { m -> m > 0 }) } }, enabled = (s.durationMinutes ?: 0) > 0) { Text("−") }
                            Spacer(Modifier.width(4.dp))
                            OutlinedButton(onClick = { steps = steps.toMutableList().also { it[i] = s.copy(durationMinutes = minOf(60, (s.durationMinutes ?: 0) + 1)) } }, enabled = (s.durationMinutes ?: 0) < 60) { Text("+") }
                            IconButton(onClick = { if (i > 0) steps = steps.toMutableList().also { it.add(i - 1, it.removeAt(i)) } }, enabled = i > 0) { Icon(Icons.Filled.ArrowUpward, null) }
                            IconButton(onClick = { if (i < steps.lastIndex) steps = steps.toMutableList().also { it.add(i + 1, it.removeAt(i)) } }, enabled = i < steps.lastIndex) { Icon(Icons.Filled.ArrowDownward, null) }
                            IconButton(onClick = { steps = steps.toMutableList().also { it.removeAt(i) } }) { Icon(Icons.Filled.Delete, null, tint = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
            OutlinedButton(onClick = { steps = steps + EditableStep("", "📝", null) }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Filled.Add, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.add_step)) }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            Spacer(Modifier.height(24.dp))
        }
    }
    if (aiOpen) BuildWithAiDialog(vm, childId, type.raw, onDismiss = { aiOpen = false }, onDraft = { d -> applyDraft(d); aiOpen = false }, onPaywall = { aiOpen = false; onPaywall("gate_ai_routine") })
}

/** POST /api/ai/build-routine: describe it, get a draft to edit. Nothing is saved until the parent saves. */
@Composable
private fun BuildWithAiDialog(vm: DashboardViewModel, childId: String?, routineType: String?, onDismiss: () -> Unit, onDraft: (com.chorestar.app.data.RoutineDraft) -> Unit, onPaywall: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    var goal by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("✨ " + stringResource(R.string.build_with_ai)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.build_with_ai_prompt), style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(goal, { goal = it.take(500) }, placeholder = { Text(stringResource(R.string.build_with_ai_placeholder)) }, minLines = 2, modifier = Modifier.fillMaxWidth())
                if (busy) Row(verticalAlignment = Alignment.CenterVertically) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.build_with_ai_working), style = MaterialTheme.typography.bodySmall) }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy && goal.trim().length >= 3, onClick = {
                busy = true; error = null
                scope.launch {
                    runCatching { vm.premiumApi.buildRoutine(goal, childId, routineType) }
                        .onSuccess { r ->
                            val draft = if (r.source == "templates") r.draft.copy(tip = listOfNotNull(context.getString(R.string.build_with_ai_fallback), r.draft.tip).joinToString(" ")) else r.draft
                            onDraft(draft)
                        }
                        .onFailure { e -> if (e is com.chorestar.app.data.WebApiError && e.premiumRequired) onPaywall() else error = e.message }
                    busy = false
                }
            }) { Text(stringResource(R.string.build_with_ai_go)) }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text(stringResource(R.string.cancel)) } },
    )
}

@Composable
private fun SectionTitle(t: String) = Text(t.uppercase(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

/** iOS StarterRoutinesView: pick a kid, add any of the four templates. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StarterRoutinesScreen(vm: DashboardViewModel, state: DashboardState, onDone: () -> Unit) {
    val scope = rememberCoroutineScope()
    var childId by remember { mutableStateOf(state.children.firstOrNull()?.id) }
    var added by remember(childId) { mutableStateOf(setOf<String>()) }
    var busy by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = { TopAppBar(windowInsets = WindowInsets(0), title = { Text(stringResource(R.string.starter_routines)) }, actions = { TextButton(onClick = onDone) { Text(stringResource(R.string.done_label)) } }) },
    ) { padding ->
        if (state.children.isEmpty()) {
            Column(Modifier.padding(padding).fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text("👨‍👩‍👧", style = MaterialTheme.typography.displayMedium)
                Text(stringResource(R.string.add_a_child_first), style = MaterialTheme.typography.titleMedium)
                Text(stringResource(R.string.routines_belong_to_kid), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            }
            return@Scaffold
        }
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text(stringResource(R.string.who_are_these_for), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.children, key = { it.id }) { c -> FilterChip(selected = c.id == childId, onClick = { childId = c.id }, label = { Text(c.name) }, leadingIcon = { ChildAvatar(c, 22.dp) }) }
                }
            }
            items(RoutineTemplates.all, key = { it.name }) { t ->
                val isAdded = t.name in added
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(routineColor(t.type.defaultColor).copy(alpha = 0.15f)), contentAlignment = Alignment.Center) { Text(t.icon, style = MaterialTheme.typography.headlineSmall) }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(localizedRoutineText(t.name), style = MaterialTheme.typography.titleMedium)
                                Text("${stringResource(R.string.n_steps, t.steps.size)} · ${stringResource(t.type.label)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Button(
                                onClick = {
                                    val cid = childId ?: return@Button
                                    busy = t.name
                                    scope.launch { vm.addTemplate(cid, t).onSuccess { added = added + t.name }.onFailure { error = it.message }; busy = null }
                                },
                                enabled = !isAdded && busy == null && childId != null,
                                colors = if (isAdded) ButtonDefaults.buttonColors(containerColor = Success) else ButtonDefaults.buttonColors(),
                            ) {
                                if (busy == t.name) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)
                                else Text(stringResource(if (isAdded) R.string.added else R.string.add))
                            }
                        }
                        HorizontalDivider(Modifier.padding(vertical = 10.dp))
                        t.steps.forEachIndexed { i, (title, ic, sec) ->
                            Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("${i + 1}.", modifier = Modifier.width(24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(ic); Spacer(Modifier.width(8.dp))
                                Text(localizedRoutineText(title), modifier = Modifier.weight(1f))
                                if (sec != null) Text(if (sec >= 60) stringResource(R.string.n_min, sec / 60) else stringResource(R.string.n_sec, sec), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
            error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }
        }
    }
}

/**
 * iOS RoutinePlayerView + RoutineCelebrationView. Closing mid-way saves nothing.
 *
 * 1.0.2 (migration 032): step pictures, read-aloud (free; automatic when the
 * routine asks for it), the gentle finish-by bar for Premium families, and the
 * live view: `onProgress` reports the step (throttled, latest wins) and
 * `onProgressClear` runs on exit and on finish.
 */
@Composable
fun RoutinePlayerScreen(
    routine: Routine, childName: String, currency: String?,
    onComplete: (stepsCompleted: Int, durationSeconds: Int) -> Unit, onClose: () -> Unit,
    premium: Boolean = false,
    photoUrl: (com.chorestar.app.data.model.RoutineStep) -> String? = { it.imageUrl },
    familyLanguage: String? = null,
    onProgress: ((stepIndex: Int, stepsTotal: Int, stepTitle: String?) -> Unit)? = null,
    onProgressClear: (() -> Unit)? = null,
) {
    val steps = routine.sortedSteps
    val color = routineColor(routine.color)
    var index by remember { mutableIntStateOf(0) }
    var remaining by remember { mutableIntStateOf(steps.firstOrNull()?.durationSeconds ?: 0) }
    var celebrating by remember { mutableStateOf(false) }
    val start = remember { System.currentTimeMillis() }
    var saved by remember { mutableStateOf(false) }
    val target = routine.targetDurationSeconds?.takeIf { premium && it > 0 }

    val notifyContext = androidx.compose.ui.platform.LocalContext.current
    val tts = rememberStepSpeaker()
    val reporter = rememberProgressReporter(onProgress)
    val closeAndClear = { reporter.cancel(); onProgressClear?.invoke(); tts.stop(); onClose() }
    LaunchedEffect(index, celebrating) {
        remaining = steps.getOrNull(index)?.durationSeconds ?: 0
        val step = steps.getOrNull(index)
        if (!celebrating && step != null) com.chorestar.app.notify.RoutineNotification.show(notifyContext, routine.name, step.title, index, steps.size, step.durationSeconds)
        else com.chorestar.app.notify.RoutineNotification.clear(notifyContext)
        if (!celebrating && step != null) reporter.report(index, steps.size, step.title)
        while (remaining > 0 && !celebrating) { delay(1000); remaining-- }
    }
    androidx.compose.runtime.DisposableEffect(Unit) { onDispose { com.chorestar.app.notify.RoutineNotification.clear(notifyContext) } }
    androidx.activity.compose.BackHandler { closeAndClear() }

    if (celebrating) {
        val seconds = ((System.currentTimeMillis() - start) / 1000).toInt()
        LaunchedEffect(Unit) { if (!saved) { saved = true; reporter.cancel(); onProgressClear?.invoke(); tts.stop(); onComplete(steps.size, seconds) } }
        Celebration(routine, seconds, currency, onClose, earlyBy = com.chorestar.app.data.RoutineTimer.finishedEarlyBy(seconds, target))
        return
    }
    val step = steps.getOrNull(index) ?: run { onClose(); return }
    val shownTitle = localizedRoutineText(step.title)
    val localized = RoutineTemplates.localized.containsKey(step.title)
    val speechTag = com.chorestar.app.data.Speech.languageFor(localized, java.util.Locale.getDefault().toLanguageTag(), familyLanguage)
    val speechText = com.chorestar.app.data.Speech.textFor(shownTitle, step.description)
    LaunchedEffect(index, tts.ready) { if (routine.autoReadAloud && tts.ready) tts.speak(speechText, speechTag) }
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(color.copy(alpha = 0.1f), MaterialTheme.colorScheme.background)))) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = closeAndClear) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.cancel)) }
                        Column(Modifier.weight(1f)) {
                            Text(localizedRoutineText(routine.name), style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.step_n_of_m, index + 1, steps.size), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                        steps.indices.forEach { i -> Box(Modifier.size(if (i == index) 12.dp else 8.dp).clip(CircleShape).background(if (i <= index) color else color.copy(alpha = 0.25f))) }
                    }
                    LinearProgressIndicator(progress = { index.toFloat() / steps.size }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(6.dp), color = color)
                    if (target != null) FinishByBar(start, target)
                }
            }
            Spacer(Modifier.weight(1f))
            val picture = photoUrl(step)
            if (picture != null) {
                coil3.compose.AsyncImage(picture, contentDescription = shownTitle, contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth(0.85f).aspectRatio(4f / 3f).clip(RoundedCornerShape(24.dp)).border(3.dp, color.copy(alpha = 0.4f), RoundedCornerShape(24.dp)))
            } else Box(Modifier.size(120.dp).clip(CircleShape).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                Text(RoutineIcons.display(step.icon, "✅"), style = MaterialTheme.typography.displayMedium)
            }
            Spacer(Modifier.height(16.dp))
            Text(shownTitle, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            step.description?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center) }
            if (tts.available) OutlinedButton(onClick = { tts.speak(speechText, speechTag) }, modifier = Modifier.padding(top = 8.dp)) {
                Text("🔊 " + stringResource(R.string.read_it_to_me))
            }
            if ((step.durationSeconds ?: 0) > 0) {
                Spacer(Modifier.height(16.dp))
                val total = step.durationSeconds!!
                Box(contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(progress = { 1f - remaining.toFloat() / total }, modifier = Modifier.size(84.dp), color = color, strokeWidth = 6.dp, trackColor = color.copy(alpha = 0.2f))
                    Text("%d:%02d".format(remaining / 60, remaining % 60), style = MaterialTheme.typography.titleMedium)
                }
                Text(stringResource(if (remaining > 0) R.string.time_remaining else R.string.times_up), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.weight(1f))
            Button(
                onClick = { if (index < steps.lastIndex) index++ else celebrating = true },
                modifier = Modifier.fillMaxWidth().height(56.dp), colors = ButtonDefaults.buttonColors(containerColor = color),
            ) {
                if (index == steps.lastIndex) { Icon(Icons.Filled.CheckCircle, null); Spacer(Modifier.width(8.dp)) }
                Text(stringResource(if (index == steps.lastIndex) R.string.all_done else R.string.done_excl), style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

private val ENCOURAGEMENTS = listOf(R.string.amazing_job_you_re_a_superstar_212d3, R.string.way_to_go_keep_up_the_great_work_e2ce5, R.string.fantastic_you_crushed_it_24cb3, R.string.incredible_you_re_on_fire_ed997, R.string.awesome_your_parents_will_be_so_proud_94b0c, R.string.you_did_it_high_five_ca002)

@Composable
private fun Celebration(routine: Routine, seconds: Int, currency: String?, onClose: () -> Unit, earlyBy: Int? = null) {
    val theme = LocalActiveTheme.current
    val line = remember { ENCOURAGEMENTS.random() }
    val scale by animateFloatAsState(1f, label = "star")
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(theme.primary.copy(alpha = 0.12f), theme.secondary.copy(alpha = 0.10f))))) {
        Confetti(trigger = routine.id, palette = listOf(theme.primary, theme.secondary, Color(0xFFF59E0B), Color.White))
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("⭐", style = MaterialTheme.typography.displayLarge, modifier = Modifier.alpha(scale))
            Text(stringResource(R.string.routine_complete), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(stringResource(line), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 6.dp))
            if (earlyBy != null) Text(stringResource(R.string.finished_early, com.chorestar.app.data.RoutineTimer.clock(earlyBy)), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold,
                color = Success, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
            Spacer(Modifier.height(24.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard(Modifier.weight(1f), "✅", "${routine.steps.size}/${routine.steps.size}", stringResource(R.string.steps_label))
                StatCard(Modifier.weight(1f), "⏱️", if (seconds >= 60) "${seconds / 60}m ${seconds % 60}s" else "${seconds}s", stringResource(R.string.time_label))
                StatCard(Modifier.weight(1f), "⭐", Money.format(routine.rewardCents, currency), stringResource(R.string.stats_earned))
            }
            Spacer(Modifier.height(28.dp))
            Button(onClick = onClose, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("🏠 " + stringResource(R.string.back_to_home)) }
        }
    }
}

/** The whole-routine finish-by bar: shrinks in calm colors, then just says "keep going". No fail state. */
@Composable
private fun FinishByBar(startMillis: Long, targetSeconds: Int) {
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(1000); now = System.currentTimeMillis() } }
    val st = com.chorestar.app.data.RoutineTimer.status((now - startMillis) / 1000, targetSeconds)
    val barColor = when (st.phase) {
        com.chorestar.app.data.RoutineTimer.Phase.Plenty -> Color(0xFF14B8A6)
        com.chorestar.app.data.RoutineTimer.Phase.Some -> Color(0xFF0EA5E9)
        com.chorestar.app.data.RoutineTimer.Phase.Little -> Color(0xFF8B5CF6)
        com.chorestar.app.data.RoutineTimer.Phase.Over -> Color(0xFF8B5CF6)
    }
    Column(Modifier.padding(top = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("⏳ " + stringResource(R.string.finish_by_timer), style = MaterialTheme.typography.labelMedium, modifier = Modifier.weight(1f))
            Text(if (st.overTime) stringResource(R.string.keep_going) else stringResource(R.string.time_left, com.chorestar.app.data.RoutineTimer.clock(st.remainingSeconds)),
                style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = barColor)
        }
        LinearProgressIndicator(progress = { st.fractionLeft }, modifier = Modifier.fillMaxWidth().padding(top = 4.dp).height(8.dp).clip(CircleShape), color = barColor, trackColor = barColor.copy(alpha = 0.15f))
    }
}

/** On-device TextToSpeech for read-aloud steps; nothing leaves the phone. */
class StepSpeaker {
    var engine: android.speech.tts.TextToSpeech? = null
    var ready by mutableStateOf(false)
    /** False only when the phone has no speech engine at all. */
    var available by mutableStateOf(true)

    fun speak(text: String, languageTag: String) {
        val e = engine ?: return
        if (!ready) return
        val locale = java.util.Locale.forLanguageTag(languageTag)
        val result = runCatching { e.setLanguage(locale) }.getOrDefault(android.speech.tts.TextToSpeech.LANG_NOT_SUPPORTED)
        if (result == android.speech.tts.TextToSpeech.LANG_MISSING_DATA || result == android.speech.tts.TextToSpeech.LANG_NOT_SUPPORTED) runCatching { e.setLanguage(java.util.Locale.getDefault()) }
        e.setSpeechRate(0.9f)
        e.speak(text, android.speech.tts.TextToSpeech.QUEUE_FLUSH, null, "routine-step")
    }

    fun stop() { runCatching { engine?.stop() } }
}

@Composable
fun rememberStepSpeaker(): StepSpeaker {
    val context = androidx.compose.ui.platform.LocalContext.current
    val speaker = remember { StepSpeaker() }
    androidx.compose.runtime.DisposableEffect(Unit) {
        val engine = android.speech.tts.TextToSpeech(context.applicationContext) { status ->
            if (status == android.speech.tts.TextToSpeech.SUCCESS) speaker.ready = true else speaker.available = false
        }
        speaker.engine = engine
        onDispose { runCatching { engine.stop(); engine.shutdown() }; speaker.engine = null; speaker.ready = false }
    }
    return speaker
}

/** Throttled (about one post every 4 s), latest-wins progress reports for the parent's live view. */
class ProgressReporter(private val scope: kotlinx.coroutines.CoroutineScope, private val send: ((Int, Int, String?) -> Unit)?) {
    private data class Report(val index: Int, val total: Int, val title: String?)
    private val gate = com.chorestar.app.data.LatestWinsThrottle<Report>()
    private var job: kotlinx.coroutines.Job? = null

    fun report(index: Int, total: Int, title: String?) {
        val s = send ?: return
        when (val d = gate.offer(Report(index, total, title), System.currentTimeMillis())) {
            is com.chorestar.app.data.LatestWinsThrottle.Decision.SendNow -> s(d.value.index, d.value.total, d.value.title)
            is com.chorestar.app.data.LatestWinsThrottle.Decision.WaitMs -> if (job?.isActive != true) job = scope.launch {
                delay(d.ms)
                gate.due(System.currentTimeMillis())?.let { r -> s(r.index, r.total, r.title) }
            }
        }
    }

    fun cancel() { job?.cancel(); gate.cancel() }
}

@Composable
private fun rememberProgressReporter(send: ((Int, Int, String?) -> Unit)?): ProgressReporter {
    val scope = rememberCoroutineScope()
    return remember { ProgressReporter(scope, send) }
}

@Composable
private fun StatCard(modifier: Modifier, icon: String, value: String, label: String) {
    Card(modifier) {
        Column(Modifier.padding(12.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(icon); Text(value, style = MaterialTheme.typography.titleMedium, maxLines = 1); Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/**
 * "Happening now" on Home (GET /api/routines/live): Premium shows which step
 * each kid is on; a free family sees only that a routine is underway, with a
 * crown that opens the paywall (gate_routine_live).
 */
@Composable
fun HappeningNowCard(state: DashboardState, onPaywall: (String) -> Unit) {
    val now = System.currentTimeMillis()
    val items = state.live.filter { r -> r.updatedAt?.let { runCatching { java.time.OffsetDateTime.parse(it).toInstant().toEpochMilli() }.getOrNull() }?.let { com.chorestar.app.data.LiveProgress.isFresh(it, now) } ?: true }
    if (items.isEmpty()) return
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("🟢 " + stringResource(R.string.happening_now), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            items.forEach { r ->
                val child = state.child(r.childId)
                val color = routineColor(r.routineColor)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (child != null) ChildAvatar(child, 36.dp) else Box(Modifier.size(36.dp).clip(CircleShape).background(color))
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        if (r.locked || r.stepIndex == null || r.stepsTotal == null) {
                            Text(stringResource(R.string.live_doing, r.childName, localizedRoutineText(r.routineName)), style = MaterialTheme.typography.bodyLarge)
                            Text(stringResource(R.string.live_locked_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } else {
                            val step = com.chorestar.app.data.LiveProgress.stepNumber(r.stepIndex, r.stepsTotal)
                            Text(localizedRoutineText(r.routineName), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(stringResource(R.string.live_on_step, r.childName, step, r.stepsTotal) + (r.stepTitle?.takeIf { it.isNotBlank() }?.let { " · " + localizedRoutineText(it) } ?: ""),
                                style = MaterialTheme.typography.bodyLarge)
                            LinearProgressIndicator(progress = { com.chorestar.app.data.LiveProgress.percent(r.stepIndex, r.stepsTotal) }, modifier = Modifier.fillMaxWidth().padding(top = 4.dp).height(6.dp).clip(CircleShape), color = color)
                        }
                    }
                    if (r.locked) com.chorestar.app.ui.components.PremiumTag(Modifier.clickable { onPaywall("gate_routine_live") })
                }
            }
        }
    }
}

/** iOS KidRoutineCard: play, or a Done! badge once completed today. */
@Composable
fun KidRoutineCard(r: Routine, doneToday: Boolean, currency: String?, onPlay: () -> Unit) {
    val color = routineColor(r.color)
    Card(
        Modifier.fillMaxWidth().alpha(if (doneToday) 0.75f else 1f).border(2.dp, if (doneToday) Success.copy(alpha = 0.4f) else color.copy(alpha = 0.2f), RoundedCornerShape(20.dp)).clickable(enabled = !doneToday, onClick = onPlay),
        shape = RoundedCornerShape(20.dp),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(60.dp).clip(RoundedCornerShape(14.dp)).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) { Text(RoutineIcons.display(r.icon, r.routineType.emoji), style = MaterialTheme.typography.headlineMedium) }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(localizedRoutineText(r.name), style = MaterialTheme.typography.titleMedium)
                Text("${stringResource(R.string.n_steps, r.steps.size)} · ${stringResource(r.routineType.label)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (!doneToday) Text("⭐ " + stringResource(R.string.earn_amount, Money.format(r.rewardCents, currency)), style = MaterialTheme.typography.labelMedium, color = color)
            }
            if (doneToday) { Icon(Icons.Filled.CheckCircle, null, tint = Success, modifier = Modifier.size(36.dp)); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.done_excl), color = Success, style = MaterialTheme.typography.labelLarge) }
            else Icon(Icons.Filled.PlayCircle, null, tint = color, modifier = Modifier.size(40.dp))
        }
    }
}
