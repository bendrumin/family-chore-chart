package com.chorestar.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** Mirrors chorestar-nextjs/lib/challenges/progress.test.ts so every surface shows one number. */
class ChallengesTest {
    private val maya = "kid-maya"
    private val leo = "kid-leo"

    private fun challenge(
        metric: String = "chores", mode: String = "team", target: Int = 3, filter: String = "any", type: String? = null,
        starts: String = "2026-10-18", ends: String = "2026-10-24", status: String = "active",
    ) = ChallengeRow("c1", "owner", "Pizza", "🍕", "Pizza night", 0, metric, mode, target, filter, type, listOf(maya, leo), starts, ends, status, null, "2026-10-18T00:00:00Z")

    private val chores = listOf(ChallengeChore("ch-m", maya), ChallengeChore("ch-l", leo), ChallengeChore("bonus-m", maya, "grab"), ChallengeChore("other", "kid-zoe"))

    @Test fun choreTicksCountInsideWindowOncePerDay() {
        val ticks = listOf(
            ChallengeTick("ch-m", "2026-10-18", 1), // Mon 19th
            ChallengeTick("ch-m", "2026-10-18", 1), // duplicate row
            ChallengeTick("ch-l", "2026-10-18", 2, "approved"),
            ChallengeTick("ch-l", "2026-10-18", 3, "pending"), // not approved
            ChallengeTick("ch-m", "2026-10-11", 6), // Sat 17th: before the window
            ChallengeTick("other", "2026-10-18", 1), // not a participant
        )
        val counts = Challenges.countContributions(challenge(), ChallengeInputs(chores, ticks))
        assertEquals(mapOf(maya to 1, leo to 1), counts)
    }

    @Test fun bonusFilterCountsOnlyGrabChores() {
        val ticks = listOf(ChallengeTick("ch-m", "2026-10-18", 1), ChallengeTick("bonus-m", "2026-10-18", 1))
        val counts = Challenges.countContributions(challenge(filter = "bonus"), ChallengeInputs(chores, ticks))
        assertEquals(1, counts[maya]); assertEquals(0, counts[leo])
    }

    @Test fun teamModeAddsUpAndCapsAtTarget() {
        val p = Challenges.progress(challenge(target = 3), mapOf(maya to 4, leo to 1))
        assertEquals(3, p.current); assertEquals(3, p.goal); assertEquals(100, p.percent); assertTrue(p.met); assertEquals(0, p.remaining)
        assertTrue(p.kids.all { it.done })
    }

    @Test fun eachModeNeedsEveryKid() {
        val p = Challenges.progress(challenge(mode = "each", target = 5), mapOf(maya to 9, leo to 2))
        // Maya racing ahead can't fill Leo's half.
        assertEquals(7, p.current); assertEquals(10, p.goal); assertEquals(70, p.percent); assertFalse(p.met); assertEquals(3, p.remaining)
        assertEquals(3, p.kids.first { it.childId == leo }.toGo)
        assertTrue(p.kids.first { it.childId == maya }.done)
    }

    @Test fun routinesUseFamilyTimezoneAndType() {
        val routines = listOf(ChallengeRoutine("r-m", maya, "bedtime"), ChallengeRoutine("r-l", leo, "morning"))
        val done = listOf(
            // 01:30 UTC on the 18th is still the 17th in New York: outside the window.
            ChallengeRoutineDone("r-m", maya, "2026-10-18", "2026-10-18T01:30:00Z"),
            ChallengeRoutineDone("r-m", maya, "2026-10-20", "2026-10-20T01:30:00+00:00"),
            ChallengeRoutineDone("r-l", leo, "2026-10-20", "2026-10-20T12:00:00Z"), // morning, filtered out
        )
        val counts = Challenges.countContributions(challenge(metric = "routines", type = "bedtime"), ChallengeInputs(routines = routines, routineDone = done, timeZone = "America/New_York"))
        assertEquals(1, counts[maya]); assertEquals(0, counts[leo])
    }

