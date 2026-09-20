package com.chorestar.app.data

import com.chorestar.app.BuildConfig
import com.chorestar.app.data.model.Chore
import com.chorestar.app.data.model.Routine
import io.ktor.client.HttpClient
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.patch
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
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * The web app's kid endpoints. A standalone kid session carries a kid token; a
 * parent using kid mode on their own phone carries their Supabase JWT plus the
 * child id (as a query item on GET, in the body otherwise), exactly as iOS's
 * kidAPI helper does. UUIDs go out lowercased.
 */
class KidApi(private val web: HttpClient) {
    private val base = BuildConfig.WEB_API_BASE

    /** Who is calling: a kid with a token, or a parent on behalf of one child. */
    data class Auth(val token: String, val childId: String?) {
        val isKid: Boolean get() = childId == null
    }

    @Serializable
    data class KidChild(
        val id: String,
        val name: String = "",
        @SerialName("avatar_color") val avatarColor: String? = null,
        @SerialName("avatar_url") val avatarUrl: String? = null,
        @SerialName("avatar_file") val avatarFile: String? = null,
        @SerialName("avatar_signed_url") val avatarSignedUrl: String? = null,
    )

    @Serializable
    data class VerifyResponse(val success: Boolean? = null, val child: KidChild? = null, val kidToken: String? = null, val error: String? = null)

    sealed class KidLoginError(message: String) : Exception(message) {
        data object Unreachable : KidLoginError("unreachable")
        data object TooMany : KidLoginError("too_many")
        class Wrong(message: String?) : KidLoginError(message ?: "wrong")
    }

