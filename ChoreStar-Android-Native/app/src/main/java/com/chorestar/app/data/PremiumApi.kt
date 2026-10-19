package com.chorestar.app.data

import com.chorestar.app.BuildConfig
import io.ktor.client.HttpClient
import io.ktor.client.request.delete
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** A web route said no; `code` is its `error` field (premium_required, not_enough, not_met...). */
class WebApiError(val status: Int, val code: String?, message: String, val available: Int? = null) : Exception(message) {
    val premiumRequired: Boolean get() = status == 403 && code == "premium_required"
    val notEnough: Boolean get() = status == 409 && code == "not_enough"
}

// ── Money (GET/POST /api/money) ─────────────────────────────────────────────

@Serializable
data class MoneySplit(val enabled: Boolean = true, val spend: Int = 100, val save: Int = 0, val give: Int = 0) {
    val asSplit: MoneyRules.Split get() = MoneyRules.Split(spend, save, give)
}

@Serializable
data class JarState(val enabled: Boolean = false, val split: MoneySplit? = null, val spendCents: Int = 0, val saveCents: Int = 0, val giveCents: Int = 0)

@Serializable
data class MoneyBalance(
    val balanceCents: Int = 0, val owedCents: Int = 0, val spendableCents: Int = 0, val earnedCents: Int = 0,
    val paidCents: Int = 0, val deductedCents: Int = 0, val jars: JarState = JarState(),
)

@Serializable
data class MoneySchedule(val paydayWeekday: Int = 6, val nextPayday: String? = null, val allowanceCents: Int = 0, val thresholdPct: Int? = null, val interestBps: Int = 0)

@Serializable
data class Repayment(val id: String, val title: String, val amountCents: Int, val allowNegative: Boolean = false, val startedOn: String? = null)

@Serializable
data class MinutesItem(val id: String, val name: String = "", val rewardCents: Int = 0, val minutes: Int = 0)

@Serializable
data class MoneyMinutes(val balance: Int = 0, val earned: Int = 0, val used: Int = 0, val chores: List<MinutesItem> = emptyList(), val routines: List<MinutesItem> = emptyList(), val available: Boolean = true)

@Serializable
data class LedgerItem(val id: String, val kind: String, val jar: String? = null, val amountCents: Int = 0, val effectiveOn: String? = null, val note: String? = null, val createdAt: String? = null)

@Serializable
data class MoneyKid(
    val childId: String, val name: String = "",
    /** Absent for a free family: the server sends names only. */
    val balance: MoneyBalance? = null, val split: MoneySplit? = null, val schedule: MoneySchedule? = null,
    val repayments: List<Repayment> = emptyList(), val minutes: MoneyMinutes? = null, val ledger: List<LedgerItem> = emptyList(),
)

@Serializable
data class MoneyResponse(val premium: Boolean = false, val currencyCode: String = "USD", val timezone: String? = null, val ready: Boolean = true, val kids: List<MoneyKid> = emptyList())

// ── Live routines, AI drafts, step photos, calendar feeds ───────────────────

@Serializable
data class LiveRoutine(
    val routineId: String, val routineName: String = "", val routineColor: String? = null,
    val childId: String, val childName: String = "", val childColor: String? = null,
    val startedAt: String? = null, val updatedAt: String? = null, val locked: Boolean = true,
    val stepIndex: Int? = null, val stepsTotal: Int? = null, val stepTitle: String? = null,
)

@Serializable
data class LiveResponse(val items: List<LiveRoutine> = emptyList())

@Serializable
data class DraftStep(val title: String, val icon: String? = null, @SerialName("duration_seconds") val durationSeconds: Int? = null)

@Serializable
data class RoutineDraft(val name: String, val type: String = "custom", val icon: String? = null, val color: String? = null, val steps: List<DraftStep> = emptyList(), val tip: String? = null)

@Serializable
data class DraftResponse(val draft: RoutineDraft, val source: String = "ai")

@Serializable
data class StepPhoto(val path: String, val url: String? = null)

@Serializable
data class FeedChild(val id: String, val name: String = "")

@Serializable
data class CalendarFeed(val childId: String? = null, val https: String, val webcal: String, val google: String? = null, val createdAt: String? = null, val lastFetchedAt: String? = null)

@Serializable
data class CalendarFeedsResponse(val premium: Boolean = false, val children: List<FeedChild> = emptyList(), val feeds: List<CalendarFeed> = emptyList())

/**
 * The web app's parent routes for the Premium features added in 1.0.2. The
 * server owns every rule (plan checks, amounts, progress); this only carries
 * the parent's Supabase access token, like acceptInvite and the review calls.
 */
class PremiumApi(private val web: HttpClient, private val token: () -> String?) {
    private val base = BuildConfig.WEB_API_BASE
    private val json = SupabaseModule.json

