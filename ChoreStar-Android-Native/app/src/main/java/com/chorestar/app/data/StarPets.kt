package com.chorestar.app.data

import android.content.Context
import com.chorestar.app.BuildConfig
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.URLEncoder

/**
 * Star Pets (web migration 034), the Android side, mirroring iOS Logic/StarPets.swift.
 * Every rule (XP, levels, Premium gating, unlocks, monthly drops) lives on the
 * server in chorestar-nextjs/lib/pets and arrives already worked out, so this
 * only decodes and draws. The art is the web's own, rendered to a PNG by
 * /api/pets/art, so no two apps ever show a different pet.
 */
object StarPets {
    val speciesIds = listOf("pup", "kitty", "bunny", "dino", "panda", "owl")
    val slots = listOf("hat", "accessory", "habitat")

    @Serializable data class Equipped(val hat: String? = null, val accessory: String? = null, val habitat: String? = null)
    @Serializable data class StageAt(val stage: String, val level: Int)
    @Serializable data class UnlockAt(val id: String, val level: Int)

    @Serializable
    data class WardrobeItem(
        val id: String, val slot: String, val emoji: String = "",
        /** unlocked | level | drop | premium */
        val state: String = "premium",
        val equipped: Boolean = false, val level: Int? = null, val month: Int? = null,
    ) { val wearable: Boolean get() = state == "unlocked" }

    @Serializable
    data class Drop(
        val itemId: String, val slot: String, val emoji: String = "", val owned: Boolean = false, val collectible: Boolean = false,
        val xpThisMonth: Int = 0, val goal: Int = 0, val locked: Boolean = false,
    )

    @Serializable data class SpeciesOption(val id: String, val locked: Boolean = false)

    @Serializable
    data class State(
        val enabled: Boolean = true, val adopted: Boolean = false, val premium: Boolean = false,
        val species: String? = null, val name: String? = null,
        val xp: Int = 0, val level: Int = 1, val stage: String = "baby", val star: Boolean = false, val heldBack: Boolean = false,
        val levelStartXp: Int = 0, val nextLevelXp: Int? = null, val levelPercent: Double = 0.0,
        val nextStage: StageAt? = null, val nextUnlock: UnlockAt? = null,
        val mood: String = "relaxed", val equipped: Equipped = Equipped(),
        val wardrobe: List<WardrobeItem> = emptyList(), val drop: Drop? = null,
        val speciesOptions: List<SpeciesOption> = emptyList(),
    )

    @Serializable data class Request(val species: String)
    @Serializable data class KidResponse(val childId: String? = null, val pet: State? = null, val request: Request? = null)
    @Serializable data class FamilyKid(val childId: String, val childName: String = "", val pet: State? = null)
    @Serializable data class FamilyResponse(val premium: Boolean = false, val kids: List<FamilyKid> = emptyList())

    /** The pet as a PNG from the web's own art; `sizePx` is what the screen needs, capped where the server caps it. */
    fun artUrl(species: String, stage: String, mood: String = "relaxed", star: Boolean = false, equipped: Equipped? = null, sizePx: Int = 600, habitat: Boolean = true): String {
        fun e(v: String) = URLEncoder.encode(v, "UTF-8")
        val q = buildList {
            add("species=${e(species)}"); add("stage=${e(stage)}"); add("mood=${e(mood)}"); add("star=${if (star) 1 else 0}")
            add("size=${sizePx.coerceIn(40, 600)}")
            equipped?.hat?.let { add("hat=${e(it)}") }
            equipped?.accessory?.let { add("accessory=${e(it)}") }
            add("habitat=" + if (habitat) e(equipped?.habitat ?: "") else "none")
        }
        return "${BuildConfig.WEB_API_BASE}/api/pets/art?" + q.joinToString("&")
    }

    /** Where a growth celebration is due: the message key and its arguments, or null (web and iOS parity). */
    data class Growth(val key: String, val args: List<String>)

    /**
     * Compares what this device last saw ("level|stage|star") with the pet now.
     * First sight remembers without celebrating; a star beats a new stage beats a level.
     */
    fun growth(previous: String?, next: State): Growth? {
        val name = next.name ?: return null
        val parts = previous?.split("|") ?: return null
        if (parts.size != 3) return null
        val oldLevel = parts[0].toIntOrNull() ?: return null
        val wasStar = parts[2] == "1"
        if (next.level <= oldLevel && !(next.star && !wasStar)) return null
        return when {
            next.star && !wasStar -> Growth("pet.becameStar", listOf(name))
            next.stage != parts[1] -> Growth("pet.grewUp", listOf(name, "@stage:${next.stage}"))
            else -> Growth("pet.levelUp", listOf(name, next.level.toString()))
        }
    }

