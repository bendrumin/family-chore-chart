package com.chorestar.app.data

import kotlin.math.ceil
import kotlin.math.roundToInt

/**
 * Routine upgrades (migration 032), pure rules ported from
 * chorestar-nextjs/lib/routines/{routine-timer,live-progress,speech}.ts.
 */
object RoutineTimer {
    const val MIN_TARGET_SECONDS = 60
    const val MAX_TARGET_SECONDS = 7200

    enum class Phase { Plenty, Some, Little, Over }

    data class Status(val remainingSeconds: Int, val fractionLeft: Float, val overTime: Boolean, val phase: Phase)

    /** Gentle on purpose: past the target only changes the words, never a fail state. */
    fun status(elapsedSeconds: Long, targetSeconds: Int): Status {
        val target = maxOf(1, targetSeconds)
        val elapsed = maxOf(0L, elapsedSeconds)
        val remaining = maxOf(0L, target - elapsed).toInt()
        val fraction = remaining.toFloat() / target
        val over = elapsed >= target
        val phase = when {
            over -> Phase.Over
            fraction > 0.5f -> Phase.Plenty
            fraction > 0.25f -> Phase.Some
            else -> Phase.Little
        }
        return Status(remaining, fraction, over, phase)
    }

    /** Seconds a finished routine beat its target by; null without a target, when over, or under 30 s early. */
    fun finishedEarlyBy(durationSeconds: Int, targetSeconds: Int?): Int? {
        if (targetSeconds == null || targetSeconds <= 0) return null
        val early = targetSeconds - durationSeconds
        return if (early >= 30) early else null
    }

    /** "12:05". */
    fun clock(totalSeconds: Int): String {
        val s = maxOf(0, totalSeconds)
        return "%d:%02d".format(s / 60, s % 60)
    }

    /** Builder input (whole minutes, may be blank) to stored seconds, clamped to 1 minute..2 hours. */
    fun minutesToSeconds(text: String?): Int? {
        val n = text?.trim()?.replace(',', '.')?.toDoubleOrNull() ?: return null
        if (n <= 0) return null
        return (n.roundToInt() * 60).coerceIn(MIN_TARGET_SECONDS, MAX_TARGET_SECONDS)
    }

    /** Sum of the per-step timers plus 10%, rounded up to whole minutes: a sensible finish-by suggestion. */
    fun suggestedSeconds(stepSeconds: List<Int?>): Int? {
        val total = stepSeconds.sumOf { if (it != null && it > 0) it else 0 }
        if (total <= 0) return null
        val withSlack = (ceil(total * 1.1 / 60.0) * 60).toInt()
        return withSlack.coerceIn(MIN_TARGET_SECONDS, MAX_TARGET_SECONDS)
    }
}

object LiveProgress {
    /** A row nobody touched for this long is an abandoned run. */
    const val STALE_AFTER_MS = 30 * 60 * 1000L
    /** Minimum gap between progress writes from one player. */
    const val THROTTLE_MS = 4000L

    fun isFresh(updatedAtMillis: Long, now: Long): Boolean = now - updatedAtMillis < STALE_AFTER_MS

    /** 1-based step number for "step 3 of 6", clamped. */
    fun stepNumber(stepIndex: Int, stepsTotal: Int): Int = minOf(stepsTotal, maxOf(1, stepIndex + 1))

    fun percent(stepIndex: Int, stepsTotal: Int): Float = if (stepsTotal <= 0) 0f else (stepIndex.coerceIn(0, stepsTotal) / stepsTotal.toFloat())
}

/**
 * Latest-wins throttle for the player's progress posts: at most one send per
 * `intervalMs`; a report inside the window is held and replaced by newer ones.
 * Pure (the caller supplies the clock), so the timing is unit-tested; the
 * player runs the waits on a coroutine.
 */
class LatestWinsThrottle<T>(private val intervalMs: Long = LiveProgress.THROTTLE_MS) {
    private var last: Long = Long.MIN_VALUE / 2
    private var pending: T? = null
    private var hasPending = false

    sealed interface Decision<out T> {
        data class SendNow<T>(val value: T) : Decision<T>
        /** Hold it; call [due] after this many milliseconds. */
        data class WaitMs(val ms: Long) : Decision<Nothing>
    }

    fun offer(value: T, now: Long): Decision<T> {
        val wait = last + intervalMs - now
        if (wait <= 0) {
            pending = null; hasPending = false; last = now
            return Decision.SendNow(value)
        }
        pending = value; hasPending = true
        return Decision.WaitMs(wait)
    }

    /** The held value, if its window has closed; marks it sent. */
    fun due(now: Long): T? {
        if (!hasPending || now < last + intervalMs) return null
        val v = pending
        pending = null; hasPending = false; last = now
        @Suppress("UNCHECKED_CAST")
        return v as T
    }

    fun cancel() { pending = null; hasPending = false }
}

object Speech {
    private val BCP47 = mapOf("en" to "en-US", "es" to "es-ES", "pt" to "pt-BR", "ar" to "ar-SA", "fr" to "fr-FR", "de" to "de-DE")

    /** 'es' -> 'es-ES'; a full tag ('en-GB', 'pt_BR') passes through; junk -> null. */
    fun toTag(lang: String?): String? {
        val t = lang?.trim().orEmpty()
        if (!Regex("^[a-zA-Z]{2,3}([-_][a-zA-Z0-9]{2,8})*$").matches(t)) return null
        if ('-' in t || '_' in t) return t.replace('_', '-')
        return BCP47[t.lowercase()] ?: t.lowercase()
    }

    /**
     * A localized template title is spoken in the kid's device language (that is
     * what they see); anything a parent typed in the family's language, then the
     * device's.
     */
    fun languageFor(localized: Boolean, deviceTag: String?, familyLanguage: String?): String =
        (if (localized) toTag(deviceTag) else null) ?: toTag(familyLanguage) ?: toTag(deviceTag) ?: "en-US"

    /** The title, then the description if the parent wrote one. */
    fun textFor(title: String, description: String?): String {
        val t = title.trim()
        val d = description?.trim().orEmpty()
        if (d.isEmpty()) return t
        return if (t.endsWith(".") || t.endsWith("!") || t.endsWith("?")) "$t $d" else "$t. $d"
    }
}
