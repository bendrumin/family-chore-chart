package com.chorestar.app.ui.family

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chorestar.app.R
import com.chorestar.app.data.Images
import com.chorestar.app.data.Palette
import com.chorestar.app.data.model.Child
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.PinChange
import com.chorestar.app.ui.components.AvatarCircle
import com.chorestar.app.ui.components.avatarColor
import com.chorestar.app.ui.components.diceBearPng
import kotlinx.coroutines.launch

private val ROBOT_SEEDS = listOf("Felix", "Aneka", "Coco", "Dusty", "Midnight", "Patches", "Boo", "Simba", "Lucky", "Missy",
    "Snickers", "Pumpkin", "Charlie", "Bella", "Max", "Luna", "Cooper", "Daisy", "Buddy", "Sadie")
private val PEOPLE_SEEDS = listOf("Emma", "Liam", "Olivia", "Noah", "Ava", "Mason", "Sophia", "Lucas", "Mia", "Ethan",
    "Isabella", "James", "Charlotte", "Benjamin", "Amelia", "Elijah", "Harper", "William", "Evelyn", "Alexander")
private val EMOJI_AVATARS = listOf("😀", "😎", "🤓", "🥳", "😇", "🤩", "😊", "🙂", "😁", "😆", "🤗", "🥰", "😍", "🤪", "😋",
    "😛", "🧐", "🤠", "👽", "🤖", "🎃", "👻", "🦄", "🐶", "🐱", "🐼", "🐨", "🦁", "🐯", "🐸")

private fun diceBear(style: String, seed: String, size: Int) = "https://api.dicebear.com/7.x/$style/png?seed=$seed&size=$size"

