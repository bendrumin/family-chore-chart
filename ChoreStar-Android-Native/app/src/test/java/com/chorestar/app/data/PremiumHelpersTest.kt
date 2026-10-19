package com.chorestar.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class MoneyRulesTest {
    @Test fun presetsMatchTheWebAndAddUp() {
        assertEquals(listOf("70/20/10", "50/40/10", "80/10/10", "40/40/20"), MoneyRules.SPLIT_PRESETS.map { it.label })
        assertTrue(MoneyRules.SPLIT_PRESETS.all { MoneyRules.isValidSplit(it) })
        assertFalse(MoneyRules.isValidSplit(MoneyRules.Split(70, 20, 20)))
        assertFalse(MoneyRules.isValidSplit(MoneyRules.Split(110, -10, 0)))
    }

    @Test fun ratesRoundTrip() {
        assertEquals("2%", MoneyRules.formatRate(200))
        assertEquals("2.5%", MoneyRules.formatRate(250))
        assertEquals("0.25%", MoneyRules.formatRate(25))
        assertEquals(250, MoneyRules.parseRateBps("2.5"))
        assertEquals(250, MoneyRules.parseRateBps("2,5%"))
        assertEquals(0, MoneyRules.parseRateBps(""))
        assertEquals(1000, MoneyRules.parseRateBps("50"))
        assertNull(MoneyRules.parseRateBps("lots"))
        assertNull(MoneyRules.parseRateBps("-1"))
    }

    @Test fun jarLevelsAreRelativeAndVisible() {
        assertEquals(0, MoneyRules.jarLevel(0, 500))
        assertEquals(0, MoneyRules.jarLevel(-30, 500))
        assertEquals(12, MoneyRules.jarLevel(1, 500))
        assertEquals(100, MoneyRules.jarLevel(500, 500))
        assertEquals(50, MoneyRules.jarLevel(250, 500))
    }

    @Test fun owesOnlyBelowZero() {
        assertEquals(0, MoneyRules.owesCents(120))
        assertEquals(0, MoneyRules.owesCents(null))
        assertEquals(75, MoneyRules.owesCents(-75))
    }

    @Test fun minutesSplit() {
        assertEquals(MoneyRules.HoursMinutes(false, 1, 30), MoneyRules.splitMinutes(90))
        assertEquals(MoneyRules.HoursMinutes(false, 0, 45), MoneyRules.splitMinutes(45))
        assertEquals(MoneyRules.HoursMinutes(true, 2, 0), MoneyRules.splitMinutes(-120))
    }

    @Test fun nextPaydayIsOnOrAfter() {
        val wed = LocalDate.parse("2026-10-21")
        assertEquals(LocalDate.parse("2026-10-24"), MoneyRules.nextPayday(wed, 6)) // Saturday
        assertEquals(wed, MoneyRules.nextPayday(wed, 3))
        assertEquals(LocalDate.parse("2026-10-25"), MoneyRules.nextPayday(wed, 0)) // Sunday
    }

    @Test fun newsKindsAndNotes() {
        assertEquals(MoneyRules.NewsKind.AllowanceSkipped, MoneyRules.newsKind("allowance", 0))
        assertEquals(MoneyRules.NewsKind.Allowance, MoneyRules.newsKind("allowance", 500))
        assertEquals(MoneyRules.NewsKind.Fine, MoneyRules.newsKind("fine", -100))
        assertEquals(MoneyRules.NewsKind.Other, MoneyRules.newsKind("mystery", 1))
        assertTrue(MoneyRules.showsNote("fine", -100, "Hit his sister"))
        assertFalse(MoneyRules.showsNote("interest", 12, "Weekly interest"))
        assertTrue(MoneyRules.showsNote("allowance", 0, "Allowance skipped: 40% of chores done, needs 75%"))
        assertFalse(MoneyRules.showsNote("fine", -100, " "))
    }

    @Test fun featurePaywallSources() {
        assertEquals(listOf("gate_jars", "gate_allowance", "gate_interest", "gate_fines", "gate_minutes"), MoneyRules.Feature.entries.map { it.paywallSource })
        assertEquals(MoneyRules.Feature.Fines, MoneyRules.Feature.of("fines"))
        assertNull(MoneyRules.Feature.of("premium_required"))
    }
}

