package com.chorestar.app.data

import com.chorestar.app.BuildConfig
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * The free limits around a subscription ending (web lib/billing/plan-limits.ts,
 * GET/POST /api/plan-limits; iOS PlanLimitsCard). The server decides what is
 * paused; this decodes it, says which card to show, and sends a parent's pick
 * of what stays on.
 */
object PlanLimits {
    @Serializable data class Limits(val kids: Int = 3, val chores: Int = 20)
    @Serializable data class Ending(val endsAt: String? = null)
    @Serializable data class NamedId(val id: String, val name: String = "")
    @Serializable data class ChoreRow(val id: String, val name: String = "", val on: Boolean = false)
    @Serializable data class KidRow(val id: String, val name: String = "", val paused: Boolean = false, val chores: List<ChoreRow> = emptyList())
    @Serializable data class WouldPause(val kids: List<String> = emptyList(), val chores: Int = 0)

    /** The POST answer has no plan fields: it is always a free family. */
    @Serializable
    data class State(
        val premium: Boolean = false,
        val ending: Ending? = null,
        val limits: Limits = Limits(),
        val pausedKids: List<NamedId> = emptyList(),
        val pausedChores: Int = 0,
        val kids: List<KidRow> = emptyList(),
        val wouldPause: WouldPause = WouldPause(),
    )

    /** Which card Home shows, if any. */
    sealed class Card {
        /** Paid up with renewal off: what will pause, while there's still time. */
        data class Ending(val endsAt: String?, val kids: List<String>, val chores: Int) : Card()
        /** Premium ended: what is paused now. */
        data class Paused(val kids: List<String>, val chores: Int) : Card()
    }

    fun card(s: State): Card? = when {
        s.premium && s.ending != null ->
            if (s.wouldPause.kids.isEmpty() && s.wouldPause.chores == 0) null
            else Card.Ending(s.ending.endsAt, s.wouldPause.kids, s.wouldPause.chores)
        !s.premium && (s.pausedKids.isNotEmpty() || s.pausedChores > 0) -> Card.Paused(s.pausedKids.map { it.name }, s.pausedChores)
        else -> null
    }

    /** The chooser's starting point: what is on now. */
    fun initialPick(s: State): Pair<Set<String>, Set<String>> =
        s.kids.filter { !it.paused }.map { it.id }.toSet() to s.kids.flatMap { it.chores }.filter { it.on }.map { it.id }.toSet()

    /** Chores a save keeps on: only those of kids staying on. */
    fun keptChores(s: State, kids: Set<String>, chores: Set<String>): List<String> =
        s.kids.filter { it.id in kids }.flatMap { it.chores }.map { it.id }.filter { it in chores }
}

class PlanLimitsApi(private val web: HttpClient, private val token: () -> String?) {
    private val base = BuildConfig.WEB_API_BASE
    private val json = SupabaseModule.json

    private fun bearer(): String = token() ?: throw WebApiError(401, "unauthorized", "Not signed in")

    suspend fun load(): PlanLimits.State =
        json.decodeFromString(PlanLimits.State.serializer(), PremiumApi.ok(web.get("$base/api/plan-limits") { header("Authorization", "Bearer ${bearer()}") }))

    /** A free family's pick of up to 3 kids and 20 chores; the rest pause. Returns the new state. */
    suspend fun choose(kids: Collection<String>, chores: Collection<String>): PlanLimits.State {
        val body = JsonObject(mapOf(
            "kids" to JsonArray(kids.map { JsonPrimitive(it.lowercase()) }),
            "chores" to JsonArray(chores.map { JsonPrimitive(it.lowercase()) }),
        ))
        val text = PremiumApi.ok(web.post("$base/api/plan-limits") { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${bearer()}"); setBody(body) })
        return json.decodeFromString(PlanLimits.State.serializer(), text)
    }
}