    @Test fun phaseAndDaysLeft() {
        val c = challenge()
        assertEquals(ChallengePhase.Upcoming, Challenges.phase(c, false, "2026-10-17"))
        assertEquals(ChallengePhase.Active, Challenges.phase(c, false, "2026-10-20"))
        assertEquals(ChallengePhase.Won, Challenges.phase(c, true, "2026-10-20"))
        assertEquals(ChallengePhase.Missed, Challenges.phase(c, false, "2026-10-25"))
        assertEquals(ChallengePhase.Delivered, Challenges.phase(c.copy(status = "delivered"), true, "2026-10-20"))
        assertEquals(ChallengePhase.Cancelled, Challenges.phase(c.copy(status = "cancelled"), true, "2026-10-20"))
        assertEquals(5, Challenges.daysLeft(c, "2026-10-20"))
        assertEquals(7, Challenges.daysLeft(c, "2026-10-01"))
        assertEquals(0, Challenges.daysLeft(c, "2026-10-25"))
    }

    @Test fun weekWindowIsSundayToSaturday() {
        assertEquals("2026-10-18" to "2026-10-24", Challenges.weekWindow("2026-10-21"))
        assertEquals("2026-10-18" to "2026-10-24", Challenges.weekWindow("2026-10-18"))
        assertEquals("2026-10-18" to "2026-10-24", Challenges.weekWindow("2026-10-24"))
    }

    @Test fun fetchRangeWidensBothKeys() {
        val r = Challenges.fetchRange(listOf(challenge(starts = "2026-10-20", ends = "2026-10-22")))!!
        assertEquals("2026-10-18", r.weekFrom); assertEquals("2026-10-22", r.weekTo)
        assertEquals("2026-10-19", r.dateFrom); assertEquals("2026-10-23", r.dateTo)
        assertNull(Challenges.fetchRange(emptyList()))
    }

    @Test fun sortPutsWonFirst() {
        val inputs = ChallengeInputs()
        val now = Instant.parse("2026-10-20T12:00:00Z")
        val views = Challenges.withProgress(listOf(challenge(), challenge().copy(id = "c2", status = "delivered")), inputs, now)
        val won = views[0].copy(phase = ChallengePhase.Won)
        val sorted = Challenges.sort(listOf(views[1], views[0], won))
        assertEquals(ChallengePhase.Won, sorted.first().phase)
        assertEquals(ChallengePhase.Delivered, sorted.last().phase)
    }

    @Test fun validateMirrorsServerSchema() {
        assertNull(Challenges.validate("Pizza", "Pizza night", 50, listOf(maya, leo), "2026-10-18", "2026-10-24"))
        assertEquals("kids", Challenges.validate("Pizza", "Pizza night", 50, listOf(maya, maya), "2026-10-18", "2026-10-24"))
        assertEquals("target", Challenges.validate("Pizza", "Pizza night", 0, listOf(maya, leo), "2026-10-18", "2026-10-24"))
        assertEquals("dates", Challenges.validate("Pizza", "Pizza night", 5, listOf(maya, leo), "2026-10-24", "2026-10-18"))
        assertEquals("dates", Challenges.validate("Pizza", "Pizza night", 5, listOf(maya, leo), "2026-01-01", "2026-04-30"))
        assertEquals("title", Challenges.validate(" ", "Pizza night", 5, listOf(maya, leo), "2026-10-18", "2026-10-24"))
    }

    @Test fun templatesMatchTheWeb() {
        assertEquals(listOf("pizza_night", "movie_night", "team_clean_up", "early_birds", "everyone_pitches_in"), Challenges.TEMPLATES.map { it.key })
        val movie = Challenges.TEMPLATES[1]
        assertEquals("routines", movie.metric); assertEquals("each", movie.mode); assertEquals("bedtime", movie.routineType)
    }
}
