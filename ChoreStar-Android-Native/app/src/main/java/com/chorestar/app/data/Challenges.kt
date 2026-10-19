package com.chorestar.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

/**
 * Family challenges (Premium, migration 031), the parent side.
 *
 * A straight port of chorestar-nextjs/lib/challenges/progress.ts: progress is
 * never stored, it is derived from approved chore ticks and routine
 * completions inside the window, so the dashboard here shows the same number
 * as the web, the kid API and the deliver route. Rows are read through RLS
 * (owner and co-parents can read since 007); creating goes through
 * POST /api/challenges and delivering through /api/challenges/[id]/deliver.
 */

@Serializable
data class ChallengeRow(
    val id: String,
    @SerialName("user_id") val userId: String = "",
    val title: String,
    val emoji: String? = null,
    @SerialName("reward_text") val rewardText: String = "",
    @SerialName("reward_cents") val rewardCents: Int = 0,
    /** 'chores' or 'routines'. */
    val metric: String = "chores",
    /** 'team' or 'each'. */
    val mode: String = "team",
    val target: Int = 1,
    @SerialName("chore_filter") val choreFilter: String? = "any",
    @SerialName("routine_type") val routineType: String? = null,
    @SerialName("child_ids") val childIds: List<String> = emptyList(),
    /** YYYY-MM-DD, family timezone, inclusive. */
    @SerialName("starts_on") val startsOn: String,
    @SerialName("ends_on") val endsOn: String,
    /** 'active', 'delivered' or 'cancelled'. */
    val status: String = "active",
    @SerialName("delivered_at") val deliveredAt: String? = null,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class ChallengeChore(val id: String, @SerialName("child_id") val childId: String, @SerialName("rotation_mode") val rotationMode: String? = null)

@Serializable
data class ChallengeTick(
    @SerialName("chore_id") val choreId: String,
    @SerialName("week_start") val weekStart: String? = null,
    @SerialName("day_of_week") val dayOfWeek: Int? = null,
    val status: String? = null,
)

@Serializable
data class ChallengeRoutine(val id: String, @SerialName("child_id") val childId: String, val type: String? = null)

@Serializable
data class ChallengeRoutineDone(
    @SerialName("routine_id") val routineId: String,
    @SerialName("child_id") val childId: String,
    val date: String? = null,
    @SerialName("completed_at") val completedAt: String? = null,
)

data class ChallengeInputs(
    val chores: List<ChallengeChore> = emptyList(),
    val ticks: List<ChallengeTick> = emptyList(),
    val routines: List<ChallengeRoutine> = emptyList(),
    val routineDone: List<ChallengeRoutineDone> = emptyList(),
    /** family_settings.timezone; UTC when missing or unknown. */
    val timeZone: String? = null,
)

data class KidContribution(val childId: String, val count: Int, val done: Boolean, val toGo: Int)

data class ChallengeProgress(val current: Int, val goal: Int, val percent: Int, val met: Boolean, val remaining: Int, val kids: List<KidContribution>)

enum class ChallengePhase(val key: String, val order: Int) {
    Won("won", 0), Active("active", 1), Upcoming("upcoming", 2), Delivered("delivered", 3), Missed("missed", 4), Cancelled("cancelled", 5);
    companion object { fun of(key: String?): ChallengePhase = entries.firstOrNull { it.key == key } ?: Active }
}

data class ChallengeView(val challenge: ChallengeRow, val progress: ChallengeProgress, val phase: ChallengePhase, val daysLeft: Int)

/** One-tap starting points (lib/challenges/templates.ts). Titles are English like the web's; the form can change them. */
data class ChallengeTemplate(
    val key: String, val emoji: String, val title: String, val rewardText: String,
    val metric: String, val mode: String, val target: Int, val choreFilter: String, val routineType: String?,
)

object Challenges {
    val ROUTINE_TYPES = listOf("morning", "bedtime", "afterschool", "custom")
    const val MAX_DAYS = 93

    val TEMPLATES = listOf(
        ChallengeTemplate("pizza_night", "🍕", "Pizza Night", "Pizza night", "chores", "team", 50, "any", null),
        ChallengeTemplate("movie_night", "🎬", "Movie Night", "Family movie night", "routines", "each", 5, "any", "bedtime"),
        ChallengeTemplate("team_clean_up", "🧹", "Team Clean-Up", "Ice cream trip", "chores", "team", 10, "bonus", null),
        ChallengeTemplate("early_birds", "🌅", "Early Birds", "Pancake breakfast", "routines", "team", 10, "any", "morning"),
        ChallengeTemplate("everyone_pitches_in", "🙌", "Everyone Pitches In", "Game night, winners pick", "chores", "each", 10, "any", null),
    )

    val EMOJIS = listOf("🏆", "🍕", "🎬", "🧹", "🌅", "🙌", "🍦", "🎲", "🏕️", "🎳", "🚀", "⭐")

    // ── Dates (YYYY-MM-DD strings compare in calendar order) ────────────────

    fun isIsoDate(s: String?): Boolean = s != null && Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(s) && runCatching { LocalDate.parse(s) }.isSuccess

    fun addDays(iso: String, days: Long): String = LocalDate.parse(iso.take(10)).plusDays(days).toString()

    fun daysBetween(a: String, b: String): Long = ChronoUnit.DAYS.between(LocalDate.parse(a), LocalDate.parse(b))

    fun zone(timeZone: String?): ZoneId = timeZone?.takeIf { it.isNotBlank() }?.let { runCatching { ZoneId.of(it) }.getOrNull() } ?: ZoneOffset.UTC

    fun todayIn(timeZone: String?, now: java.time.Instant = java.time.Instant.now()): String = now.atZone(zone(timeZone)).toLocalDate().toString()

    /** The Sunday..Saturday week containing `today`, like chore_completions.week_start. */
    fun weekWindow(today: String): Pair<String, String> {
        val d = LocalDate.parse(today)
        val dow = d.dayOfWeek.value % 7
        val start = d.minusDays(dow.toLong())
        return start.toString() to start.plusDays(6).toString()
    }

    /** The calendar day a chore tick is FOR: its week's Sunday plus the day index. */
    fun choreTickDate(t: ChallengeTick): String? {
        val ws = t.weekStart ?: return null
        val day = t.dayOfWeek ?: return null
        if (day !in 0..6) return null
        return runCatching { addDays(ws.take(10), day.toLong()) }.getOrNull()
    }

    /** The family-local day a routine was finished on (completed_at), else its stored date. */
    fun routineDoneDate(c: ChallengeRoutineDone, timeZone: String?): String? {
        c.completedAt?.let { at ->
            val instant = runCatching { OffsetDateTime.parse(at).toInstant() }.getOrNull()
                ?: runCatching { java.time.Instant.parse(at) }.getOrNull()
                ?: runCatching { java.time.LocalDateTime.parse(at.replace(' ', 'T')).toInstant(ZoneOffset.UTC) }.getOrNull()
            if (instant != null) return todayIn(timeZone, instant)
        }
        return c.date?.take(10)
    }

    fun inWindow(date: String, c: ChallengeRow): Boolean = date >= c.startsOn && date <= c.endsOn

    /** Days left including today (0 once ended). */
    fun daysLeft(c: ChallengeRow, today: String): Int {
        if (today > c.endsOn) return 0
        val from = if (today < c.startsOn) c.startsOn else today
        return (daysBetween(from, c.endsOn) + 1).toInt()
    }

    data class FetchRange(val weekFrom: String, val weekTo: String, val dateFrom: String, val dateTo: String)

    /** Chore rows are keyed by week and routine rows by the server's UTC day, so widen both and let the filter decide. */
    fun fetchRange(list: List<ChallengeRow>): FetchRange? {
        if (list.isEmpty()) return null
        val start = list.minOf { it.startsOn }
        val end = list.maxOf { it.endsOn }
        return FetchRange(weekWindow(start).first, end, addDays(start, -1), addDays(end, 1))
    }

    // ── Counting ─────────────────────────────────────────────────────────────

    private fun approved(status: String?) = status == null || status == "approved"

    /** Each participant's count inside the window; every participant has a key. */
    fun countContributions(c: ChallengeRow, input: ChallengeInputs): Map<String, Int> {
        val counts = LinkedHashMap<String, Int>()
        c.childIds.forEach { counts[it] = 0 }
        val participants = c.childIds.toSet()
        if (c.metric == "chores") {
            val byId = input.chores.filter { it.childId in participants && (c.choreFilter != "bonus" || it.rotationMode == "grab") }.associateBy { it.id }
            val seen = HashSet<String>()
            for (t in input.ticks) {
                val chore = byId[t.choreId] ?: continue
                if (!approved(t.status)) continue
                val date = choreTickDate(t) ?: continue
                if (!inWindow(date, c)) continue
                if (!seen.add("${t.choreId}|$date")) continue
                counts[chore.childId] = (counts[chore.childId] ?: 0) + 1
            }
            return counts
        }
        val byId = input.routines.filter { it.childId in participants && (c.routineType == null || it.type == c.routineType) }.associateBy { it.id }
        val seen = HashSet<String>()
        for (r in input.routineDone) {
            if (byId[r.routineId] == null || r.childId !in participants) continue
            val date = routineDoneDate(r, input.timeZone) ?: continue
            if (!inWindow(date, c)) continue
            if (!seen.add("${r.routineId}|${r.childId}|$date")) continue
            counts[r.childId] = (counts[r.childId] ?: 0) + 1
        }
        return counts
    }

    fun progress(c: ChallengeRow, counts: Map<String, Int>): ChallengeProgress {
        val target = maxOf(1, c.target)
        val kids = c.childIds.map { id ->
            val n = counts[id] ?: 0
            if (c.mode == "each") KidContribution(id, n, n >= target, maxOf(0, target - n)) else KidContribution(id, n, n > 0, 0)
        }
        if (c.mode == "each") {
            val goal = target * maxOf(1, kids.size)
            val current = kids.sumOf { minOf(it.count, target) }
            val met = kids.isNotEmpty() && kids.all { it.done }
            return ChallengeProgress(current, goal, pct(current, goal), met, goal - current, kids)
        }
        val sum = kids.sumOf { it.count }
        val current = minOf(sum, target)
        return ChallengeProgress(current, target, pct(current, target), sum >= target, target - current, kids)
    }

    private fun pct(current: Int, goal: Int): Int = if (goal <= 0) 0 else minOf(100, Math.round(current * 100.0 / goal).toInt())

    fun phase(c: ChallengeRow, met: Boolean, today: String): ChallengePhase = when {
        c.status == "cancelled" -> ChallengePhase.Cancelled
        c.status == "delivered" -> ChallengePhase.Delivered
        met -> ChallengePhase.Won
        today > c.endsOn -> ChallengePhase.Missed
        today < c.startsOn -> ChallengePhase.Upcoming
        else -> ChallengePhase.Active
    }

    fun withProgress(list: List<ChallengeRow>, input: ChallengeInputs, now: java.time.Instant = java.time.Instant.now()): List<ChallengeView> {
        val today = todayIn(input.timeZone, now)
        return list.map { c ->
            val p = progress(c, countContributions(c, input))
            ChallengeView(c, p, phase(c, p.met, today), daysLeft(c, today))
        }
    }

    /** Won-and-waiting first (the parent has something to do), then running ones. */
    fun sort(list: List<ChallengeView>): List<ChallengeView> =
        list.sortedWith(compareBy<ChallengeView> { it.phase.order }.thenBy { it.challenge.endsOn }.thenBy { it.challenge.createdAt })

    /** What the parent dashboard lists: anything not cancelled, and finished ones only for a week. */
    fun worthShowing(v: ChallengeView, today: String): Boolean = when (v.phase) {
        ChallengePhase.Cancelled -> false
        ChallengePhase.Delivered, ChallengePhase.Missed -> daysBetween(v.challenge.endsOn, today) <= 7 ||
            (v.challenge.deliveredAt?.take(10)?.let { isIsoDate(it) && daysBetween(it, today) <= 7 } ?: false)
        else -> true
    }

    /** Mirrors createChallengeSchema: what makes the Save button safe to press. */
    fun validate(title: String, rewardText: String, target: Int, childIds: Collection<String>, startsOn: String, endsOn: String): String? = when {
        title.isBlank() || title.trim().length > 60 -> "title"
        rewardText.isBlank() || rewardText.trim().length > 80 -> "reward"
        target !in 1..1000 -> "target"
        childIds.toSet().size < 2 -> "kids"
        !isIsoDate(startsOn) || !isIsoDate(endsOn) || endsOn < startsOn -> "dates"
        daysBetween(startsOn, endsOn) >= MAX_DAYS -> "dates"
        else -> null
    }
}