    /** POST /api/child-pin/verify: the PIN is matched against every child in the family; the child comes back. */
    suspend fun verifyPin(familyCode: String, pin: String): Result<VerifyResponse> = runCatching {
        val response = web.post("$base/api/child-pin/verify") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("familyCode" to familyCode.lowercase().trim(), "pin" to pin))
        }
        val text = response.bodyAsText()
        if (response.status.value == 429) throw KidLoginError.TooMany
        val decoded = runCatching { SupabaseModule.json.decodeFromString(VerifyResponse.serializer(), text) }.getOrNull()
        if (response.status.value != 200 || decoded?.success != true || decoded.child == null) throw KidLoginError.Wrong(decoded?.error)
        decoded
    }.recoverCatching { e -> if (e is KidLoginError) throw e else throw KidLoginError.Unreachable }

    @Serializable
    data class ChildResponse(val child: KidChild, val theme: JsonElement? = null, val vacation: VacationWindow? = null)

    @Serializable
    data class VacationWindow(@SerialName("startsOn") val startsOn: String? = null, @SerialName("endsOn") val endsOn: String? = null,
        @SerialName("starts_on") val startsOnSnake: String? = null, @SerialName("ends_on") val endsOnSnake: String? = null) {
        val start: String? get() = startsOn ?: startsOnSnake
        val end: String? get() = endsOn ?: endsOnSnake
    }

    suspend fun child(token: String): ChildResponse =
        SupabaseModule.json.decodeFromString(ChildResponse.serializer(), get("$base/api/kid/child", Auth(token, null)))

    @Serializable
    data class KidCompletion(@SerialName("chore_id") val choreId: String, @SerialName("day_of_week") val dayOfWeek: Int, val status: String? = "approved")

    @Serializable
    data class ChoresResponse(val chores: List<Chore> = emptyList(), val completions: List<KidCompletion> = emptyList())

    suspend fun chores(token: String, weekStart: String): ChoresResponse =
        SupabaseModule.json.decodeFromString(ChoresResponse.serializer(), get("$base/api/kid/chores?weekStart=$weekStart", Auth(token, null)))

    @Serializable
    data class ToggleResponse(val success: Boolean = false, val completed: Boolean = false, val status: String? = null, val error: String? = null)

    /** Returns "pending" when the family (or a photo chore) wants a parent's OK first. */
    suspend fun toggle(token: String, choreId: String, dayOfWeek: Int, weekStart: String, completed: Boolean): ToggleResponse {
        val response = web.post("$base/api/kid/chores/toggle") {
            contentType(ContentType.Application.Json); header("Authorization", "Bearer $token")
            setBody(ToggleBody(choreId.lowercase(), dayOfWeek, weekStart, completed))
        }
        val text = response.bodyAsText()
        if (response.status.value !in 200..299) throw IllegalStateException(errorOf(text) ?: "Could not save")
        return SupabaseModule.json.decodeFromString(ToggleResponse.serializer(), text)
    }

    @Serializable private data class ToggleBody(val choreId: String, val dayOfWeek: Int, val weekStart: String, val completed: Boolean)

    @Serializable
    data class StatsResponse(
        val streak: Int = 0, val bestStreak: Int = 0, val todayPerfect: Boolean = false, val todayDue: Int = 0, val todayDone: Int = 0,
        val weekEarnedCents: Int = 0, val perfectDays: Int = 0, val currencyCode: String = "USD",
        val completions: List<CompletionRef> = emptyList(), val earnedBadges: List<AchievementBadge> = emptyList(),
    )

    suspend fun stats(token: String, weekStart: String, dayOfWeek: Int): StatsResponse =
        SupabaseModule.json.decodeFromString(StatsResponse.serializer(), get("$base/api/kid/stats?weekStart=$weekStart&dayOfWeek=$dayOfWeek", Auth(token, null)))

    suspend fun routines(token: String, childId: String): List<Routine> =
        SupabaseModule.json.decodeFromString(kotlinx.serialization.builtins.ListSerializer(Routine.serializer()), get("$base/api/routines?childId=${childId.lowercase()}", Auth(token, null)))

    suspend fun completeRoutine(token: String, routineId: String, childId: String, stepsCompleted: Int, stepsTotal: Int, durationSeconds: Int) {
        val response = web.post("$base/api/routines/${routineId.lowercase()}/complete") {
            contentType(ContentType.Application.Json); header("Authorization", "Bearer $token")
            setBody(RoutineCompleteBody(childId.lowercase(), stepsCompleted, stepsTotal, durationSeconds))
        }
        if (response.status.value !in 200..299) throw IllegalStateException("Couldn't save your routine. Check your connection.")
    }

    @Serializable private data class RoutineCompleteBody(val childId: String, val stepsCompleted: Int, val stepsTotal: Int, val durationSeconds: Int)

    // ── Wallet, goals, store (kid token, or parent token + childId) ──────────

    @Serializable
    data class GoalView(val id: String, val title: String, val emoji: String? = null, val targetCents: Int, val progressCents: Int = 0, val percent: Int = 0, val reached: Boolean = false, val status: String = "active")

    @Serializable
    data class StoreItemView(val id: String, val title: String, val emoji: String? = null, val priceCents: Int, val affordable: Boolean = false, val shortByCents: Int = 0, val pendingRequestId: String? = null)

    @Serializable
    data class WalletView(
        val childId: String = "", val owedCents: Int = 0, val earnedCents: Int = 0, val paidCents: Int = 0, val currencyCode: String = "USD",
        val goal: GoalView? = null, val reachedGoals: List<GoalView> = emptyList(), val store: List<StoreItemView> = emptyList(),
    )

    suspend fun wallet(auth: Auth): WalletView =
        SupabaseModule.json.decodeFromString(WalletView.serializer(), get("$base/api/kid/wallet" + (auth.childId?.let { "?childId=${it.lowercase()}" } ?: ""), auth))

    suspend fun createGoal(auth: Auth, title: String, targetCents: Int, emoji: String?): Result<Unit> =
        send(auth, "post", "$base/api/kid/goals", buildMap { put("title", JsonPrimitive(title)); put("targetCents", JsonPrimitive(targetCents)); emoji?.let { put("emoji", JsonPrimitive(it)) } })

    suspend fun updateGoal(auth: Auth, goalId: String, title: String, targetCents: Int, emoji: String?): Result<Unit> =
        send(auth, "patch", "$base/api/kid/goals", buildMap { put("goalId", JsonPrimitive(goalId)); put("title", JsonPrimitive(title)); put("targetCents", JsonPrimitive(targetCents)); emoji?.let { put("emoji", JsonPrimitive(it)) } })

    suspend fun archiveGoal(auth: Auth, goalId: String): Result<Unit> =
        send(auth, "patch", "$base/api/kid/goals", mapOf("goalId" to JsonPrimitive(goalId), "action" to JsonPrimitive("archive")))

    suspend fun redeem(auth: Auth, itemId: String): Result<Unit> = send(auth, "post", "$base/api/kid/store/redeem", mapOf("itemId" to JsonPrimitive(itemId)))

    suspend fun cancelRedeem(auth: Auth, redemptionId: String): Result<Unit> =
        send(auth, "post", "$base/api/kid/store/redeem", mapOf("redemptionId" to JsonPrimitive(redemptionId), "action" to JsonPrimitive("cancel")))

    /** Photo chores: the row is created pending with the proof attached. */
    suspend fun submitProof(auth: Auth, choreId: String, dayOfWeek: Int, weekStart: String, jpeg: ByteArray): Result<Unit> = runCatching {
        val response = web.submitFormWithBinaryData(
            url = "$base/api/kid/chores/proof",
            formData = formData {
                append("choreId", choreId.lowercase()); append("dayOfWeek", dayOfWeek.toString()); append("weekStart", weekStart)
                auth.childId?.let { append("childId", it.lowercase()) }
                append("file", jpeg, Headers.build { append(HttpHeaders.ContentType, "image/jpeg"); append(HttpHeaders.ContentDisposition, "filename=\"proof.jpg\"") })
            },
        ) { header("Authorization", "Bearer ${auth.token}") }
        if (response.status.value !in 200..299) throw IllegalStateException(errorOf(response.bodyAsText()) ?: "Couldn't upload the photo")
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private suspend fun get(url: String, auth: Auth): String {
        val response = web.get(url) { header("Authorization", "Bearer ${auth.token}") }
        val text = response.bodyAsText()
        if (response.status.value !in 200..299) throw IllegalStateException(errorOf(text) ?: "Request failed (${response.status.value})")
        return text
    }

    private suspend fun send(auth: Auth, method: String, url: String, body: Map<String, JsonElement>): Result<Unit> = runCatching {
        val full = JsonObject(body + (auth.childId?.let { mapOf("childId" to JsonPrimitive(it.lowercase())) } ?: emptyMap()))
        val response: HttpResponse = if (method == "patch") web.patch(url) { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${auth.token}"); setBody(full) }
        else web.post(url) { contentType(ContentType.Application.Json); header("Authorization", "Bearer ${auth.token}"); setBody(full) }
        if (response.status.value !in 200..299) throw IllegalStateException(errorOf(response.bodyAsText()) ?: "Request failed (${response.status.value})")
    }

    private fun errorOf(body: String): String? = runCatching {
        val o = SupabaseModule.json.parseToJsonElement(body).jsonObject
        o["message"]?.jsonPrimitive?.content ?: o["error"]?.jsonPrimitive?.content
    }.getOrNull()
}

/** A standalone kid session, persisted for eight hours like iOS's kid_mode_session. */
@Serializable
data class KidSession(
    val childId: String,
    val childName: String,
    val avatarColor: String? = null,
    val avatarUrl: String? = null,
    val avatarFile: String? = null,
    val avatarSignedUrl: String? = null,
    val kidToken: String,
    val familyCode: String,
    val expiresAtMillis: Long,
) {
    val isExpired: Boolean get() = expiresAtMillis <= System.currentTimeMillis()
}
