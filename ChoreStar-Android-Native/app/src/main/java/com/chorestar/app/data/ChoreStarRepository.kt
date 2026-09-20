package com.chorestar.app.data

import com.chorestar.app.BuildConfig
import com.chorestar.app.data.model.Child
import com.chorestar.app.data.model.ChildPinRef
import com.chorestar.app.data.model.ChildPinRow
import com.chorestar.app.data.model.Chore
import com.chorestar.app.data.model.ChoreCompletion
import com.chorestar.app.data.model.FamilyCodeRow
import com.chorestar.app.data.model.FamilyMemberRow
import com.chorestar.app.data.model.FamilyMembership
import com.chorestar.app.data.model.NewRewardItem
import com.chorestar.app.data.model.RewardItem
import com.chorestar.app.data.model.RewardsUpsert
import kotlinx.serialization.json.JsonObject
import com.chorestar.app.data.model.FamilySettings
import com.chorestar.app.data.model.NewChildRow
import com.chorestar.app.data.model.NewChoreRow
import com.chorestar.app.data.model.NewCompletion
import com.chorestar.app.data.model.PendingApproval
import com.chorestar.app.data.model.PendingResponse
import com.chorestar.app.data.model.Profile
import com.chorestar.app.data.model.VacationPeriod
import io.ktor.client.request.get
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import io.ktor.client.HttpClient
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.util.UUID
import kotlin.time.Duration.Companion.hours

