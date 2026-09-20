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
    @SerialName("child_id") val childId: String,
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
