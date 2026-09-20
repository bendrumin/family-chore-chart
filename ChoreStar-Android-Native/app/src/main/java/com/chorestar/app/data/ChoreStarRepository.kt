package com.chorestar.app.data

import com.chorestar.app.BuildConfig
import com.chorestar.app.data.model.Child
import com.chorestar.app.data.model.Chore
import com.chorestar.app.data.model.ChoreCompletion
import com.chorestar.app.data.model.FamilyMembership
import com.chorestar.app.data.model.FamilySettings
import com.chorestar.app.data.model.NewCompletion
import com.chorestar.app.data.model.Profile
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import io.ktor.client.HttpClient
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Everything the parent side reads and writes. One instance per app. */
class ChoreStarRepository(
    private val supabase: SupabaseClient,
    private val web: HttpClient,
) {
    val sessionStatus: StateFlow<SessionStatus> get() = supabase.auth.sessionStatus

    val currentUserId: String? get() = supabase.auth.currentUserOrNull()?.id
    val currentEmail: String? get() = supabase.auth.currentUserOrNull()?.email

    // ── Auth ────────────────────────────────────────────────────────────────

    suspend fun signIn(email: String, password: String) {
        supabase.auth.signInWith(Email) {
            this.email = email.trim()
            this.password = password
        }
    }

    /**
     * Accounts are created through the web app, never with auth.signUp from a
     * client: the profiles row needs the service-role key and there is no
     * database trigger. Returns a message for the person if the server said no.
     */
    suspend fun signUp(email: String, password: String, familyName: String): Result<Unit> {
        val response = web.post("${BuildConfig.WEB_API_BASE}/api/auth/signup") {
            contentType(ContentType.Application.Json)
            setBody(SignupBody(email.trim(), password, familyName.trim()))
        }
        val text = response.bodyAsText()
        if (response.status.value in 200..299) return Result.success(Unit)
        val message = runCatching {
            SupabaseModule.json.parseToJsonElement(text).jsonObject["error"]?.jsonPrimitive?.content
        }.getOrNull() ?: "Could not create the account (${response.status.value})"
        return Result.failure(IllegalStateException(message))
    }

    suspend fun sendPasswordReset(email: String) = supabase.auth.resetPasswordForEmail(email.trim())

    suspend fun signOut() = supabase.auth.signOut()

    // ── Family scope ─────────────────────────────────────────────────────────

    /**
     * The user id the family's rows hang off. A co-parent who joined through a
     * family invite reads and writes the owner's rows, so their membership row
     * points at the owner; everyone else is their own family.
     */
    suspend fun effectiveUserId(): String {
        val uid = currentUserId ?: error("Not signed in")
        val membership = supabase.from("family_members")
            .select { filter { eq("user_id", uid) }; limit(1) }
            .decodeList<FamilyMembership>()
            .firstOrNull()
        return membership?.familyId ?: uid
    }

    // ── Reads ────────────────────────────────────────────────────────────────

    suspend fun profile(userId: String): Profile? =
        supabase.from("profiles").select { filter { eq("id", userId) } }.decodeSingleOrNull()

    suspend fun children(userId: String): List<Child> =
        supabase.from("children")
            .select { filter { eq("user_id", userId) }; order("created_at", Order.ASCENDING) }
            .decodeList()

    suspend fun chores(childIds: List<String>): List<Chore> {
        if (childIds.isEmpty()) return emptyList()
        return supabase.from("chores")
            .select {
                filter { isIn("child_id", childIds); eq("is_active", true) }
                order("sort_order", Order.ASCENDING, nullsFirst = false)
            }
            .decodeList()
    }

    suspend fun completions(choreIds: List<String>, weekStart: String): List<ChoreCompletion> {
        if (choreIds.isEmpty()) return emptyList()
        return supabase.from("chore_completions")
            .select { filter { isIn("chore_id", choreIds); eq("week_start", weekStart) } }
            .decodeList()
    }

    suspend fun familySettings(userId: String): FamilySettings? =
        supabase.from("family_settings").select { filter { eq("user_id", userId) } }.decodeSingleOrNull()

    // ── Writes ───────────────────────────────────────────────────────────────

    suspend fun addCompletion(choreId: String, dayOfWeek: Int, weekStart: String): ChoreCompletion =
        supabase.from("chore_completions")
            .insert(NewCompletion(choreId, dayOfWeek, weekStart)) { select() }
            .decodeSingle()

    suspend fun removeCompletion(id: String) {
        supabase.from("chore_completions").delete { filter { eq("id", id) } }
    }

    @Serializable
    private data class SignupBody(val email: String, val password: String, val familyName: String)
}
