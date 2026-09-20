package com.chorestar.app.data

import androidx.annotation.StringRes
import com.chorestar.app.R
import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale

/**
 * The lists iOS and the web share: categories (a Postgres enum, so the raw
 * values must match exactly), the icon catalog, the colour palettes and the
 * offline chore-suggestion engine. Mirrors ChoreStar-iOS Models/ChoreCategory.swift
 * and Models/ChoreSuggestions.swift.
 */

enum class ChoreCategory(val raw: String, @StringRes val label: Int, val emoji: String) {
    Household("household_chores", R.string.category_household, "🏠"),
    Learning("learning_education", R.string.category_learning, "📚"),
    Physical("physical_activity", R.string.category_physical, "🏃"),
    Creative("creative_time", R.string.category_creative, "🎨"),
    Games("games_play", R.string.category_games, "🎮"),
    Reading("reading", R.string.category_reading, "📖"),
    Family("family_time", R.string.category_family, "❤️"),
    Custom("custom", R.string.category_custom, "⚙️");

    companion object {
        /** Unknown or legacy values (the old free-text "General" etc.) become Household, as on iOS. */
        fun normalize(raw: String?): ChoreCategory = entries.firstOrNull { it.raw == raw } ?: Household
    }
}

object ChoreIconCatalog {
    val all: List<String> = listOf(
        "🧹", "🧺", "🧼", "🧽", "🧴", "🗑️", "💧", "🚿", "🛏️", "🪟",
        "🚪", "🪑", "🛋️", "🍽️", "🥄", "🔪", "🍳", "🥘", "🍲", "🫙",
        "🧊", "🥤", "🧃", "🍵", "📚", "📖", "📝", "✏️", "✒️", "🖊️",
        "📕", "📗", "📘", "📙", "📔", "📓", "📒", "🗂️", "📂", "📁",
        "🔬", "🧪", "🧬", "🔭", "🌡️", "💡", "🔦", "🕯️", "⚽", "🏀",
        "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸",
        "🏒", "🥊", "⛳", "⛸️", "🛹", "🛼", "🤸", "🧘", "🚴", "🏃",
        "🤾", "🏋️", "🎨", "🖌️", "🖍️", "🎭", "🎪", "🎬", "🎤", "🎧",
        "🎼", "🎹", "🎸", "🎺", "🎷", "🥁", "🎻", "🪕", "📷", "📹",
        "🎮", "🕹️", "🧩", "🎲", "🌱", "🌿", "🍀", "🌻", "🌺", "🌸",
        "🌼", "🌷", "🦋", "🐝", "🐞", "🦗", "🦟", "🐛", "🐌", "🐚",
        "🐕", "🐈", "🐁", "🐀", "🐹", "🐰", "🦊", "🐻", "🥗", "🥙",
        "🌮", "🌯", "🥪", "🍕", "🍔", "🍟", "🥐", "🥖", "🥨", "🥞",
        "🧀", "🍖", "🍗", "🥩", "🥓", "🥚", "🍞", "🥜", "🌰", "🥝",
        "🍇", "⭐", "🌟", "✨", "💫", "🔥", "💪", "👍", "🎯", "🏆",
        "🥇", "🥈", "🥉", "🎖️", "🏅", "🎗️", "🎀",
    )
}

/** Named swatches stored in children.avatar_color / chores.color, in the iOS picker order. */
object Palette {
    val child: List<String> = listOf(
        "red", "blue", "green", "orange", "purple", "pink", "yellow", "teal",
        "indigo", "mint", "cyan", "brown", "coral", "turquoise", "rose", "emerald",
    )
    val chore: List<String> = listOf("blue", "green", "orange", "purple", "pink", "red", "yellow", "teal", "indigo", "mint")