/** Everything the parent side reads and writes. One instance per app. */
class ChoreStarRepository(
    private val supabase: SupabaseClient,
    private val web: HttpClient,
) {
    val sessionStatus: StateFlow<SessionStatus> get() = supabase.auth.sessionStatus

    val currentUserId: String? get() = supabase.auth.currentUserOrNull()?.id
    val currentEmail: String? get() = supabase.auth.currentUserOrNull()?.email
    private val accessToken: String? get() = supabase.auth.currentAccessTokenOrNull()

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
        return Result.failure(IllegalStateException(errorMessage(text) ?: "Could not create the account (${response.status.value})"))
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

    /** Which children have a kid-login PIN. RLS only returns the family's rows. */
    suspend fun childIdsWithPin(childIds: List<String>): Set<String> {
        if (childIds.isEmpty()) return emptySet()
        return supabase.from("child_pins")
            .select(columns = io.github.jan.supabase.postgrest.query.Columns.list("child_id")) { filter { isIn("child_id", childIds) } }
            .decodeList<ChildPinRef>()
            .map { it.childId }
            .toSet()
    }

    // ── Completions ──────────────────────────────────────────────────────────

    suspend fun addCompletion(choreId: String, dayOfWeek: Int, weekStart: String): ChoreCompletion =
        supabase.from("chore_completions")
            .insert(NewCompletion(choreId, dayOfWeek, weekStart)) { select() }
            .decodeSingle()

    suspend fun removeCompletion(id: String) {
        supabase.from("chore_completions").delete { filter { eq("id", id) } }
    }

    /** Bulk catch-up: cells that already exist are left alone (unique on chore, day, week). */
    suspend fun addCompletions(rows: List<NewCompletion>): List<ChoreCompletion> {
        if (rows.isEmpty()) return emptyList()
        return supabase.from("chore_completions")
            .upsert(rows) { onConflict = "chore_id,day_of_week,week_start"; ignoreDuplicates = true; select() }
            .decodeList()
    }

    // ── Approvals (the web app owns the rule, so both go through it) ─────────

    suspend fun pendingApprovals(): List<PendingApproval> {
        val token = accessToken ?: return emptyList()
        val response = web.get("${BuildConfig.WEB_API_BASE}/api/chores/pending") { header("Authorization", "Bearer $token") }
        if (response.status.value != 200) return emptyList()
        return SupabaseModule.json.decodeFromString(PendingResponse.serializer(), response.bodyAsText()).items
    }

    /** approve → status approved (and the server pings the all-done push); reject → the row and its proof are deleted. */
    suspend fun reviewCompletion(completionId: String, approve: Boolean) {
        val token = accessToken ?: error("Not signed in")
        val response = web.post("${BuildConfig.WEB_API_BASE}/api/chores/approve") {
            contentType(ContentType.Application.Json)
            header("Authorization", "Bearer $token")
            setBody(ReviewBody(completionId.lowercase(), if (approve) "approve" else "reject"))
        }
        if (response.status.value !in 200..299) error(errorMessage(response.bodyAsText()) ?: "Could not update (${response.status.value})")
    }

    // ── Vacation ─────────────────────────────────────────────────────────────

    /** Upsert on user_id: an iOS- or Android-created family may have no settings row yet. */
    suspend fun setVacation(userId: String, startsOn: String, endsOn: String, previous: Pair<String, String>?) {
        supabase.from("family_settings").upsert(VacationUpsert(userId, startsOn, endsOn)) { onConflict = "user_id" }
        runCatching {
            if (previous != null) {
                supabase.from("vacation_periods").update({ set("starts_on", startsOn); set("ends_on", endsOn) }) {
                    filter { eq("user_id", userId); eq("starts_on", previous.first); eq("ends_on", previous.second) }
                }
            } else {
                supabase.from("vacation_periods").insert(VacationPeriodInsert(userId, startsOn, endsOn))
            }
        }
    }

    /** Clears the live window; history is deleted if it never started, trimmed to yesterday if it is mid-way. */
    suspend fun clearVacation(userId: String, window: Pair<String, String>?) {
        supabase.from("family_settings").update({
            set("vacation_starts_on", null as String?)
            set("vacation_ends_on", null as String?)
        }) { filter { eq("user_id", userId) } }
        val (start, end) = window ?: return
        val today = Dates.today()
        runCatching {
            val s = java.time.LocalDate.parse(start)
            val e = java.time.LocalDate.parse(end)
            when {
                s.isAfter(today) -> supabase.from("vacation_periods").delete { filter { eq("user_id", userId); eq("starts_on", start); eq("ends_on", end) } }
                !e.isBefore(today) -> supabase.from("vacation_periods").update({ set("ends_on", today.minusDays(1).toString()) }) {
                    filter { eq("user_id", userId); eq("starts_on", start); eq("ends_on", end) }
                }
                else -> Unit
            }
        }
    }

    /** Past and present windows; a missing table just means no history. */
    suspend fun vacationPeriods(userId: String): List<VacationPeriod> = runCatching {
        supabase.from("vacation_periods").select { filter { eq("user_id", userId) } }.decodeList<VacationPeriod>()
    }.getOrDefault(emptyList())

    // ── Children ─────────────────────────────────────────────────────────────

    suspend fun createChild(userId: String, name: String, age: Int, color: String, avatarUrl: String?, avatarFile: String?): Child =
        supabase.from("children")
            .insert(NewChildRow(name, age, color, avatarUrl, avatarFile, userId)) { select() }
            .decodeSingle()

    /**
     * Picking a DiceBear or emoji avatar retires an uploaded photo, as on iOS;
     * the photo object is deleted after the row no longer points at it.
     */
    suspend fun updateChild(child: Child, name: String, age: Int, color: String, avatarUrl: String?, avatarFile: String?, retirePhoto: Boolean) {
        supabase.from("children").update({
            set("name", name)
            set("age", age)
            set("avatar_color", color)
            set("avatar_url", avatarUrl)
            set("avatar_file", avatarFile)
            if (retirePhoto) set("avatar_photo_path", null as String?)
            set("updated_at", Instant.now().toString())
        }) { filter { eq("id", child.id) } }
        if (retirePhoto) child.avatarPhotoPath?.let { runCatching { avatars.delete(listOf(it)) } }
    }

    /** No client-side cascade: chores and completions go with the row through the FK. */
    suspend fun deleteChild(childId: String) {
        supabase.from("children").delete { filter { eq("id", childId) } }
    }

    // ── Kid-login PIN (direct table upsert, the same hash iOS writes) ───────

    suspend fun setChildPin(childId: String, pin: String) {
        require(pin.length in 4..6 && pin.all { it.isDigit() }) { "PIN must be 4-6 digits" }
        val salt = ByteArray(32).also { SecureRandom().nextBytes(it) }.toHex()
        val hash = MessageDigest.getInstance("SHA-256").digest((pin + salt).toByteArray(Charsets.UTF_8)).toHex()
        supabase.from("child_pins").upsert(ChildPinRow(childId, hash, salt)) { onConflict = "child_id" }
    }

    suspend fun removeChildPin(childId: String) {
        supabase.from("child_pins").delete { filter { eq("child_id", childId) } }
    }

    // ── Avatar photos (private bucket, signed URLs) ──────────────────────────

    private val avatars get() = supabase.storage.from("child-avatars")

    /** {owner}/{child}/{uuid}.jpg, lowercased: the owner id is children.user_id or RLS rejects the write. */
    suspend fun uploadChildAvatar(child: Child, jpeg: ByteArray): String {
        val path = "${child.userId}/${child.id}/${UUID.randomUUID()}.jpg".lowercase()
        avatars.upload(path, jpeg) { upsert = true; contentType = ContentType.Image.JPEG }
        supabase.from("children").update({
            set("avatar_photo_path", path)
            set("avatar_url", null as String?)
            set("updated_at", Instant.now().toString())
        }) { filter { eq("id", child.id) } }
        child.avatarPhotoPath?.let { runCatching { avatars.delete(listOf(it)) } }
        return path
    }

    suspend fun removeChildAvatarPhoto(child: Child) {
        val path = child.avatarPhotoPath ?: return
        supabase.from("children").update({
            set("avatar_photo_path", null as String?)
            set("avatar_url", null as String?)
            set("updated_at", Instant.now().toString())
        }) { filter { eq("id", child.id) } }
        runCatching { avatars.delete(listOf(path)) }
    }

    private val signedUrls = HashMap<String, Pair<String, Long>>()

    /** One-hour signed URL, cached and refreshed a minute early. */
    suspend fun signedAvatarUrl(path: String): String? {
        val now = System.currentTimeMillis()
        signedUrls[path]?.let { (url, expires) -> if (expires - 60_000 > now) return url }
        return runCatching { avatars.createSignedUrl(path, 1.hours) }.getOrNull()?.also {
            signedUrls[path] = it to now + 3_600_000
        }
    }

    // ── Chores ───────────────────────────────────────────────────────────────

    suspend fun createChore(row: NewChoreRow): Chore =
        supabase.from("chores").insert(row) { select() }.decodeSingle()

    suspend fun updateChore(choreId: String, row: NewChoreRow) {
        supabase.from("chores").update({
            set("name", row.name)
            set("child_id", row.childId)
            set("reward_cents", row.rewardCents)
            set("category", row.category)
            set("icon", row.icon)
            set("color", row.color)
            set("notes", row.notes)
            set("days_of_week", row.daysOfWeek)
            set("requires_photo", row.requiresPhoto)
            set("updated_at", Instant.now().toString())
        }) { filter { eq("id", choreId) } }
    }

    suspend fun deleteChore(choreId: String) {
        supabase.from("chores").delete { filter { eq("id", choreId) } }
    }

    /** Claude-backed suggestions from the web app; null on any failure so the caller falls back to the local engine. */
    suspend fun aiSuggestions(childName: String, childAge: Int?, existing: List<String>, completionRate: Double): List<ChoreSuggestion>? {
        val token = accessToken ?: return null
        return runCatching {
            val response = web.post("${BuildConfig.WEB_API_BASE}/api/ai/suggest-chores") {
                contentType(ContentType.Application.Json)
                header("Authorization", "Bearer $token")
                setBody(SuggestBody(childName, childAge, existing, completionRate.coerceIn(0.0, 100.0)))
            }
            if (response.status.value != 200) return null
            SupabaseModule.json.decodeFromString(SuggestResponse.serializer(), response.bodyAsText())
                .suggestions.map { ChoreSuggestion(it.name, it.category, it.icon, it.rewardCents, it.reason) }
                .ifEmpty { null }
        }.getOrNull()
    }

    // ── Family settings ──────────────────────────────────────────────────────

    /** These three are plain updates on iOS and silently no-op without a row; upserting is safer for a fresh family. */
    suspend fun setRequireApproval(userId: String, on: Boolean) =
        supabase.from("family_settings").update({ set("require_approval", on) }) { filter { eq("user_id", userId) } }

    suspend fun setActivityPush(userId: String, on: Boolean) =
        supabase.from("family_settings").update({ set("activity_push_enabled", on) }) { filter { eq("user_id", userId) } }

    /** Read-merge-write: the web keeps other keys (whatsNewSeenVersion…) in the same JSON. */
    suspend fun setCustomTheme(userId: String, merged: JsonObject) =
        supabase.from("family_settings").update({ set("custom_theme", merged) }) { filter { eq("user_id", userId) } }

    suspend fun updateRewards(row: RewardsUpsert) =
        supabase.from("family_settings").upsert(row) { onConflict = "user_id" }

    // ── Family sharing (family_codes + family_members, no invites table, no expiry) ──

    suspend fun familyJoinCode(userId: String): String? =
        supabase.from("family_codes").select { filter { eq("user_id", userId) }; limit(1) }.decodeList<FamilyCodeRow>().firstOrNull()?.code

    suspend fun createJoinCode(userId: String): String {
        familyJoinCode(userId)?.let { return it }
        val alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
        val code = (1..8).map { alphabet[SecureRandom().nextInt(alphabet.length)] }.joinToString("")
        supabase.from("family_codes").insert(FamilyCodeRow(userId, code))
        return code
    }

    /** Returns the owner's user id, or a message when the code is wrong or already used. */
    suspend fun joinFamily(code: String): Result<String> {
        val uid = currentUserId ?: return Result.failure(IllegalStateException("Not signed in"))
        val normalized = code.trim().lowercase()
        val owner = supabase.from("family_codes").select { filter { eq("code", normalized) }; limit(1) }.decodeList<FamilyCodeRow>().firstOrNull()?.userId
            ?: return Result.failure(JoinError.NotFound)
        if (owner == uid) return Result.failure(JoinError.OwnFamily)
        return runCatching {
            supabase.from("family_members").insert(FamilyMembership(uid, owner))
            owner
        }.recoverCatching { e -> if (e.message?.contains("23505") == true || e.message?.contains("duplicate", true) == true) throw JoinError.Already else throw e }
    }

    suspend fun familyMembers(ownerId: String): List<FamilyMemberRow> =
        supabase.from("family_members").select { filter { eq("family_id", ownerId) } }.decodeList()

    suspend fun removeFamilyMember(memberRowId: String) {
        supabase.from("family_members").delete { filter { eq("id", memberRowId) } }
    }

    suspend fun leaveFamily() {
        val uid = currentUserId ?: return
        supabase.from("family_members").delete { filter { eq("user_id", uid) } }
    }

    /** iOS fetches or mints it through the web app so the 8-hex format stays server-owned. */
    suspend fun materializeKidLoginCode(): String? {
        val token = accessToken ?: return null
        return runCatching {
            val response = web.get("${BuildConfig.WEB_API_BASE}/api/kid-login-code") { header("Authorization", "Bearer $token") }
            if (response.status.value != 200) null
            else SupabaseModule.json.parseToJsonElement(response.bodyAsText()).jsonObject["code"]?.jsonPrimitive?.content
        }.getOrNull()
    }

    // ── Account ──────────────────────────────────────────────────────────────

    /** Same as iOS: the current password is asked for but GoTrue only needs the new one. */
    suspend fun changePassword(newPassword: String) {
        supabase.auth.updateUser { password = newPassword }
    }

    /** POST /api/account/delete with {confirm:"DELETE"}; the server cascades everything. */
    suspend fun deleteAccount(): Result<Unit> {
        val token = accessToken ?: return Result.failure(IllegalStateException("Your session expired. Please sign in again and retry."))
        val response = web.post("${BuildConfig.WEB_API_BASE}/api/account/delete") {
            contentType(ContentType.Application.Json)
            header("Authorization", "Bearer $token")
            setBody(mapOf("confirm" to "DELETE"))
        }
        val text = response.bodyAsText()
        return if (response.status.value in 200..299) Result.success(Unit)
        else Result.failure(IllegalStateException(errorMessage(text) ?: if (response.status.value == 429) "Too many attempts. Please wait a few minutes and try again." else "We couldn't delete your account. Please try again."))
    }

    // ── Reward store ─────────────────────────────────────────────────────────

    suspend fun rewardItems(userId: String): List<RewardItem> =
        supabase.from("reward_items").select { filter { eq("user_id", userId); eq("is_active", true) }; order("sort_order", Order.ASCENDING) }.decodeList()

    suspend fun addRewardItem(row: NewRewardItem): RewardItem =
        supabase.from("reward_items").insert(row) { select() }.decodeSingle()

    suspend fun updateRewardItemPrice(id: String, cents: Int) =
        supabase.from("reward_items").update({ set("price_cents", cents); set("updated_at", Instant.now().toString()) }) { filter { eq("id", id) } }

    suspend fun removeRewardItem(id: String) =
        supabase.from("reward_items").update({ set("is_active", false) }) { filter { eq("id", id) } }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun errorMessage(body: String): String? = runCatching {
        SupabaseModule.json.parseToJsonElement(body).jsonObject["error"]?.jsonPrimitive?.content
    }.getOrNull()

    private fun ByteArray.toHex() = joinToString("") { "%02x".format(it) }

    @Serializable
    private data class SignupBody(val email: String, val password: String, val familyName: String)

    @Serializable
    private data class ReviewBody(val completionId: String, val action: String)

    sealed class JoinError(message: String) : Exception(message) {
        data object NotFound : JoinError("not_found")
        data object OwnFamily : JoinError("own_family")
        data object Already : JoinError("already")
    }

    @Serializable
    private data class VacationUpsert(
        @SerialName("user_id") val userId: String,
        @SerialName("vacation_starts_on") val startsOn: String,
        @SerialName("vacation_ends_on") val endsOn: String,
    )

    @Serializable
    private data class VacationPeriodInsert(
        @SerialName("user_id") val userId: String,
        @SerialName("starts_on") val startsOn: String,
        @SerialName("ends_on") val endsOn: String,
    )

    @Serializable
    private data class SuggestBody(val childName: String, val childAge: Int?, val existingChoreNames: List<String>, val completionRate: Double)

    @Serializable
    private data class SuggestResponse(val suggestions: List<SuggestItem> = emptyList())

    @Serializable
    private data class SuggestItem(val name: String, val category: String = "", val icon: String = "📝", val rewardCents: Int = 0, val reason: String = "")
}
