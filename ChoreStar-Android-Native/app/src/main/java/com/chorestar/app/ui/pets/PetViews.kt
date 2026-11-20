package com.chorestar.app.ui.pets

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.R
import com.chorestar.app.data.KidApi
import com.chorestar.app.data.PetApi
import com.chorestar.app.data.PetText
import com.chorestar.app.data.Sounds
import com.chorestar.app.data.StarPets
import com.chorestar.app.data.model.Child
import com.chorestar.app.ui.components.Confetti
import com.chorestar.app.ui.theme.LocalActiveTheme
import com.chorestar.app.ui.theme.Success
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

// Star Pets on Android (web components/kid/kid-pet.tsx, iOS Views/StarPetViews.swift).
// The server decides everything (lib/pets); these views decode and draw.

private val PetInk = Color(0xFF3B2950)
/** A green that holds 4.5:1 on light and dark cards (iOS choreStarSuccessInk). */
@Composable private fun successInk(): Color = if (MaterialTheme.colorScheme.background.luminance() < 0.5f) Color(0xFF4ADE80) else Color(0xFF15803D)
private fun Color.luminance(): Float = 0.2126f * red + 0.7152f * green + 0.0722f * blue

@Composable
private fun pt(key: String, vararg args: String): String = PetText.t(LocalContext.current, key, *args)

/** One pet, drawn by the web's own art with a gentle idle bob; a sleepy pet gets a drifting "z" the server can't draw. */
@Composable
fun PetPicture(
    species: String, stage: String, size: Dp, modifier: Modifier = Modifier, mood: String = "relaxed", star: Boolean = false,
    equipped: StarPets.Equipped? = null, habitat: Boolean = true, animated: Boolean = true,
) {
    val px = with(LocalDensity.current) { size.roundToPx() }
    val bob = if (animated) {
        val t = rememberInfiniteTransition(label = "pet")
        t.animateFloat(0f, 1f, infiniteRepeatable(tween(if (mood == "sleepy") 1800 else 1400), RepeatMode.Reverse), label = "bob").value
    } else 0f
    Box(modifier.size(size).clearAndSetSemantics { }) {
        AsyncImage(
            model = StarPets.artUrl(species, stage, mood, star, equipped, px, habitat),
            contentDescription = null,
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize().graphicsLayer { translationY = -bob * size.toPx() * 0.02f },
        )
        if (mood == "sleepy" && animated) {
            Text("z", color = PetInk, fontWeight = FontWeight.Black, fontSize = (size.value * 0.09f).sp,
                modifier = Modifier.align(Alignment.TopEnd).padding(end = size * 0.2f, top = size * (0.24f - bob * 0.06f)).alpha(0.9f - bob * 0.7f))
        }
    }
}