    /** iOS Color.fromString: system colours by name, four custom RGB triples, unknown → blue. */
    fun hex(name: String?): Long {
        val v = name?.trim()?.lowercase() ?: return 0xFF3B82F6
        if (v.startsWith("#") && (v.length == 7 || v.length == 9)) {
            return runCatching { android.graphics.Color.parseColor(v).toLong() and 0xFFFFFFFFL }.getOrDefault(0xFF3B82F6)
        }
        return when (v) {
            "red" -> 0xFFEF4444; "blue" -> 0xFF3B82F6; "green" -> 0xFF22C55E; "orange" -> 0xFFF97316
            "purple", "violet" -> 0xFF8B5CF6; "pink" -> 0xFFEC4899; "yellow", "amber" -> 0xFFF59E0B
            "teal" -> 0xFF14B8A6; "indigo" -> 0xFF6366F1; "mint" -> 0xFF34D399; "cyan" -> 0xFF06B6D4
            "brown" -> 0xFFA16207; "gray", "grey" -> 0xFF6B7280
            "coral" -> 0xFFFF804F; "turquoise" -> 0xFF40E0D1; "rose" -> 0xFFFF0080; "emerald" -> 0xFF4FC778
            "lime" -> 0xFF84CC16; "magenta" -> 0xFFD946EF; "lavender" -> 0xFFA78BFA; "peach" -> 0xFFFDBA74
            "sky" -> 0xFF38BDF8; "gold" -> 0xFFEAB308; "navy" -> 0xFF1E3A8A; "maroon" -> 0xFF7F1D1D
            "olive" -> 0xFF65A30D; "aqua" -> 0xFF22D3EE; "salmon" -> 0xFFFB7185
            else -> 0xFF3B82F6
        }
    }
}

/**
 * Which two days are the weekend. Saturday–Sunday nearly everywhere; Friday–Saturday
 * in the Gulf. Inferred from the family's timezone setting when it names a zone,
 * otherwise from the device. Mirrors iOS Logic/RewekndMath WeekendStyle.
 */
enum class WeekendStyle(val weekend: List<Int>, val weekdays: List<Int>) {
    SatSun(listOf(0, 6), listOf(1, 2, 3, 4, 5)),
    FriSat(listOf(5, 6), listOf(0, 1, 2, 3, 4));

    companion object {
        private val friSatZones = setOf(
            "Asia/Riyadh", "Asia/Dubai", "Asia/Qatar", "Asia/Bahrain", "Asia/Kuwait", "Asia/Muscat",
            "Asia/Aden", "Asia/Baghdad", "Asia/Amman", "Asia/Damascus", "Asia/Tehran", "Africa/Cairo",
            "Africa/Tripoli", "Africa/Khartoum", "Asia/Kabul", "Asia/Karachi", "Asia/Dhaka",
        )

        fun infer(familyTimezone: String?): WeekendStyle {
            val zone = familyTimezone?.takeIf { it.isNotBlank() && it != "UTC" }
                ?.let { runCatching { ZoneId.of(it).id }.getOrNull() }
                ?: ZoneId.systemDefault().id
            return if (zone in friSatZones) FriSat else SatSun
        }
    }
}

object ChoreSchedule {
    val everyDay: List<Int> = listOf(0, 1, 2, 3, 4, 5, 6)

    fun normalized(days: List<Int>?): List<Int> {
        val cleaned = days.orEmpty().filter { it in 0..6 }.distinct().sorted()
        return if (cleaned.isEmpty()) everyDay else cleaned
    }

    /** "Every day" / "Weekdays" / "Weekends" / "Mondays" / "Mon, Wed, Fri". Resource ids for the first three. */
    fun labelKind(days: List<Int>, style: WeekendStyle): LabelKind {
        val d = normalized(days)
        return when {
            d.size == 7 -> LabelKind.EveryDay
            d == style.weekdays -> LabelKind.Weekdays
            d == style.weekend -> LabelKind.Weekends
            else -> LabelKind.Days(Dates.displayOrder().filter { it in d })
        }
    }

    sealed interface LabelKind {
        data object EveryDay : LabelKind
        data object Weekdays : LabelKind
        data object Weekends : LabelKind
        data class Days(val days: List<Int>) : LabelKind
    }
}