class RoutineExtrasTest {
    @Test fun finishByIsGentle() {
        val start = RoutineTimer.status(0, 600)
        assertEquals(600, start.remainingSeconds); assertEquals(RoutineTimer.Phase.Plenty, start.phase); assertFalse(start.overTime)
        assertEquals(RoutineTimer.Phase.Some, RoutineTimer.status(400, 600).phase)
        assertEquals(RoutineTimer.Phase.Little, RoutineTimer.status(500, 600).phase)
        val over = RoutineTimer.status(900, 600)
        assertTrue(over.overTime); assertEquals(0, over.remainingSeconds); assertEquals(RoutineTimer.Phase.Over, over.phase); assertEquals(0f, over.fractionLeft)
    }

    @Test fun earlyFinishesAreCelebratedFromThirtySeconds() {
        assertEquals(120, RoutineTimer.finishedEarlyBy(480, 600))
        assertNull(RoutineTimer.finishedEarlyBy(590, 600))
        assertNull(RoutineTimer.finishedEarlyBy(700, 600))
        assertNull(RoutineTimer.finishedEarlyBy(100, null))
    }

    @Test fun builderMinutesClampToColumnRange() {
        assertEquals(600, RoutineTimer.minutesToSeconds("10"))
        assertEquals(7200, RoutineTimer.minutesToSeconds("500"))
        assertNull(RoutineTimer.minutesToSeconds(""))
        assertNull(RoutineTimer.minutesToSeconds("0"))
        assertNull(RoutineTimer.minutesToSeconds("abc"))
        assertEquals("12:05", RoutineTimer.clock(725))
        assertEquals("0:00", RoutineTimer.clock(-4))
    }

    @Test fun suggestionAddsTenPercentRoundedUp() {
        // 60 + 120 + 180 = 360 s, +10% = 396 s, up to 420 s.
        assertEquals(420, RoutineTimer.suggestedSeconds(listOf(60, 120, 180, null)))
        assertNull(RoutineTimer.suggestedSeconds(listOf(null, 0)))
        assertEquals(60, RoutineTimer.suggestedSeconds(listOf(10)))
    }

    @Test fun throttleSendsFirstThenHoldsLatest() {
        val t = LatestWinsThrottle<Int>(4000)
        assertEquals(LatestWinsThrottle.Decision.SendNow(0), t.offer(0, 1_000))
        assertEquals(LatestWinsThrottle.Decision.WaitMs(3000), t.offer(1, 2_000))
        assertEquals(LatestWinsThrottle.Decision.WaitMs(2000), t.offer(2, 3_000)) // replaces 1
        assertNull(t.due(4_000))
        assertEquals(2, t.due(5_000))
        assertNull(t.due(9_500)) // nothing pending
        assertEquals(LatestWinsThrottle.Decision.SendNow(3), t.offer(3, 9_500))
    }

    @Test fun throttleCancelDropsPending() {
        val t = LatestWinsThrottle<String>(4000)
        t.offer("a", 0)
        t.offer("b", 100)
        t.cancel()
        assertNull(t.due(10_000))
    }

    @Test fun liveHelpers() {
        assertEquals(3, LiveProgress.stepNumber(2, 6))
        assertEquals(6, LiveProgress.stepNumber(9, 6))
        assertEquals(1, LiveProgress.stepNumber(-1, 6))
        assertTrue(LiveProgress.isFresh(1_000, 1_000 + 29 * 60_000))
        assertFalse(LiveProgress.isFresh(1_000, 1_000 + 31 * 60_000))
    }

