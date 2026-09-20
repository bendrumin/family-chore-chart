package com.chorestar.app.data

import androidx.annotation.StringRes
import com.chorestar.app.R
import com.chorestar.app.data.model.Chore
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.LocalDate

/** achievement_badges rows; earned_at is set by the server. */
@Serializable
data class AchievementBadge(
    val id: String = "",
    @SerialName("child_id") val childId: String,
    @SerialName("badge_type") val badgeType: String,
    @SerialName("badge_name") val badgeName: String = "",
    @SerialName("badge_description") val badgeDescription: String = "",
    @SerialName("badge_icon") val badgeIcon: String = "",
    @SerialName("earned_at") val earnedAt: String? = null,
)

/** A completion reduced to what the engine needs, from any source (Postgres or /api/kid/stats). */
@Serializable
data class CompletionRef(
    @SerialName("chore_id") val choreId: String,
    @SerialName("week_start") val weekStart: String,
    @SerialName("day_of_week") val dayOfWeek: Int,
    val status: String = "approved",
) {
    val date: LocalDate get() = LocalDate.parse(weekStart).plusDays(dayOfWeek.toLong())
}

enum class Rarity(@StringRes val label: Int, val colors: List<Long>) {
    Common(R.string.rarity_common, listOf(0xFF9CA3AF, 0xFF6B7280)),
    Rare(R.string.rarity_rare, listOf(0xFF3B82F6, 0xFF2563EB)),
    Epic(R.string.rarity_epic, listOf(0xFF8B5CF6, 0xFF7C3AED)),
    Legendary(R.string.rarity_legendary, listOf(0xFFFACC15, 0xFFF97316)),
}

sealed interface Requirement {
    data object FirstChore : Requirement
    data class TotalCount(val n: Int) : Requirement
    data object WeekComplete : Requirement
    data class Streak(val days: Int) : Requirement
    data class CategoryCount(val category: AchievementCategory, val n: Int) : Requirement
}

enum class AchievementCategory(val aliases: Set<String>) {
    Household(setOf("household", "household_chores", "bedroom", "kitchen", "bathroom", "general", "outdoor", "pets")),
    Learning(setOf("learning", "learning_education", "homework", "reading")),
    Creative(setOf("creative", "creative_time")),
    Physical(setOf("physical", "physical_activity", "games_play"));

    fun matches(category: String?): Boolean = category?.lowercase() in aliases
}

data class BadgeDef(val id: String, @StringRes val name: Int, @StringRes val description: Int, val icon: String, val rarity: Rarity, val requirement: Requirement, val englishName: String, val englishDescription: String)

data class BadgeProgress(val def: BadgeDef, val current: Int, val required: Int, val earned: Boolean, val earnedAt: String?) {
    val ratio: Float get() = if (required == 0) 1f else (current.toFloat() / required).coerceIn(0f, 1f)
}

