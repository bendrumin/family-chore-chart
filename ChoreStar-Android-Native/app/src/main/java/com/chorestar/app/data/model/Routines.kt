package com.chorestar.app.data.model

import androidx.annotation.StringRes
import com.chorestar.app.R
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** routines / routine_steps / routine_completions, as iOS Models/Routine.swift decodes them. */

enum class RoutineType(val raw: String, @StringRes val label: Int, val emoji: String, val defaultIcon: String, val defaultColor: String) {
    Morning("morning", R.string.routine_type_morning, "🌅", "sunrise.fill", "#f59e0b"),
    Bedtime("bedtime", R.string.routine_type_bedtime, "🌙", "moon.stars.fill", "#8b5cf6"),
    AfterSchool("afterschool", R.string.routine_type_afterschool, "🎒", "backpack.fill", "#10b981"),
    Custom("custom", R.string.routine_type_custom, "⭐", "star.fill", "#6366f1");

    companion object {
        fun of(raw: String?): RoutineType = entries.firstOrNull { it.raw == raw } ?: Custom
    }
}

@Serializable
data class RoutineStep(
    val id: String = "",
    @SerialName("routine_id") val routineId: String = "",
    val title: String,
    val description: String? = null,
    val icon: String? = "circle",
    @SerialName("order_index") val orderIndex: Int = 0,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    /** Picture step (Premium, migration 032): object path in the private routine-step-photos bucket. */
    @SerialName("image_path") val imagePath: String? = null,
    /** A signed URL for imagePath; only the web's GET /api/routines sends it (kid mode). */
    @SerialName("image_url") val imageUrl: String? = null,
)

@Serializable
data class Routine(
    val id: String,
    @SerialName("child_id") val childId: String,
    val name: String,
    val type: String = "custom",
    val icon: String? = "list.bullet",
    val color: String? = "#6366f1",
    @SerialName("reward_cents") val rewardCents: Int = 7,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("routine_steps") val steps: List<RoutineStep> = emptyList(),
    /** Only present on the kid API's GET /api/routines. */
    val completedToday: Boolean = false,
    /** Migration 032: read each step aloud as it appears (free). */
    @SerialName("auto_read_aloud") val autoReadAloud: Boolean = false,
    /** Migration 032: gentle "finish by" total for the whole routine (Premium). */
    @SerialName("target_duration_seconds") val targetDurationSeconds: Int? = null,
    /** Only on GET /api/routines/[id]: the family's plan and language, for the player. */
    @SerialName("family_premium") val familyPremium: Boolean? = null,
    @SerialName("family_language") val familyLanguage: String? = null,
) {
    val routineType: RoutineType get() = RoutineType.of(type)
    val sortedSteps: List<RoutineStep> get() = steps.sortedBy { it.orderIndex }
}

@Serializable
data class NewRoutineRow(
    val id: String,
    @SerialName("child_id") val childId: String,
    val name: String,
    val type: String,
    val icon: String,
    val color: String,
    @SerialName("reward_cents") val rewardCents: Int,
    @SerialName("is_active") val isActive: Boolean = true,
)

@Serializable
data class NewStepRow(
    @SerialName("routine_id") val routineId: String,
    val title: String,
    val icon: String,
    @SerialName("order_index") val orderIndex: Int,
    @SerialName("duration_seconds") val durationSeconds: Int?,
    /** Sent only when set (see ChoreStarRepository.stepRows), so an unmigrated database still saves. */
    @kotlinx.serialization.Transient val imagePath: String? = null,
)

@Serializable
data class RoutineCompletionRef(@SerialName("routine_id") val routineId: String)

@Serializable
data class NewRoutineCompletion(
    @SerialName("routine_id") val routineId: String,
    @SerialName("child_id") val childId: String,
    @SerialName("duration_seconds") val durationSeconds: Int,
    @SerialName("steps_completed") val stepsCompleted: Int,
    @SerialName("steps_total") val stepsTotal: Int,
    @SerialName("points_earned") val pointsEarned: Int,
    val date: String,
)

/** A step as the builder edits it. */
data class EditableStep(val title: String, val icon: String, val durationMinutes: Int?, val imagePath: String? = null, val previewUrl: String? = null)

/** The four starter routines (Models/Routine.swift RoutineTemplate.all). Titles are stored in English, localised at display. */
data class RoutineTemplate(val name: String, val type: RoutineType, val icon: String, val steps: List<Triple<String, String, Int?>>)

object RoutineTemplates {
    val all = listOf(
        RoutineTemplate("Morning Routine", RoutineType.Morning, "🌟", listOf(
            Triple("Wake Up & Stretch", "🌟", 60), Triple("Brush Teeth", "🪥", 120), Triple("Get Dressed", "👕", 180),
            Triple("Eat Breakfast", "🍽️", 600), Triple("Pack Backpack", "🎒", 120),
        )),
        RoutineTemplate("Bedtime Routine", RoutineType.Bedtime, "🌙", listOf(
            Triple("Take a Bath/Shower", "🚿", 600), Triple("Brush Teeth", "🪥", 120), Triple("Put on Pajamas", "👕", 120),
            Triple("Read a Book", "📖", 600), Triple("Lights Out", "💡", null),
        )),
        RoutineTemplate("After School Routine", RoutineType.AfterSchool, "🎒", listOf(
            Triple("Unpack Backpack", "🎒", 120), Triple("Have a Snack", "🥨", 300), Triple("Do Homework", "📚", 1800), Triple("Free Time", "🎮", null),
        )),
        RoutineTemplate("Quick Hygiene", RoutineType.Custom, "🧼", listOf(
            Triple("Wash Hands", "🧼", 30), Triple("Brush Teeth", "🪥", 120), Triple("Comb Hair", "💇", 60),
        )),
    )

