package com.chorestar.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/** Column names follow the Postgres schema exactly; see chorestar-nextjs/lib/supabase/database.types.ts. */

@Serializable
data class Profile(
    val id: String,
    val email: String = "",
    @SerialName("family_name") val familyName: String = "",
    @SerialName("subscription_type") val subscriptionType: String = "free",
    @SerialName("kid_login_code") val kidLoginCode: String? = null,
) {
    val isPremium: Boolean get() = subscriptionType == "premium" || subscriptionType == "lifetime"
}

@Serializable
data class Child(
    val id: String,
    @SerialName("user_id") val userId: String,
    val name: String,
    val age: Int? = null,
    @SerialName("avatar_color") val avatarColor: String? = null,
    /** A DiceBear PNG URL, never a signed storage URL. */
    @SerialName("avatar_url") val avatarUrl: String? = null,
    /** The DiceBear seed, or an emoji when the avatar is an emoji. */
    @SerialName("avatar_file") val avatarFile: String? = null,
    /** Object path in the private child-avatars bucket; shown through a signed URL. */
    @SerialName("avatar_photo_path") val avatarPhotoPath: String? = null,
    @SerialName("child_access_enabled") val childAccessEnabled: Boolean = false,
) {
    /** First letter of each word, at most two, uppercased. "Levi Siegel" → "LS". */
    val initials: String
        get() = name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.take(2)
            .joinToString("") { it.substring(0, 1).uppercase() }

    val avatarEmoji: String? get() = avatarFile?.takeIf { it.isNotBlank() && avatarUrl.isNullOrBlank() && !it.first().isLetterOrDigit() }
}

@Serializable
data class NewChildRow(
    val name: String,
    val age: Int,
    @SerialName("avatar_color") val avatarColor: String,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("avatar_file") val avatarFile: String? = null,
    @SerialName("user_id") val userId: String,
)

@Serializable
data class Chore(
    val id: String,
    /** Absent from the kid API's rows, which are always the signed-in kid's. */
    @SerialName("child_id") val childId: String = "",
    val name: String,
    @SerialName("reward_cents") val rewardCents: Int = 0,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("sort_order") val sortOrder: Int? = null,
    val icon: String? = null,
    val category: String? = null,
    val notes: String? = null,
    val color: String? = null,
    /** 0 = Sunday .. 6 = Saturday. Empty means never; every day is the default. */
    @SerialName("days_of_week") val daysOfWeek: List<Int> = listOf(0, 1, 2, 3, 4, 5, 6),
    @SerialName("requires_photo") val requiresPhoto: Boolean = false,
) {
    fun isDueOn(dayOfWeek: Int): Boolean = daysOfWeek.contains(dayOfWeek)
    val isEveryDay: Boolean get() = daysOfWeek.size == 7
}

@Serializable
data class NewChoreRow(
    val name: String,
    @SerialName("child_id") val childId: String,
    @SerialName("reward_cents") val rewardCents: Int,
    val category: String,
    val icon: String,
    val color: String,
    val notes: String? = null,
    @SerialName("days_of_week") val daysOfWeek: List<Int>,
    @SerialName("requires_photo") val requiresPhoto: Boolean,
)

@Serializable
data class ChoreCompletion(
    val id: String,
    @SerialName("chore_id") val choreId: String,
    @SerialName("day_of_week") val dayOfWeek: Int,
    @SerialName("week_start") val weekStart: String,
    @SerialName("completed_at") val completedAt: String? = null,
    /** pending = a kid ticked it and a parent has not said OK yet; approved counts. */
    val status: String = "approved",
    @SerialName("proof_path") val proofPath: String? = null,
) {
    val counts: Boolean get() = status == "approved"
    val isPending: Boolean get() = status == "pending"
}

@Serializable
data class NewCompletion(
    @SerialName("chore_id") val choreId: String,
    @SerialName("day_of_week") val dayOfWeek: Int,
    @SerialName("week_start") val weekStart: String,
)