/** The ten badges, shared with iOS Models/Achievements.swift and the web lib/constants/achievements.ts. */
object Achievements {
    val all = listOf(
        BadgeDef("first_steps", R.string.first_steps_058bf, R.string.complete_your_first_chore_dafc4, "👶", Rarity.Common, Requirement.FirstChore, "First Steps", "Complete your first chore"),
        BadgeDef("week_warrior", R.string.week_warrior_fd40b, R.string.complete_all_chores_for_a_full_week_8cdd2, "⚔️", Rarity.Rare, Requirement.WeekComplete, "Week Warrior", "Complete all chores for a full week"),
        BadgeDef("streak_master", R.string.streak_master_f9535, R.string.maintain_a_10_day_streak_31f1a, "🔥", Rarity.Epic, Requirement.Streak(10), "Streak Master", "Maintain a 10-day streak"),
        BadgeDef("perfect_week", R.string.perfect_week_6f923, R.string.complete_every_single_chore_for_a_week_67a5c, "⭐", Rarity.Legendary, Requirement.WeekComplete, "Perfect Week", "Complete every single chore for a week"),
        BadgeDef("family_helper", R.string.family_helper_cafdb, R.string.complete_50_household_chores_d506a, "🏠", Rarity.Rare, Requirement.CategoryCount(AchievementCategory.Household, 50), "Family Helper", "Complete 50 household chores"),
        BadgeDef("little_scholar", R.string.little_scholar_05d38, R.string.complete_25_learning_activities_95544, "📚", Rarity.Rare, Requirement.CategoryCount(AchievementCategory.Learning, 25), "Little Scholar", "Complete 25 learning activities"),
        BadgeDef("creative_artist", R.string.creative_artist_1f36d, R.string.complete_20_creative_activities_1e394, "🎨", Rarity.Rare, Requirement.CategoryCount(AchievementCategory.Creative, 20), "Creative Artist", "Complete 20 creative activities"),
        BadgeDef("young_athlete", R.string.young_athlete_2164e, R.string.complete_30_physical_activities_c49a9, "🏃", Rarity.Rare, Requirement.CategoryCount(AchievementCategory.Physical, 30), "Young Athlete", "Complete 30 physical activities"),
        BadgeDef("chore_champion", R.string.chore_champion_b4c97, R.string.complete_100_total_chores_47909, "🏆", Rarity.Epic, Requirement.TotalCount(100), "Chore Champion", "Complete 100 total chores"),
        BadgeDef("super_star", R.string.super_star_62588, R.string.complete_250_total_chores_06631, "🌟", Rarity.Legendary, Requirement.TotalCount(250), "Super Star", "Complete 250 total chores"),
    )

    /**
     * Same evaluation as iOS AchievementEngine.progress: a badge shows as earned as soon
     * as the numbers say so, whether or not the row has been written yet. Pending
     * completions must already be filtered out of [completions].
     */
    fun progress(childChores: List<Chore>, completions: List<CompletionRef>, earned: List<AchievementBadge>, isVacationDay: (LocalDate) -> Boolean): List<BadgeProgress> {
        val choreIds = childChores.map { it.id }.toSet()
        val mine = completions.filter { it.choreId in choreIds && it.status != "pending" }
        val byId = childChores.associateBy { it.id }
        val dueDayCount = childChores.flatMap { it.daysOfWeek }.toSet().size
        val streak = currentStreak(mine, isVacationDay)
        return all.map { def ->
            val (current, required) = when (val r = def.requirement) {
                Requirement.FirstChore -> minOf(mine.size, 1) to 1
                is Requirement.TotalCount -> mine.size to r.n
                Requirement.WeekComplete -> {
                    val full = mine.groupBy { it.weekStart }.values.any { week -> week.map { it.dayOfWeek }.toSet().size >= maxOf(1, dueDayCount) }
                    (if (full) 1 else 0) to 1
                }
                is Requirement.Streak -> streak to r.days
                is Requirement.CategoryCount -> mine.count { r.category.matches(byId[it.choreId]?.category) } to r.n
            }
            val row = earned.firstOrNull { it.badgeType == def.id }
            BadgeProgress(def, current, required, earned = row != null || (required > 0 && current >= required), earnedAt = row?.earnedAt)
        }.sortedWith(compareByDescending<BadgeProgress> { it.earned }.thenByDescending { it.ratio }.thenBy { it.def.rarity.ordinal })
    }

    /** Days in a row with at least one completion, counting back from today; vacation days are skipped, an empty today does not break it. */
    fun currentStreak(completions: List<CompletionRef>, isVacationDay: (LocalDate) -> Boolean, today: LocalDate = LocalDate.now()): Int {
        val days = completions.map { it.date }.toSet()
        var streak = 0
        var i = 0
        while (i < 400) {
            val d = today.minusDays(i.toLong())
            when {
                isVacationDay(d) -> Unit
                d in days -> streak++
                i > 0 -> return streak
            }
            i++
        }
        return streak
    }
}