    /** Template names and step titles that iOS localises at display time; anything a parent typed shows verbatim. */
    val localized: Map<String, Int> = mapOf(
        "Morning Routine" to R.string.morning_routine_7f6ff, "Bedtime Routine" to R.string.bedtime_routine_01584,
        "After School Routine" to R.string.after_school_routine_3eade, "Quick Hygiene" to R.string.quick_hygiene_d12ba,
        "Wake Up & Stretch" to R.string.wake_up_stretch_4e6f6, "Brush Teeth" to R.string.brush_teeth_724d6, "Get Dressed" to R.string.get_dressed_62d6b,
        "Eat Breakfast" to R.string.eat_breakfast_6f6c0, "Pack Backpack" to R.string.pack_backpack_2d58f, "Take a Bath/Shower" to R.string.take_a_bath_shower_4a54c,
        "Put on Pajamas" to R.string.put_on_pajamas_61904, "Read a Book" to R.string.read_a_book_ecd69, "Lights Out" to R.string.lights_out_7bbd0,
        "Unpack Backpack" to R.string.unpack_backpack_2875f, "Have a Snack" to R.string.have_a_snack_17c71, "Do Homework" to R.string.do_homework_7f3a2,
        "Free Time" to R.string.free_time_7d24d, "Wash Hands" to R.string.wash_hands_f5c88, "Comb Hair" to R.string.comb_hair_80e1c,
    )
}

/** iOS stores SF Symbol names for routine icons; on Android those render as the nearest emoji. */
object RoutineIcons {
    val choices: List<Pair<String, String>> = listOf(
        "sunrise.fill" to "🌅", "moon.stars.fill" to "🌙", "backpack.fill" to "🎒", "star.fill" to "⭐", "hands.sparkles.fill" to "🧼",
        "fork.knife" to "🍽️", "book.fill" to "📖", "figure.walk" to "🚶", "mouth.fill" to "🪥", "tshirt.fill" to "👕", "shower.fill" to "🚿",
        "bed.double.fill" to "🛏️", "gamecontroller.fill" to "🎮", "music.note" to "🎵", "paintbrush.fill" to "🎨", "pencil" to "✏️",
        "trash.fill" to "🗑️", "leaf.fill" to "🍃", "heart.fill" to "❤️", "bolt.fill" to "⚡", "clock.fill" to "⏰", "bell.fill" to "🔔",
        "house.fill" to "🏠", "car.fill" to "🚗", "list.bullet" to "📋", "circle" to "⚪", "checkmark.circle.fill" to "✅",
    )
    private val map = choices.toMap()

    /** The web builder (and Build with AI) stores lucide icon keys; show the nearest emoji. */
    val webKeys: Map<String, String> = mapOf(
        "wake-up" to "☀️", "make-bed" to "🛏️", "brush-teeth" to "🪥", "wash-face" to "💧", "get-dressed" to "👕", "brush-hair" to "💇",
        "eat-breakfast" to "🥣", "pack-backpack" to "🎒", "put-on-shoes" to "👟", "get-ready" to "😊", "morning-stretch" to "🤸",
        "take-bath" to "🛁", "take-shower" to "🚿", "put-on-pajamas" to "🌙", "read-book" to "📖", "hugs-kisses" to "🤗", "lights-out" to "💡",
        "bedtime-story" to "📚", "set-alarm" to "⏰", "calm-music" to "🎵", "shower" to "🚿", "wash-hands" to "🧼", "floss-teeth" to "🦷",
        "use-bathroom" to "🚽", "put-on-deodorant" to "✨", "clip-nails" to "✂️", "eat-lunch" to "🥪", "eat-dinner" to "🍽️", "have-snack" to "🍎",
        "drink-water" to "🥛", "drink-milk" to "🥛", "eat-fruit" to "🍎", "eat-veggies" to "🥦", "set-table" to "🍴", "clear-dishes" to "🍽️",
        "do-homework" to "✏️", "study" to "📘", "practice-reading" to "📖", "practice-math" to "🧮", "check-backpack" to "🎒", "organize-desk" to "🗂️",
        "school-supplies" to "🏫", "feed-pet" to "🐶", "walk-dog" to "🐕", "water-plants" to "🪴", "take-out-trash" to "🗑️", "clean-room" to "🧹",
        "put-away-toys" to "🧸", "help-cook" to "🧑‍🍳", "fold-laundry" to "🧺", "vacuum" to "🧹", "dust" to "✨", "play-outside" to "🌳",
        "ride-bike" to "🚲", "play-game" to "🎮", "do-puzzle" to "🧩", "draw-paint" to "🎨", "listen-music" to "🎧", "dance" to "💃",
        "build-blocks" to "🧱", "play-instrument" to "🎸", "exercise" to "🏃", "stretch" to "🤸", "sports" to "⚽", "yoga" to "🧘",
        "check" to "✅", "checkmark" to "✅", "timer" to "⏱️", "star" to "⭐", "trophy" to "🏆", "rocket" to "🚀", "bell" to "🔔",
        "heart" to "❤️", "smile" to "😊", "sparkles" to "✨", "home" to "🏠",
    )

    /** Emoji stays emoji; a symbol name becomes its emoji; anything else falls back. */
    fun display(icon: String?, fallback: String = "📝"): String {
        val s = icon?.trim().orEmpty()
        if (s.isEmpty()) return fallback
        if (!s.first().isLetterOrDigit() && s.first() != '.') return s
        return map[s] ?: webKeys[s] ?: fallback
    }

    val colors = listOf("#f59e0b", "#8b5cf6", "#10b981", "#6366f1", "#ef4444", "#ec4899", "#14b8a6", "#f97316")
}