data class ChoreSuggestion(
    val name: String,
    val category: String,
    val icon: String,
    val rewardCents: Int,
    val reason: String,
    /** True when the reason text came from the server (already worded); local ones carry a resource id. */
    val reasonRes: Int? = null,
    val reasonArg: String? = null,
) {
    /** Catalogue categories map onto the Postgres enum the way iOS maps them. */
    val editorCategory: ChoreCategory
        get() = when (category) {
            "learning", "learning_education" -> ChoreCategory.Learning
            "outdoor", "physical_activity" -> ChoreCategory.Physical
            else -> ChoreCategory.normalize(category)
        }
}

/** The offline fallback when /api/ai/suggest-chores is unreachable. Same catalogue and scoring as iOS and web. */
object ChoreSuggestionEngine {
    private class Def(
        val name: String, val category: String, val icon: String,
        val minAge: Int, val maxAge: Int, val rewardCents: Int, val seasonalMonths: List<Int> = emptyList(),
    )

    private val SCHOOL_MONTHS = listOf(1, 2, 3, 4, 5, 9, 10, 11, 12)

    private val catalogue: List<Def> = listOf(
        Def("Brush teeth", "self-care", "🪥", 3, 18, 5),
        Def("Make bed", "self-care", "🛏️", 4, 18, 5),
        Def("Get dressed by yourself", "self-care", "👕", 3, 8, 5),
        Def("Put pajamas on", "self-care", "🌙", 3, 8, 5),
        Def("Wash hands before meals", "self-care", "🧼", 3, 10, 3),
        Def("Comb/brush hair", "self-care", "💇", 4, 12, 3),
        Def("Take a shower", "self-care", "🚿", 6, 18, 5),
        Def("Pack school bag", "self-care", "🎒", 5, 14, 5, SCHOOL_MONTHS),
        Def("Put toys away", "tidying", "🧸", 3, 10, 5),
        Def("Pick up clothes off floor", "tidying", "👚", 4, 12, 5),
        Def("Tidy bedroom", "tidying", "🧹", 5, 18, 10),
        Def("Organize bookshelf", "tidying", "📚", 5, 14, 10),
        Def("Clean off desk", "tidying", "🗂️", 6, 18, 10),
        Def("Set the table", "kitchen", "🍽️", 4, 14, 10),
        Def("Clear the table", "kitchen", "🧹", 4, 14, 10),
        Def("Help load dishwasher", "kitchen", "🍽️", 6, 14, 15),
        Def("Unload dishwasher", "kitchen", "✨", 7, 18, 15),
        Def("Wipe kitchen counter", "kitchen", "🧽", 6, 18, 10),
        Def("Help with cooking", "kitchen", "👩‍🍳", 7, 18, 20),
        Def("Pack lunch", "kitchen", "🥪", 7, 18, 10, SCHOOL_MONTHS),
        Def("Put dirty clothes in hamper", "laundry", "🧺", 4, 12, 5),
        Def("Sort laundry", "laundry", "👕", 7, 18, 15),
        Def("Fold laundry", "laundry", "🧥", 7, 18, 15),
        Def("Put away clean clothes", "laundry", "🗄️", 6, 18, 10),
        Def("Feed the pet", "pets", "🐾", 5, 18, 10),
        Def("Fill water bowl", "pets", "💧", 4, 14, 5),
        Def("Walk the dog", "pets", "🐕", 8, 18, 25),
        Def("Clean pet area", "pets", "🧹", 8, 18, 20),
        Def("Clean up dog poop", "pets", "🐕", 9, 18, 30, listOf(3, 4, 5, 6, 7, 8, 9, 10)),
        Def("Water plants", "outdoor", "🌱", 4, 14, 10, listOf(4, 5, 6, 7, 8, 9)),
        Def("Help in the garden", "outdoor", "🌻", 6, 18, 25, listOf(3, 4, 5, 6, 7, 8, 9)),
        Def("Pull weeds", "outdoor", "🌿", 6, 18, 20, listOf(3, 4, 5, 6, 7, 8)),
        Def("Plant flowers", "outdoor", "🌷", 6, 18, 25, listOf(3, 4, 5, 6)),
        Def("Pick up sticks", "outdoor", "🪵", 5, 14, 15, listOf(3, 4, 5, 6, 9, 10, 11)),
        Def("Pick up litter", "outdoor", "🌎", 6, 18, 20, listOf(3, 4, 5)),
        Def("Sweep porch or patio", "outdoor", "🧹", 7, 18, 15, listOf(3, 4, 5, 6, 7, 8, 9)),
        Def("Wash outdoor toys", "outdoor", "🫧", 6, 14, 20, listOf(4, 5, 6, 7, 8)),
        Def("Refill bird feeder", "outdoor", "🐦", 5, 14, 10, listOf(3, 4, 5, 6, 7, 8)),
        Def("Rake leaves", "outdoor", "🍂", 6, 18, 25, listOf(9, 10, 11)),
        Def("Shovel snow from walkway", "outdoor", "❄️", 8, 18, 50, listOf(11, 12, 1, 2, 3)),
        Def("Take out recycling", "outdoor", "♻️", 6, 18, 10),
        Def("Take out trash", "outdoor", "🗑️", 7, 18, 10),
        Def("Bring in mail", "outdoor", "📬", 5, 14, 5),
        Def("Vacuum a room", "household", "🧹", 8, 18, 25),
        Def("Sweep the floor", "household", "🧹", 7, 18, 15),
        Def("Dust furniture", "household", "✨", 7, 18, 15),
        Def("Clean bathroom sink", "household", "🚰", 8, 18, 20),
        Def("Take out trash cans", "household", "🗑️", 9, 18, 15),
        Def("Wash trash bins", "household", "🧼", 10, 18, 35, listOf(3, 4, 5, 6, 7, 8, 9)),
        Def("Wipe down mirrors", "household", "🪞", 7, 18, 10),
        Def("Read for 20 minutes", "learning", "📖", 5, 18, 15),
        Def("Do homework", "learning", "📝", 5, 18, 10, SCHOOL_MONTHS),
        Def("Practice instrument", "learning", "🎵", 5, 18, 15),
        Def("Screen-free hour", "learning", "📵", 6, 18, 15),
    )