    @Test fun speechLanguageFollowsWhatTheKidSees() {
        assertEquals("es-ES", Speech.languageFor(localized = true, deviceTag = "es-ES", familyLanguage = "en"))
        assertEquals("en-US", Speech.languageFor(localized = false, deviceTag = "es-ES", familyLanguage = "en"))
        assertEquals("pt-BR", Speech.languageFor(localized = false, deviceTag = "pt_BR", familyLanguage = null))
        assertEquals("en-US", Speech.languageFor(localized = false, deviceTag = null, familyLanguage = "not a tag!"))
        assertEquals("Brush teeth. Two minutes", Speech.textFor("Brush teeth", "Two minutes"))
        assertEquals("Done! Great", Speech.textFor("Done!", " Great "))
        assertEquals("Wash hands", Speech.textFor(" Wash hands ", null))
    }
}

class PremiumApiParsingTest {
    @Test fun premiumRequiredAndNotEnough() {
        val e = PremiumApi.errorFrom(403, """{"error":"premium_required","feature":"jars"}""")
        assertTrue(e.premiumRequired); assertEquals("premium_required", e.code)
        val n = PremiumApi.errorFrom(409, """{"error":"not_enough","availableCents":250}""")
        assertTrue(n.notEnough); assertEquals(250, n.available)
        val m = PremiumApi.errorFrom(409, """{"error":"not_enough","availableMinutes":15}""")
        assertEquals(15, m.available)
        val plain = PremiumApi.errorFrom(500, "<html>")
        assertFalse(plain.premiumRequired); assertEquals("Request failed (500)", plain.message)
        assertEquals("The team has not reached the target yet.", PremiumApi.errorFrom(409, """{"error":"not_met","message":"The team has not reached the target yet."}""").message)
    }

    @Test fun walletKeepsOlderServersWorking() {
        val old = SupabaseModule.json.decodeFromString(KidApi.WalletView.serializer(), """{"childId":"k","owedCents":300,"store":[]}""")
        assertEquals(300, old.spendable); assertFalse(old.jarsOn); assertFalse(old.hasMoneyNews)
        val jars = SupabaseModule.json.decodeFromString(KidApi.WalletView.serializer(), """
            {"childId":"k","owedCents":0,"balanceCents":-150,"spendableCents":0,
             "jars":{"enabled":true,"split":{"spend":70,"save":20,"give":10},"spendCents":-150,"saveCents":400,"giveCents":50},
             "minutes":{"balance":45,"earned":60,"used":15},
             "moneyNews":[{"id":"l1","kind":"fine","jar":"spend","amountCents":-200,"effectiveOn":"2026-10-19","note":"Broke the lamp","createdAt":"2026-10-19T10:00:00Z"}],
             "limits":{"premium":true,"goalLimit":null}}""")
        assertTrue(jars.jarsOn); assertEquals(150, jars.owes); assertEquals(0, jars.spendable); assertTrue(jars.hasMoneyNews)
        assertEquals(400, jars.jars!!.saveCents); assertEquals(45, jars.minutes!!.balance); assertEquals("Broke the lamp", jars.moneyNews.single().note)
    }

    @Test fun moneyResponseForAFreeFamilyHasNamesOnly() {
        val r = SupabaseModule.json.decodeFromString(MoneyResponse.serializer(), """{"premium":false,"currencyCode":"USD","timezone":null,"ready":true,"kids":[{"childId":"a","name":"Maya"}]}""")
        assertFalse(r.premium); assertNull(r.kids.single().balance)
    }

    @Test fun liveRowsDecodeLockedAndOpen() {
        val r = SupabaseModule.json.decodeFromString(LiveResponse.serializer(), """{"items":[
            {"routineId":"r","routineName":"Bedtime","routineColor":null,"childId":"c","childName":"Leo","childColor":null,"startedAt":"x","updatedAt":"y","locked":true},
            {"routineId":"r2","routineName":"Morning","childId":"c","childName":"Leo","locked":false,"stepIndex":2,"stepsTotal":6,"stepTitle":"Brush teeth"}]}""")
        assertTrue(r.items[0].locked); assertNull(r.items[0].stepIndex)
        assertEquals(2, r.items[1].stepIndex); assertEquals("Brush teeth", r.items[1].stepTitle)
    }
}