/** Add (child == null) or edit a child. Mirrors iOS AddEditChildView + AvatarPickerView. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ChildEditorScreen(vm: DashboardViewModel, child: Child?, onDone: () -> Unit) {
    val state by vm.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    var name by remember { mutableStateOf(child?.name ?: "") }
    var age by remember { mutableStateOf(child?.age ?: 5) }
    var color by remember { mutableStateOf(child?.avatarColor?.takeIf { it in Palette.child } ?: "blue") }
    var avatarUrl by remember { mutableStateOf(child?.avatarUrl) }
    var avatarFile by remember { mutableStateOf(child?.avatarFile) }
    val hadPin = child != null && child.id in state.pinChildIds
    var kidLogin by remember { mutableStateOf(hadPin) }
    var pin by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showPicker by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    val live = state.child(child?.id) ?: child
    val photoUrl = live?.id?.let { state.photoUrls[it] }
    val hasPhoto = live?.avatarPhotoPath != null

    val pinTooShort = stringResource(R.string.pin_required_to_enable)
    fun save() {
        if (name.isBlank() || saving) return
        saving = true; error = null
        scope.launch {
            val result = if (child == null) {
                vm.createChild(name, age, color, avatarUrl, avatarFile).map { }
            } else {
                val pinChange = when {
                    kidLogin && pin.length >= 4 -> PinChange.Set(pin)
                    kidLogin && !hadPin -> { error = pinTooShort; saving = false; return@launch }
                    kidLogin -> PinChange.Keep
                    hadPin -> PinChange.Remove
                    else -> PinChange.Keep
                }
                vm.updateChild(child, name, age, color, avatarUrl, avatarFile, pinChange)
            }
            saving = false
            result.onSuccess { onDone() }.onFailure { e -> if (e !is com.chorestar.app.ui.LimitReached) error = e.message }
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0),
                title = { Text(stringResource(if (child == null) R.string.add_child else R.string.edit_child)) },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.cancel)) } },
                actions = {
                    TextButton(onClick = { save() }, enabled = name.isNotBlank() && !saving) {
                        if (saving) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        else Text(stringResource(if (child == null) R.string.add else R.string.save))
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // Avatar
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                AvatarCircle(
                    size = 100.dp, color = avatarColor(color),
                    photoUrl = photoUrl?.takeIf { hasPhoto && avatarUrl == null && avatarFile == live?.avatarFile },
                    imageUrl = avatarUrl?.let { diceBearPng(it, 300) },
                    emoji = avatarFile?.takeIf { avatarUrl == null && it.isNotBlank() && !it.first().isLetterOrDigit() },
                    initials = name.trim().split(" ").filter { it.isNotEmpty() }.take(2).joinToString("") { it.take(1).uppercase() }.ifEmpty { "?" },
                )
                Spacer(Modifier.height(10.dp))
                FilledTonalButton(onClick = { showPicker = true }) { Text(stringResource(R.string.choose_avatar)) }
            }

            Section(stringResource(R.string.child_information)) {
                OutlinedTextField(
                    value = name, onValueChange = { name = it }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.name)) }, placeholder = { Text(stringResource(R.string.enter_name)) },
                )
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(stringResource(R.string.years_old, age), style = MaterialTheme.typography.bodyLarge)
                    Row {
                        OutlinedButton(onClick = { if (age > 1) age-- }, enabled = age > 1) { Text("−") }
                        Spacer(Modifier.width(8.dp))
                        OutlinedButton(onClick = { if (age < 18) age++ }, enabled = age < 18) { Text("+") }
                    }
                }
            }

            Section(stringResource(R.string.avatar_color)) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Palette.child.forEach { c ->
                        val selected = c == color
                        Box(
                            Modifier.size(50.dp).clip(CircleShape).background(avatarColor(c))
                                .border(if (selected) 3.dp else 0.dp, if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent, CircleShape)
                                .clickable { color = c },
                            contentAlignment = Alignment.Center,
                        ) { if (selected) Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White) }
                    }
                }
            }

            if (child != null) {
                Section(stringResource(R.string.kid_login)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(stringResource(R.string.enable_kid_login), style = MaterialTheme.typography.bodyLarge)
                        Switch(checked = kidLogin, onCheckedChange = { kidLogin = it })
                    }
                    if (kidLogin) {
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = pin, onValueChange = { pin = it.filter { ch -> ch.isDigit() }.take(6) },
                            singleLine = true, modifier = Modifier.fillMaxWidth(),
                            label = { Text(stringResource(R.string.pin_4_6_digits)) },
                            placeholder = { Text(stringResource(if (hadPin) R.string.enter_new_pin_to_change else R.string.enter_4_6_digit_pin)) },
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            supportingText = { if (hadPin) Text(stringResource(R.string.pin_already_set)) },
                        )
                    }
                }
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

            if (child != null) {
                OutlinedButton(
                    onClick = { confirmDelete = true }, modifier = Modifier.fillMaxWidth(),
                    colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) {
                    Icon(Icons.Filled.Delete, contentDescription = null); Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.delete_named, child.name))
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }

    if (confirmDelete && child != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(stringResource(R.string.delete_named, child.name)) },
            text = { Text(stringResource(R.string.delete_child_body, child.name)) },
            confirmButton = { TextButton(onClick = { confirmDelete = false; vm.deleteChild(child); onDone() }) { Text(stringResource(R.string.delete), color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }

    if (showPicker) {
        AvatarPickerSheet(
            child = live,
            hasPhoto = hasPhoto,
            onDismiss = { showPicker = false },
            onSelect = { url, file -> avatarUrl = url; avatarFile = file; showPicker = false },
            onPhoto = { uri ->
                val c = live ?: return@AvatarPickerSheet
                scope.launch {
                    vm.uploadAvatarPhoto(context, c, uri).onSuccess { avatarUrl = null; showPicker = false }
                        .onFailure { e -> error = e.message ?: context.getString(R.string.photo_upload_failed) }
                }
            },
            onPhotoBitmap = { bmp ->
                val c = live ?: return@AvatarPickerSheet
                scope.launch {
                    vm.uploadAvatarPhoto(c, Images.squareJpeg(bmp)).onSuccess { avatarUrl = null; showPicker = false }
                        .onFailure { e -> error = e.message ?: context.getString(R.string.photo_upload_failed) }
                }
            },
            onRemovePhoto = {
                val c = live ?: return@AvatarPickerSheet
                scope.launch { vm.removeAvatarPhoto(c).onFailure { e -> error = e.message ?: context.getString(R.string.photo_remove_failed) } }
            },
        )
    }
}

private enum class AvatarTab(val label: Int) { Photo(R.string.avatar_tab_photo), Robots(R.string.avatar_tab_robots), People(R.string.avatar_tab_people), Emojis(R.string.avatar_tab_emojis) }

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun AvatarPickerSheet(
    child: Child?,
    hasPhoto: Boolean,
    onDismiss: () -> Unit,
    onSelect: (url: String?, file: String?) -> Unit,
    onPhoto: (Uri) -> Unit,
    onPhotoBitmap: (android.graphics.Bitmap) -> Unit,
    onRemovePhoto: () -> Unit,
) {
    var tab by remember { mutableStateOf(AvatarTab.Robots) }
    var selectedKey by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val pickImage = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> uri?.let { busy = true; onPhoto(it) } }
    val takePhoto = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bmp -> bmp?.let { busy = true; onPhotoBitmap(it) } }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
                Text(stringResource(R.string.choose_avatar), style = MaterialTheme.typography.titleMedium)
                TextButton(
                    enabled = selectedKey != null && tab != AvatarTab.Photo,
                    onClick = {
                        val key = selectedKey ?: return@TextButton
                        val (style, seed) = key.split("-", limit = 2)
                        if (style == "emoji") onSelect(null, seed) else onSelect(diceBear(style, seed, 200), seed)
                    },
                ) { Text(stringResource(R.string.select)) }
            }
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                AvatarTab.entries.forEachIndexed { i, t ->
                    SegmentedButton(selected = tab == t, onClick = { tab = t }, shape = SegmentedButtonDefaults.itemShape(i, AvatarTab.entries.size)) {
                        Text(stringResource(t.label), maxLines = 1)
                    }
                }
            }
            when (tab) {
                AvatarTab.Photo -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (child == null) {
                        Text(stringResource(R.string.save_child_first_for_photo), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        if (busy) Row(verticalAlignment = Alignment.CenterVertically) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.uploading)) }
                        Button(onClick = { takePhoto.launch(null) }, modifier = Modifier.fillMaxWidth(), enabled = !busy) { Text(stringResource(R.string.take_a_photo)) }
                        OutlinedButton(onClick = { pickImage.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, modifier = Modifier.fillMaxWidth(), enabled = !busy) { Text(stringResource(R.string.choose_from_library)) }
                        if (hasPhoto) OutlinedButton(onClick = onRemovePhoto, modifier = Modifier.fillMaxWidth(), enabled = !busy,
                            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text(stringResource(R.string.remove_current_photo)) }
                        Text(stringResource(R.string.photo_privacy_note), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                AvatarTab.Robots, AvatarTab.People -> {
                    val style = if (tab == AvatarTab.Robots) "bottts" else "adventurer"
                    val seeds = if (tab == AvatarTab.Robots) ROBOT_SEEDS else PEOPLE_SEEDS
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        seeds.forEach { seed ->
                            val key = "$style-$seed"
                            val selected = key == selectedKey
                            Box(
                                Modifier.size(64.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)
                                    .border(3.dp, if (selected) MaterialTheme.colorScheme.primary else Color.Transparent, CircleShape)
                                    .clickable { selectedKey = key },
                            ) { AsyncImage(diceBear(style, seed, 140), contentDescription = seed, modifier = Modifier.fillMaxSize()) }
                        }
                    }
                }
                AvatarTab.Emojis -> FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    EMOJI_AVATARS.forEach { e ->
                        val key = "emoji-$e"
                        val selected = key == selectedKey
                        Box(
                            Modifier.size(52.dp).clip(RoundedCornerShape(12.dp))
                                .background(if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant)
                                .clickable { selectedKey = key },
                            contentAlignment = Alignment.Center,
                        ) { Text(e, style = MaterialTheme.typography.headlineSmall) }
                    }
                }
            }
        }
    }
}

@Composable
fun Section(title: String, content: @Composable () -> Unit) {
    Column {
        Text(title.uppercase(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 8.dp))
        content()
    }
}
