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
fun RoutineBuilderScreen(vm: DashboardViewModel, state: DashboardState, routine: Routine?, preselectedChildId: String?, onDone: () -> Unit) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf(routine?.name ?: "") }
    var childId by remember { mutableStateOf(routine?.childId ?: preselectedChildId ?: state.children.singleOrNull()?.id) }
    var type by remember { mutableStateOf(routine?.routineType ?: RoutineType.Morning) }
    var icon by remember { mutableStateOf(routine?.icon ?: RoutineType.Morning.defaultIcon) }
    var color by remember { mutableStateOf(routine?.color ?: RoutineType.Morning.defaultColor) }
    var reward by remember { mutableIntStateOf(routine?.rewardCents ?: 7) }
    val initialSteps: List<EditableStep> = routine?.sortedSteps.orEmpty().map { st ->
        val secs = st.durationSeconds ?: 0
        EditableStep(st.title, st.icon ?: "📝", if (secs > 0) secs / 60 else null)
    }
    var steps by remember { mutableStateOf<List<EditableStep>>(initialSteps) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val stepMissing = stringResource(R.string.add_step_with_title)

    fun save() {
        val cid = childId ?: return
        val kept = steps.filter { it.title.isNotBlank() }
        if (kept.isEmpty()) { error = stepMissing; return }
        saving = true; error = null
        val rows = kept.mapIndexed { i, s -> NewStepRow("", s.title.trim(), s.icon, i, s.durationMinutes?.let { it * 60 }) }
        scope.launch {
            val r = if (routine == null) vm.createRoutine(cid, name.trim(), type.raw, icon, color, reward, rows)
            else vm.updateRoutine(routine.id, cid, name.trim(), type.raw, icon, color, reward, rows)
            saving = false
            r.onSuccess { onDone() }.onFailure { error = it.message }
        }
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
                            Text(RoutineIcons.display(s.icon), style = MaterialTheme.typography.titleLarge)
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

/** iOS RoutinePlayerView + RoutineCelebrationView. Closing mid-way saves nothing. */
@Composable
fun RoutinePlayerScreen(routine: Routine, childName: String, currency: String?, onComplete: (stepsCompleted: Int, durationSeconds: Int) -> Unit, onClose: () -> Unit) {
    val steps = routine.sortedSteps
    val color = routineColor(routine.color)
    var index by remember { mutableIntStateOf(0) }
    var remaining by remember { mutableIntStateOf(steps.firstOrNull()?.durationSeconds ?: 0) }
    var celebrating by remember { mutableStateOf(false) }
    val start = remember { System.currentTimeMillis() }
    var saved by remember { mutableStateOf(false) }

    val notifyContext = androidx.compose.ui.platform.LocalContext.current
    LaunchedEffect(index, celebrating) {
        remaining = steps.getOrNull(index)?.durationSeconds ?: 0
        val step = steps.getOrNull(index)
        if (!celebrating && step != null) com.chorestar.app.notify.RoutineNotification.show(notifyContext, routine.name, step.title, index, steps.size, step.durationSeconds)
        else com.chorestar.app.notify.RoutineNotification.clear(notifyContext)
        while (remaining > 0 && !celebrating) { delay(1000); remaining-- }
    }
    androidx.compose.runtime.DisposableEffect(Unit) { onDispose { com.chorestar.app.notify.RoutineNotification.clear(notifyContext) } }

    if (celebrating) {
        val seconds = ((System.currentTimeMillis() - start) / 1000).toInt()
        LaunchedEffect(Unit) { if (!saved) { saved = true; onComplete(steps.size, seconds) } }
        Celebration(routine, seconds, currency, onClose)
        return
    }
    val step = steps.getOrNull(index) ?: run { onClose(); return }
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(color.copy(alpha = 0.1f), MaterialTheme.colorScheme.background)))) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.cancel)) }
                        Column(Modifier.weight(1f)) {
                            Text(localizedRoutineText(routine.name), style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.step_n_of_m, index + 1, steps.size), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                        steps.indices.forEach { i -> Box(Modifier.size(if (i == index) 12.dp else 8.dp).clip(CircleShape).background(if (i <= index) color else color.copy(alpha = 0.25f))) }
                    }
                    LinearProgressIndicator(progress = { index.toFloat() / steps.size }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(6.dp), color = color)
                }
            }
            Spacer(Modifier.weight(1f))
            Box(Modifier.size(120.dp).clip(CircleShape).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                Text(RoutineIcons.display(step.icon, "✅"), style = MaterialTheme.typography.displayMedium)
            }
            Spacer(Modifier.height(16.dp))
            Text(localizedRoutineText(step.title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            step.description?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center) }
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
private fun Celebration(routine: Routine, seconds: Int, currency: String?, onClose: () -> Unit) {
    val theme = LocalActiveTheme.current
    val line = remember { ENCOURAGEMENTS.random() }
    val scale by animateFloatAsState(1f, label = "star")
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(theme.primary.copy(alpha = 0.12f), theme.secondary.copy(alpha = 0.10f))))) {
        Confetti(trigger = routine.id, palette = listOf(theme.primary, theme.secondary, Color(0xFFF59E0B), Color.White))
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("⭐", style = MaterialTheme.typography.displayLarge, modifier = Modifier.alpha(scale))
            Text(stringResource(R.string.routine_complete), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(stringResource(line), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 6.dp))
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

@Composable
private fun StatCard(modifier: Modifier, icon: String, value: String, label: String) {
    Card(modifier) {
        Column(Modifier.padding(12.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(icon); Text(value, style = MaterialTheme.typography.titleMedium, maxLines = 1); Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
