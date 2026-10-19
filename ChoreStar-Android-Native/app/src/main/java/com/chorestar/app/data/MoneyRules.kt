package com.chorestar.app.data

import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Kid money management (Premium, migration 030): the few rules the Android
 * screens need, mirroring chorestar-nextjs/lib/utils/money.ts. Every amount is
 * decided on the server (POST /api/money); these only drive presets, inputs and
 * how the jars look.
 */
object MoneyRules {
    data class Split(val spend: Int, val save: Int, val give: Int) {
        val label: String get() = "$spend/$save/$give"
    }

    val SPLIT_PRESETS = listOf(Split(70, 20, 10), Split(50, 40, 10), Split(80, 10, 10), Split(40, 40, 20))
    val DEFAULT_SPLIT = SPLIT_PRESETS[0]

    /** 10% a week is already absurd; it is a teaching tool, not a bank. */
    const val INTEREST_MAX_BPS = 1000
    const val DEDUCTION_MAX_CENTS = 100_000
    const val ALLOWANCE_MAX_CENTS = 100_000
    const val MINUTES_MAX_PER_REWARD = 600
    val MINUTES_USE_PRESETS = listOf(15, 30, 60)
    val THRESHOLD_PRESETS = listOf(50, 75, 90, 100)

    /** The five Premium money tools; each one's paywall source is `gate_<feature>`. */
    enum class Feature(val key: String) { Jars("jars"), Allowance("allowance"), Interest("interest"), Fines("fines"), Minutes("minutes");
        val paywallSource: String get() = "gate_$key"
        companion object { fun of(key: String?): Feature? = entries.firstOrNull { it.key == key } }
    }

    fun isValidSplit(s: Split): Boolean =
        listOf(s.spend, s.save, s.give).all { it in 0..100 } && s.spend + s.save + s.give == 100

    /** "2%" or "2.5%" from basis points. */
    fun formatRate(bps: Int): String {
        val pct = bps / 100.0
        val text = if (bps % 100 == 0) (bps / 100).toString() else "%.2f".format(java.util.Locale.ROOT, pct).trimEnd('0').trimEnd('.')
        return "$text%"
    }

    /** What a parent typed as a weekly percent ("2", "2.5", "2,5%") to basis points, clamped; null when not a number. */
    fun parseRateBps(text: String): Int? {
        val cleaned = text.trim().removeSuffix("%").trim().replace(',', '.')
        if (cleaned.isEmpty()) return 0
        val n = cleaned.toDoubleOrNull() ?: return null
        if (n < 0) return null
        return (n * 100).roundToInt().coerceAtMost(INTEREST_MAX_BPS)
    }

    /** How full a jar looks (0..100) next to the fullest one; anything above zero shows at least a little. */
    fun jarLevel(cents: Int, fullest: Int): Int {
        if (cents <= 0) return 0
        val top = maxOf(fullest, 1)
        return maxOf(12, ((cents.toDouble() / top) * 100).roundToInt()).coerceAtMost(100)
    }

    /** Below zero means the kid owes a parent; that is the amount, otherwise 0. */
    fun owesCents(balanceCents: Int?): Int = if ((balanceCents ?: 0) < 0) -(balanceCents ?: 0) else 0

    /** Hours and minutes for "1 h 30 min"; the sign is separate so the UI can say "-". */
    data class HoursMinutes(val negative: Boolean, val hours: Int, val minutes: Int)

    fun splitMinutes(total: Int): HoursMinutes {
        val m = abs(total)
        return HoursMinutes(total < 0, m / 60, m % 60)
    }

    /** The first payday on or after `date` (0 = Sunday .. 6 = Saturday). */
    fun nextPayday(date: LocalDate, paydayWeekday: Int): LocalDate {
        val dow = date.dayOfWeek.value % 7 // Monday=1..Sunday=7 -> Sunday=0
        return date.plusDays(((paydayWeekday - dow + 7) % 7).toLong())
    }

    /** What a money-news row is about, for its title. */
    enum class NewsKind { Allowance, AllowanceSkipped, Interest, Fine, Repayment, Donation, ChallengeReward, Other }

    fun newsKind(kind: String, amountCents: Int): NewsKind = when (kind) {
        "allowance" -> if (amountCents == 0) NewsKind.AllowanceSkipped else NewsKind.Allowance
        "interest" -> NewsKind.Interest
        "fine" -> NewsKind.Fine
        "repayment" -> NewsKind.Repayment
        "donation" -> NewsKind.Donation
        "challenge" -> NewsKind.ChallengeReward
        else -> NewsKind.Other
    }

    /** The parent's reason is the point for a deduction, a skipped allowance or a donation; credits don't need one. */
    fun showsNote(kind: String, amountCents: Int, note: String?): Boolean =
        !note.isNullOrBlank() && (amountCents < 0 || (kind == "allowance" && amountCents == 0) || kind == "donation")
}