    fun suggestions(
        childName: String,
        childAge: Int?,
        existingChoreNames: List<String>,
        completionRate: Double,
        count: Int = 5,
        today: LocalDate = LocalDate.now(),
    ): List<ChoreSuggestion> {
        val age = childAge?.takeIf { it > 0 } ?: 7
        val month = today.monthValue
        val dayOfMonth = today.dayOfMonth
        val existingLower = existingChoreNames.map { it.trim().lowercase(Locale.ROOT) }.toSet()

        val candidates = catalogue.filter { age in it.minAge..it.maxAge && it.name.lowercase(Locale.ROOT) !in existingLower }
        val scored = candidates.map { def ->
            var score = 0
            if (def.seasonalMonths.isNotEmpty() && month in def.seasonalMonths) score += 30
            // iOS and web compare the category against existing chore *names*; kept as is so all three agree.
            if (def.category !in existingLower) score += 15
            if (completionRate > 75 && def.rewardCents >= 15) score += 10
            if (age <= 6 && def.maxAge <= 10) score += 10
            if (def.seasonalMonths.isEmpty()) score += 5
            val hash = def.name.codePoints().toArray().sum()
            score += (hash + dayOfMonth) % 7
            def to score
        }
        return scored.sortedByDescending { it.second }.take(count).map { (def, _) ->
            val (res, arg) = when {
                def.seasonalMonths.isNotEmpty() && month in def.seasonalMonths -> R.string.suggest_reason_season to null
                completionRate > 75 && def.rewardCents >= 15 -> R.string.suggest_reason_challenge to childName
                age <= 6 && def.maxAge <= 10 -> R.string.suggest_reason_age to childName
                else -> R.string.suggest_reason_habits to null
            }
            ChoreSuggestion(def.name, def.category, def.icon, def.rewardCents, reason = "", reasonRes = res, reasonArg = arg)
        }
    }
}