    fun seenKey(state: State): String = "${state.level}|${state.stage}|${if (state.star) 1 else 0}"
}

/**
 * The Star Pets strings, keyed like the web's kid dictionary (lib/i18n/kid.ts)
 * and copied into res/values*\/strings_pets.xml by scripts/sync-pet-strings.py:
 * `pet.mood.happy` is R.string.pet_mood_happy. Every argument is a String; an
 * argument written "@stage:teen" is itself looked up (the stage's name).
 */
object PetText {
    fun t(context: Context, key: String, vararg args: String): String {
        val id = context.resources.getIdentifier(key.replace('.', '_'), "string", context.packageName)
        if (id == 0) return key
        val resolved = args.map { a -> if (a.startsWith("@stage:")) t(context, "pet.stage.${a.removePrefix("@stage:")}") else a }
        return if (resolved.isEmpty()) context.getString(id) else context.getString(id, *resolved.toTypedArray())
    }

    fun species(context: Context, id: String) = t(context, "pet.species.$id")
    fun item(context: Context, id: String) = t(context, "pet.item.$id")
    fun stage(context: Context, stage: String, star: Boolean = false) = t(context, if (star) "pet.stage.star" else "pet.stage.$stage")
}

/** The pet routes: the kid's own (/api/kid/pet, kid token or parent token + childId) and the parent's (/api/pets). */
class PetApi(private val web: HttpClient, private val parentToken: () -> String?) {
    private val base = BuildConfig.WEB_API_BASE
    private val json = SupabaseModule.json

    sealed class ActionResult {
        data class Updated(val pet: StarPets.State, val asked: String?) : ActionResult()
        data object AskGrownUp : ActionResult()
        data object Failed : ActionResult()
    }

    suspend fun kidPet(auth: KidApi.Auth): StarPets.KidResponse? = runCatching {
        val url = "$base/api/kid/pet" + (auth.childId?.let { "?childId=${it.lowercase()}" } ?: "")
        val response = web.get(url) { header("Authorization", "Bearer ${auth.token}") }
        if (response.status.value != 200) null else json.decodeFromString(StarPets.KidResponse.serializer(), response.bodyAsText())
    }.getOrNull()

    /** adopt, rename, equip, collect_drop or ask. "ask" sends the parent a push and a Needs Your OK row (migration 039). */
    suspend fun act(auth: KidApi.Auth, body: Map<String, JsonElement>): ActionResult = runCatching {
        val full = JsonObject(body + (auth.childId?.let { mapOf("childId" to JsonPrimitive(it.lowercase())) } ?: emptyMap()))
        val response = web.post("$base/api/kid/pet") { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${auth.token}"); setBody(full) }
        val text = response.bodyAsText()
        if (response.status.value == 403 && errorCode(text) == "premium_required") return@runCatching ActionResult.AskGrownUp
        if (response.status.value != 200) return@runCatching ActionResult.Failed
        val decoded = json.decodeFromString(StarPets.KidResponse.serializer(), text)
        decoded.pet?.let { ActionResult.Updated(it, decoded.request?.species) } ?: ActionResult.Failed
    }.getOrElse { ActionResult.Failed }

    suspend fun familyPets(): StarPets.FamilyResponse? = runCatching {
        val token = parentToken() ?: return null
        val response = web.get("$base/api/pets") { header("Authorization", "Bearer $token") }
        if (response.status.value != 200) null else json.decodeFromString(StarPets.FamilyResponse.serializer(), response.bodyAsText())
    }.getOrNull()

    /** The per-kid switch. Never Premium-gated, and off deletes nothing. */
    suspend fun setEnabled(childId: String, enabled: Boolean): Boolean = post("/api/pets", mapOf("childId" to JsonPrimitive(childId.lowercase()), "enabled" to JsonPrimitive(enabled)))

    /** A parent's Not now on a kid's ask. Saying yes is buying Premium; the ask then closes itself. */
    suspend fun dismissRequest(requestId: String): Boolean = post("/api/pets/requests", mapOf("requestId" to JsonPrimitive(requestId.lowercase()), "action" to JsonPrimitive("dismiss")))

    private suspend fun post(path: String, body: Map<String, JsonElement>): Boolean = runCatching {
        val token = parentToken() ?: return false
        web.post("$base$path") { contentType(ContentType.Application.Json); header("Authorization", "Bearer $token"); setBody(JsonObject(body)) }.status.value in 200..299
    }.getOrDefault(false)

    private fun errorCode(text: String): String? = runCatching {
        val o = json.parseToJsonElement(text).jsonObject
        (o["error"] ?: o["message"])?.jsonPrimitive?.content
    }.getOrNull()
}