/** Rows of three equal cells; a short last row keeps its cells the same width. */
@Composable
private fun <T> Grid3(items: List<T>, cell: @Composable (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { Box(Modifier.weight(1f)) { cell(it) } }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

// ── Kid mode ───────────────────────────────────────────────────────────────

/**
 * The kid's pet on their own screen: adopt one, watch it grow, dress it up,
 * collect the monthly drop. Nothing at all when a parent switched pets off for
 * this kid or the server can't be reached. [refreshKey] reloads after ticks.
 */
@Composable
fun KidPetCard(childId: String, auth: () -> KidApi.Auth?, api: PetApi, refreshKey: Int, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val prefs = (context.applicationContext as ChoreStarApp).prefs
    val haptics = LocalHapticFeedback.current
    val theme = LocalActiveTheme.current
    val scope = rememberCoroutineScope()
    var pet by remember(childId) { mutableStateOf<StarPets.State?>(null) }
    var asked by remember(childId) { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var oops by remember { mutableStateOf(false) }
    var askGrownUp by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    var celebration by remember { mutableStateOf<String?>(null) }

    fun apply(next: StarPets.State) {
        pet = next
        if (!next.adopted) return
        val previous = prefs.petSeen(childId)
        prefs.setPetSeen(childId, StarPets.seenKey(next))
        StarPets.growth(previous, next)?.let { g ->
            celebration = PetText.t(context, g.key, *g.args.toTypedArray())
            Sounds.play(Sounds.Cue.Cheer, prefs)
            haptics.performHapticFeedback(HapticFeedbackType.LongPress)
        }
    }

    fun act(body: Map<String, JsonElement>, then: () -> Unit = {}) {
        val a = auth() ?: return
        scope.launch {
            busy = true; oops = false
            when (val r = api.act(a, body)) {
                is PetApi.ActionResult.Updated -> { haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove); asked = r.asked; apply(r.pet); then() }
                PetApi.ActionResult.AskGrownUp -> askGrownUp = true
                PetApi.ActionResult.Failed -> oops = true
            }
            busy = false
        }
    }
    val ask: (String) -> Unit = { species -> act(mapOf("action" to JsonPrimitive("ask"), "species" to JsonPrimitive(species))) }

    LaunchedEffect(childId, refreshKey) {
        val a = auth() ?: return@LaunchedEffect
        api.kidPet(a)?.let { r -> asked = r.request?.species; r.pet?.let(::apply) }
    }
    LaunchedEffect(celebration) { if (celebration != null) { delay(6000); celebration = null } }

    val p = pet ?: return
    if (!p.enabled) return
    Card(
        modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp),
        border = if (p.star) BorderStroke(4.dp, Color(0xFFFACC15).copy(alpha = 0.7f)) else null,
    ) {
        Box {
            Column(Modifier.padding(20.dp)) {
                val species = p.species; val name = p.name
                if (p.adopted && species != null && name != null) {
                    Grown(p, species, name, busy, oops, askGrownUp, celebration, onEdit = { editing = true },
                        onCollect = { act(mapOf("action" to JsonPrimitive("collect_drop"))) },
                        onLocked = { askGrownUp = true },
                        onEquip = { slot, itemId -> act(mapOf("action" to JsonPrimitive("equip"), "slot" to JsonPrimitive(slot), "itemId" to (itemId?.let { JsonPrimitive(it) } ?: JsonNull))) })
                } else {
                    AdoptForm(p, busy, oops, asked, ask) { s, n -> act(mapOf("action" to JsonPrimitive("adopt"), "species" to JsonPrimitive(s), "name" to JsonPrimitive(n))) }
                }
            }
            if (celebration != null) Confetti(celebration, listOf(theme.primary, theme.secondary, Color(0xFFFACC15), Color.White), Modifier.matchParentSize())
        }
    }

    if (editing) {
        EditSheet(p, busy, asked, ask, onDismiss = { editing = false }) { s, n ->
            val body = if (s == p.species) mapOf("action" to JsonPrimitive("rename"), "name" to JsonPrimitive(n))
            else mapOf("action" to JsonPrimitive("adopt"), "species" to JsonPrimitive(s), "name" to JsonPrimitive(n))
            act(body) { editing = false }
        }
    }
}

@Composable
private fun Grown(
    p: StarPets.State, species: String, name: String, busy: Boolean, oops: Boolean, askGrownUp: Boolean, celebration: String?,
    onEdit: () -> Unit, onCollect: () -> Unit, onLocked: () -> Unit, onEquip: (String, String?) -> Unit,
) {
    val context = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(pt("pet.title"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            TextButton(onClick = onEdit) { Text(pt("pet.edit"), fontWeight = FontWeight.Bold) }
        }
        AnimatedVisibility(celebration != null, enter = scaleIn() + fadeIn(), exit = fadeOut()) {
            Text(celebration ?: "", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFFACC15).copy(alpha = 0.25f)).padding(12.dp))
        }
        PetPicture(species, p.stage, 220.dp, Modifier.align(Alignment.CenterHorizontally), p.mood, p.star, p.equipped)
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(name, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
            Text("${PetText.species(context, species)} · ${PetText.stage(context, p.stage, p.star)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(pt("pet.mood.${p.mood}", name), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
        }
        LevelBar(p, name)
        p.drop?.let { DropCard(it, busy, onCollect) }
        Wardrobe(p, busy, onLocked, onEquip)
        Text(pt("pet.howToGrow"), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        if (!p.premium || askGrownUp) {
            Text(if (p.heldBack) pt("pet.readyToGrow", name, (p.xp - p.levelStartXp).toString()) else pt("pet.askGrownUp"),
                fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)).padding(12.dp))
        }
        if (oops) Text(pt("pet.oops"), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun LevelBar(p: StarPets.State, name: String) {
    val context = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row {
            Text(pt("pet.level", p.level.toString()), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
            Text(pt("pet.xp", p.xp.toString()), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        val fraction = (p.levelPercent / 100.0).coerceIn(0.0, 1.0).toFloat()
        val label = pt("pet.levelAria")
        LinearProgressIndicator(
            progress = { fraction.coerceAtLeast(0.04f) },
            modifier = Modifier.fillMaxWidth().height(14.dp).clip(RoundedCornerShape(50)).semantics {
                contentDescription = label; progressBarRangeInfo = ProgressBarRangeInfo(fraction, 0f..1f); stateDescription = "${p.levelPercent.toInt()}%"
            },
            drawStopIndicator = {},
        )
        val progressLine = when {
            p.heldBack -> pt("pet.readyToGrow", name, (p.xp - p.levelStartXp).toString())
            p.nextLevelXp == null -> pt("pet.maxLevel")
            else -> pt("pet.xpToNext", (p.nextLevelXp - p.xp).toString(), (p.level + 1).toString())
        }
        Text(progressLine, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        p.nextStage?.let { Text("🌱 " + pt("pet.nextStage", PetText.stage(context, it.stage), it.level.toString()), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        p.nextUnlock?.let { Text("🎁 " + pt("pet.nextUnlock", PetText.item(context, it.id), it.level.toString()), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
private fun DropCard(drop: StarPets.Drop, busy: Boolean, onCollect: () -> Unit) {
    val context = LocalContext.current
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(drop.emoji, fontSize = 40.sp); Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(pt("pet.newThisMonth"), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
            Text(PetText.item(context, drop.itemId), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            when {
                drop.locked -> Text(pt("pet.askGrownUp"), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                drop.owned -> Text(pt("pet.collected"), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = successInk())
                !drop.collectible -> Text(pt("pet.dropProgress", (drop.goal - drop.xpThisMonth).coerceAtLeast(0).toString()), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (drop.collectible && !drop.owned) Button(onClick = onCollect, enabled = !busy) { Text(pt("pet.collect"), fontWeight = FontWeight.ExtraBold) }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun Wardrobe(p: StarPets.State, busy: Boolean, onLocked: () -> Unit, onEquip: (String, String?) -> Unit) {
    val context = LocalContext.current
    var slot by remember { mutableStateOf("hat") }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("👗 " + pt("pet.wardrobe"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            StarPets.slots.forEachIndexed { i, s ->
                SegmentedButton(selected = slot == s, onClick = { slot = s }, shape = SegmentedButtonDefaults.itemShape(i, StarPets.slots.size)) { Text(pt("pet.slot.$s")) }
            }
        }
        Grid3(p.wardrobe.filter { it.slot == slot }) { item ->
                val itemName = PetText.item(context, item.id)
                val described = if (item.wearable) pt(if (item.equipped) "pet.takeOff" else "pet.wear", itemName) else "$itemName: ${pt("pet.locked")}"
                Column(
                    Modifier.fillMaxWidth().heightIn(min = 92.dp).clip(RoundedCornerShape(14.dp))
                        .background(if (item.equipped) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant)
                        .border(2.dp, if (item.equipped) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(14.dp))
                        .clickable(enabled = !busy) { if (item.wearable) onEquip(item.slot, if (item.equipped) null else item.id) else onLocked() }
                        .clearAndSetSemantics { contentDescription = described; role = Role.Button }
                        .padding(6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(item.emoji, fontSize = 30.sp, modifier = Modifier.alpha(if (item.wearable) 1f else 0.4f))
                    Text(itemName, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, maxLines = 2)
                    if (!item.wearable) Text(if (item.state == "level" && item.level != null) pt("pet.unlocksAt", item.level.toString()) else pt("pet.locked"),
                        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
        }
    }
}

/** The species grid, for adopting and changing. A locked species offers "Ask a grown-up for the Kitty" (migration 039). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SpeciesPicker(options: List<StarPets.SpeciesOption>, chosen: String, onSelect: (String) -> Unit, asked: String?, onAsk: (String) -> Unit) {
    val context = LocalContext.current
    var lockedTap by remember { mutableStateOf<String?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Grid3(options) { o ->
                val isSel = chosen == o.id
                val label = PetText.species(context, o.id) + if (o.locked) ", " + pt("pet.locked") else ""
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
                        .background(if (isSel) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant)
                        .border(2.dp, if (isSel) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(16.dp))
                        .clickable { if (o.locked) lockedTap = o.id else onSelect(o.id) }
                        .clearAndSetSemantics { contentDescription = label; role = Role.RadioButton; selected = isSel }
                        .padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // The art leaves room for a habitat; without one, zoom in.
                    Box(Modifier.size(72.dp)) { PetPicture(o.id, "baby", 72.dp, Modifier.graphicsLayer { scaleX = 1.35f; scaleY = 1.35f; transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 1f) }.alpha(if (o.locked) 0.45f else 1f), habitat = false, animated = false) }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (o.locked) { Icon(Icons.Filled.Lock, null, Modifier.size(12.dp)); Spacer(Modifier.width(3.dp)) }
                        Text(PetText.species(context, o.id), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    }
                }
        }
        lockedTap?.let { s ->
            if (asked == s) {
                Text(pt("pet.asked", PetText.species(context, s)), fontWeight = FontWeight.Bold, color = successInk(), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            } else {
                Button(onClick = { onAsk(s) }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF15803D), contentColor = Color.White)) {
                    Text(pt("pet.askFor", PetText.species(context, s)) + " 🙋", fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun AdoptForm(p: StarPets.State, busy: Boolean, oops: Boolean, asked: String?, onAsk: (String) -> Unit, onAdopt: (String, String) -> Unit) {
    var species by remember { mutableStateOf("pup") }
    var name by remember { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("🐾 " + pt("pet.adoptTitle"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
        Text(pt("pet.adoptBody"), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        SpeciesPicker(p.speciesOptions, species, { species = it }, asked, onAsk)
        OutlinedTextField(name, { name = it.take(24) }, label = { Text(pt("pet.nameLabel")) }, placeholder = { Text(pt("pet.namePlaceholder")) }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Button(onClick = { onAdopt(species, name.trim()) }, enabled = !busy && name.isNotBlank(), modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(16.dp)) {
            Text(if (busy) pt("pet.saving") else pt("pet.adopt"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
        }
        if (oops) Text(pt("pet.oops"), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditSheet(p: StarPets.State, busy: Boolean, asked: String?, onAsk: (String) -> Unit, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var species by remember { mutableStateOf(p.species ?: "pup") }
    var name by remember { mutableStateOf(p.name ?: "") }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = androidx.compose.material3.rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(pt("pet.title"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            OutlinedTextField(name, { name = it.take(24) }, label = { Text(pt("pet.nameLabel")) }, singleLine = true, modifier = Modifier.fillMaxWidth())
            SpeciesPicker(p.speciesOptions, species, { species = it }, asked, onAsk)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onDismiss) { Text(pt("pet.cancel")) }
                Spacer(Modifier.width(8.dp))
                Button(onClick = { onSave(species, name.trim()) }, enabled = !busy && name.isNotBlank()) { Text(if (busy) pt("pet.saving") else pt("pet.save")) }
            }
        }
    }
}

// ── Parent side ────────────────────────────────────────────────────────────

/**
 * Every kid's Star Pet on Home. Kids without one get a faded pup and "Adopt",
 * so parents can find pets at all. A tile opens that kid's pet right here,
 * through the kid API acting for the child. Kids whose pet is off are left out.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamilyPetsCard(children: List<Child>, api: PetApi, parentAuth: (String) -> KidApi.Auth?, modifier: Modifier = Modifier) {
    var kids by remember { mutableStateOf<List<StarPets.FamilyKid>>(emptyList()) }
    var open by remember { mutableStateOf<Child?>(null) }
    var reload by remember { mutableStateOf(0) }
    LaunchedEffect(children.size, reload) { api.familyPets()?.let { kids = it.kids } }
    val shown = kids.mapNotNull { k -> if (k.pet?.enabled == false) null else children.firstOrNull { it.id.equals(k.childId, ignoreCase = true) && it.pausedByPlan != true }?.let { k to it } }
    if (shown.isEmpty()) return
    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.pets_title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                shown.forEach { (k, child) ->
                    val first = child.name.substringBefore(' ')
                    val pet = k.pet
                    val adopted = pet != null && pet.adopted && pet.species != null
                    val label = if (adopted) stringResource(R.string.pets_name_level, pet!!.name ?: first, pet.level) + " · " + first else first + ", " + stringResource(R.string.pets_adopt)
                    val hint = stringResource(R.string.pets_opens, first)
                    Column(
                        Modifier.widthIn(min = 84.dp).clip(RoundedCornerShape(14.dp)).clickable { open = child }
                            .clearAndSetSemantics { contentDescription = "$label. $hint"; role = Role.Button }.padding(4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        if (adopted) {
                            PetPicture(pet!!.species!!, pet.stage, 76.dp, mood = pet.mood, star = pet.star, equipped = pet.equipped, animated = false)
                            Text(pet.name ?: first, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            Text("$first · " + PetText.t(LocalContext.current, "pet.level", pet.level.toString()), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } else {
                            PetPicture("pup", "baby", 76.dp, Modifier.alpha(0.35f), habitat = false, animated = false)
                            Text(first, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            Text(stringResource(R.string.pets_adopt), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
    open?.let { child ->
        ModalBottomSheet(onDismissRequest = { open = null; reload++ }, sheetState = androidx.compose.material3.rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
                Text(stringResource(R.string.pets_child_pet, child.name), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp))
                KidPetCard(child.id, { parentAuth(child.id) }, api, refreshKey = 0, modifier = Modifier.padding(horizontal = 16.dp))
            }
        }
    }
}

/** Settings: what Star Pets are, and a per-kid switch. Pets are on by default; each kid adopts theirs in kid mode. */
@Composable
fun PetsSettingsContent(api: PetApi, modifier: Modifier = Modifier) {
    val scope = rememberCoroutineScope()
    var response by remember { mutableStateOf<StarPets.FamilyResponse?>(null) }
    var saving by remember { mutableStateOf(setOf<String>()) }
    LaunchedEffect(Unit) { response = api.familyPets() }
    Column(modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Card(Modifier.fillMaxWidth()) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                PetPicture("pup", "kid", 72.dp, mood = "happy", habitat = false)
                Spacer(Modifier.width(14.dp))
                Text(stringResource(R.string.pets_explainer), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Text(stringResource(R.string.pets_on_for), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
        Card(Modifier.fillMaxWidth()) {
            val r = response
            if (r == null) {
                Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else Column {
                r.kids.forEachIndexed { i, k ->
                    if (i > 0) HorizontalDivider()
                    val on = k.pet?.enabled ?: true
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(k.childName)
                            val pet = k.pet
                            Text(if (pet != null && pet.adopted && pet.name != null) stringResource(R.string.pets_name_level, pet.name, pet.level) else stringResource(R.string.pets_not_adopted),
                                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Switch(checked = on, enabled = k.childId !in saving, onCheckedChange = { v ->
                            saving = saving + k.childId
                            scope.launch {
                                if (api.setEnabled(k.childId, v)) response = api.familyPets()
                                saving = saving - k.childId
                            }
                        }, modifier = Modifier.semantics { contentDescription = k.childName })
                    }
                }
            }
        }
        Text(stringResource(if (response?.premium == true) R.string.pets_off_footer else R.string.pets_free_footer), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