    private fun bearer(): String = token() ?: throw WebApiError(401, "unauthorized", "Not signed in")

    suspend fun money(familyId: String): MoneyResponse =
        json.decodeFromString(MoneyResponse.serializer(), ok(web.get("$base/api/money?familyId=${familyId.lowercase()}") { header("Authorization", "Bearer ${bearer()}") }))

    /** One POST /api/money action; returns the kid as the server now sees them. */
    suspend fun moneyAction(action: String, childId: String, fields: Map<String, JsonElement>): MoneyKid? {
        val body = JsonObject(fields + mapOf("action" to JsonPrimitive(action), "childId" to JsonPrimitive(childId.lowercase())))
        val text = ok(web.post("$base/api/money") { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${bearer()}"); setBody(body) })
        return runCatching { json.parseToJsonElement(text).jsonObject["kid"]?.let { json.decodeFromJsonElement(MoneyKid.serializer(), it) } }.getOrNull()
    }

    suspend fun createChallenge(body: JsonObject) {
        ok(web.post("$base/api/challenges") { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${bearer()}"); setBody(body) })
    }

    suspend fun deliverChallenge(id: String) {
        ok(web.post("$base/api/challenges/${id.lowercase()}/deliver") { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${bearer()}"); setBody(JsonObject(emptyMap())) })
    }

    suspend fun liveRoutines(): List<LiveRoutine> =
        json.decodeFromString(LiveResponse.serializer(), ok(web.get("$base/api/routines/live") { header("Authorization", "Bearer ${bearer()}") })).items

    /** multipart file + childId; the JPEG is already downscaled. */
    suspend fun uploadStepPhoto(childId: String, jpeg: ByteArray): StepPhoto {
        val response = web.submitFormWithBinaryData(
            url = "$base/api/routines/step-photo",
            formData = formData {
                append("childId", childId.lowercase())
                append("file", jpeg, Headers.build { append(HttpHeaders.ContentType, "image/jpeg"); append(HttpHeaders.ContentDisposition, "filename=\"step.jpg\"") })
            },
        ) { header("Authorization", "Bearer ${bearer()}") }
        return json.decodeFromString(StepPhoto.serializer(), ok(response))
    }

    suspend fun buildRoutine(goal: String, childId: String?, routineType: String?): DraftResponse {
        val body = JsonObject(buildMap {
            put("goal", JsonPrimitive(goal.trim()))
            childId?.let { put("childId", JsonPrimitive(it.lowercase())) }
            put("routineType", routineType?.let { JsonPrimitive(it) } ?: JsonNull)
        })
        return json.decodeFromString(DraftResponse.serializer(), ok(web.post("$base/api/ai/build-routine") { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${bearer()}"); setBody(body) }))
    }

    suspend fun calendarFeeds(): CalendarFeedsResponse =
        json.decodeFromString(CalendarFeedsResponse.serializer(), ok(web.get("$base/api/calendar/feeds") { header("Authorization", "Bearer ${bearer()}") }))

    /** Turn on, or regenerate (a new token; the old URL stops working at once). */
    suspend fun enableCalendarFeed(childId: String?, timeZone: String?): CalendarFeed {
        val body = JsonObject(mapOf("childId" to (childId?.let { JsonPrimitive(it.lowercase()) } ?: JsonNull), "timeZone" to (timeZone?.let { JsonPrimitive(it) } ?: JsonNull)))
        val text = ok(web.post("$base/api/calendar/feeds") { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${bearer()}"); setBody(body) })
        return json.decodeFromJsonElement(CalendarFeed.serializer(), json.parseToJsonElement(text).jsonObject["feed"]!!)
    }

    suspend fun disableCalendarFeed(childId: String?) {
        ok(web.delete("$base/api/calendar/feeds?childId=${childId?.lowercase() ?: "family"}") { header("Authorization", "Bearer ${bearer()}") })
    }

    companion object {
        /** The body on success; a [WebApiError] carrying the route's error code otherwise. */
        suspend fun ok(response: HttpResponse): String {
            val text = response.bodyAsText()
            if (response.status.value in 200..299) return text
            throw errorFrom(response.status.value, text)
        }

        fun errorFrom(status: Int, body: String): WebApiError {
            val o = runCatching { SupabaseModule.json.parseToJsonElement(body).jsonObject }.getOrNull()
            val code = o?.get("error")?.let { runCatching { it.jsonPrimitive.content }.getOrNull() }
            val message = o?.get("message")?.let { runCatching { it.jsonPrimitive.content }.getOrNull() } ?: code ?: "Request failed ($status)"
            val available = (o?.get("availableCents") ?: o?.get("availableMinutes"))?.let { runCatching { it.jsonPrimitive.intOrNull }.getOrNull() }
            return WebApiError(status, code, message, available)
        }
    }
}