@Serializable
data class FamilySettings(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("daily_reward_cents") val dailyRewardCents: Int? = null,
    @SerialName("weekly_bonus_cents") val weeklyBonusCents: Int? = null,
    /** "flat" (a daily rate for a perfect day) or "per_chore". */
    @SerialName("reward_mode") val rewardMode: String? = null,
    @SerialName("weekly_bonus_label") val weeklyBonusLabel: String? = null,
    @SerialName("currency_code") val currencyCode: String? = null,
    val timezone: String? = null,
    /** Live vacation window (migration 019); both null or both set. */
    @SerialName("vacation_starts_on") val vacationStartsOn: String? = null,
    @SerialName("vacation_ends_on") val vacationEndsOn: String? = null,
    @SerialName("require_approval") val requireApproval: Boolean = false,
    @SerialName("activity_push_enabled") val activityPushEnabled: Boolean = true,
    @SerialName("custom_theme") val customTheme: JsonElement? = null,
) {
    val isPerChore: Boolean get() = rewardMode == "per_chore"
}

@Serializable
data class FamilyMembership(
    @SerialName("user_id") val userId: String,
    @SerialName("family_id") val familyId: String,
)

/** Only the child ids; the hash never leaves the server side of the app. */
@Serializable
data class ChildPinRef(@SerialName("child_id") val childId: String)

@Serializable
data class ChildPinRow(
    @SerialName("child_id") val childId: String,
    @SerialName("pin_hash") val pinHash: String,
    @SerialName("pin_salt") val pinSalt: String,
    @SerialName("failed_attempts") val failedAttempts: Int = 0,
    @SerialName("locked_until") val lockedUntil: String? = null,
)

@Serializable
data class VacationPeriod(
    val id: String,
    @SerialName("starts_on") val startsOn: String,
    @SerialName("ends_on") val endsOn: String,
)

/** One kid tick waiting for a parent, as GET /api/chores/pending returns it (with a short-lived signed proof URL). */
@Serializable
data class PendingApproval(
    val id: String,
    val choreId: String,
    val choreName: String = "",
    val choreIcon: String? = null,
    val rewardCents: Int = 0,
    val childId: String? = null,
    val childName: String = "",
    val childColor: String? = null,
    val dayOfWeek: Int,
    val dayName: String = "",
    val weekStart: String,
    val completedAt: String? = null,
    val hasPhoto: Boolean = false,
    val photoUrl: String? = null,
)

@Serializable
data class PendingRedemption(
    val id: String,
    val childId: String,
    val childName: String = "",
    val childColor: String? = null,
    val itemId: String = "",
    val itemTitle: String = "",
    val itemEmoji: String? = null,
    val priceCents: Int = 0,
)

@Serializable
data class PendingResponse(val items: List<PendingApproval> = emptyList(), val redemptions: List<PendingRedemption> = emptyList())

@Serializable
data class FamilyMemberRow(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class FamilyCodeRow(@SerialName("user_id") val userId: String, val code: String)

@Serializable
data class RewardItem(
    val id: String,
    @SerialName("user_id") val userId: String,
    val title: String,
    val emoji: String? = null,
    @SerialName("price_cents") val priceCents: Int,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("sort_order") val sortOrder: Int = 0,
)

@Serializable
data class NewRewardItem(
    @SerialName("user_id") val userId: String,
    val title: String,
    val emoji: String?,
    @SerialName("price_cents") val priceCents: Int,
    @SerialName("sort_order") val sortOrder: Int,
)

@Serializable
data class RewardsUpsert(
    @SerialName("user_id") val userId: String,
    @SerialName("reward_mode") val rewardMode: String,
    @SerialName("daily_reward_cents") val dailyRewardCents: Int,
    @SerialName("weekly_bonus_cents") val weeklyBonusCents: Int,
    @SerialName("currency_code") val currencyCode: String,
    val timezone: String,
)
