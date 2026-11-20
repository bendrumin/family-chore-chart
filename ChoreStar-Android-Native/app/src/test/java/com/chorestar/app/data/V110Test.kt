package com.chorestar.app.data

import com.chorestar.app.data.model.RoutineTemplates
import com.chorestar.app.ui.settings.PaywallSpotlight
import com.chorestar.app.ui.settings.kidLoginUrl
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Android 1.1.0: Star Pets, pet asks, the yearly switch, the Premium routine library and the kid login QR. */
class StarPetsTest {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    /** Trimmed from a real GET /api/kid/pet answer (lib/pets/state.ts), extra server fields included. */
    private val sample = """
        {"childId":"c1","request":{"species":"owl"},"pet":{"enabled":true,"adopted":true,"premium":false,"species":"pup","name":"Biscuit",
        "adoptedOn":"2026-11-01","xp":420,"breakdown":null,"level":9,"trueLevel":12,"stage":"kid","star":false,"heldBack":true,
        "levelStartXp":400,"nextLevelXp":null,"levelPercent":100,"nextStage":{"stage":"teen","level":10},"nextUnlock":null,"mood":"hungry",
        "equipped":{"hat":null,"accessory":null,"habitat":null},"chosen":{"hat":"cap","accessory":null,"habitat":null},
        "wardrobe":[{"id":"cap","slot":"hat","emoji":"🧢","state":"premium","equipped":false,"level":3,"month":null}],
        "drop":{"itemId":"santa_hat","slot":"hat","emoji":"🎅","owned":false,"collectible":false,"xpThisMonth":40,"goal":150,"locked":true},
        "speciesOptions":[{"id":"pup","locked":false},{"id":"owl","locked":true}]}}
    """.trimIndent()

    @Test fun decodesTheServersPetAndTheAsk() {
        val r = json.decodeFromString(StarPets.KidResponse.serializer(), sample)
        val pet = r.pet!!
        assertEquals("owl", r.request?.species)
        assertEquals("Biscuit", pet.name)
        assertTrue(pet.heldBack)
        assertFalse(pet.wardrobe.single().wearable)
        assertTrue(pet.drop!!.locked)
        assertEquals(listOf(false, true), pet.speciesOptions.map { it.locked })
    }

    @Test fun artUrlCarriesOnlyWhatToDraw() {
        val url = StarPets.artUrl("kitty", "teen", "happy", star = true, equipped = StarPets.Equipped(hat = "cap"), sizePx = 900)
        assertTrue(url.contains("/api/pets/art?species=kitty&stage=teen&mood=happy&star=1&size=600&hat=cap&habitat="))
        assertTrue(StarPets.artUrl("pup", "baby", habitat = false).endsWith("habitat=none"))
    }

    @Test fun growthIsCelebratedOncePerDeviceStarFirst() {
        val pet = StarPets.State(adopted = true, name = "Biscuit", level = 10, stage = "teen")
        assertNull("first sight just remembers", StarPets.growth(null, pet))
        assertNull("nothing new", StarPets.growth("10|teen|0", pet))
        assertEquals(StarPets.Growth("pet.grewUp", listOf("Biscuit", "@stage:teen")), StarPets.growth("9|kid|0", pet))
        assertEquals("pet.levelUp", StarPets.growth("8|teen|0", pet.copy(level = 9))?.key)
        assertEquals("pet.becameStar", StarPets.growth("10|teen|0", pet.copy(star = true))?.key)
        assertEquals("10|teen|0", StarPets.seenKey(pet))
    }
}

class YearlyUpsellTest {
    private val day = 24L * 60 * 60 * 1000

    @Test fun onlyMonthlyPayersPastTheirFirstRenewal() {
        val now = 100 * day
        assertTrue(YearlyUpsell.eligible(PlayBilling.MONTHLY, now - 40 * day, now))
        assertFalse("first month", YearlyUpsell.eligible(PlayBilling.MONTHLY, now - 20 * day, now))
        assertFalse("already yearly", YearlyUpsell.eligible(PlayBilling.YEARLY, now - 400 * day, now))
        assertFalse(YearlyUpsell.eligible(null, 0, now))
    }

    @Test fun savingsRoundDownAndNeverGoNegative() {
        assertEquals(33, YearlyUpsell.savingsPercent(4_990_000, 39_990_000))
        assertEquals(0, YearlyUpsell.savingsPercent(1_000_000, 12_000_000))
        assertEquals(0, YearlyUpsell.savingsPercent(1_000_000, 13_000_000))
        assertEquals(0, YearlyUpsell.savingsPercent(0, 39_990_000))
    }

    @Test fun notNowLastsUntilItsDate() {
        assertTrue(YearlyUpsell.snoozed(snoozedUntilMillis = 200, nowMillis = 100))
        assertFalse(YearlyUpsell.snoozed(snoozedUntilMillis = 200, nowMillis = 200))
        assertFalse(YearlyUpsell.snoozed(snoozedUntilMillis = 0, nowMillis = 100))
    }
}

class RoutineLibraryTest {
    @Test fun theTenPremiumTemplatesFollowTheFreeFour() {
        assertEquals(4, RoutineTemplates.all.size)
        assertEquals(10, RoutineTemplates.premiumLibrary.size)
        assertTrue(RoutineTemplates.premiumLibrary.all { it.premium } && RoutineTemplates.all.none { it.premium })
        assertEquals("School Morning Express", RoutineTemplates.library[4].name)
    }

    @Test fun everyTemplateNameAndStepIsTranslated() {
        val texts = RoutineTemplates.library.flatMap { t -> listOf(t.name) + t.steps.map { it.first } }
        val missing = texts.filter { it !in RoutineTemplates.localized }
        assertTrue("untranslated: $missing", missing.isEmpty())
    }

    @Test fun thePaywallLeadsWithWhatWasTapped() {
        assertNotNull(PaywallSpotlight.forSource("routine_templates"))
        assertNotNull(PaywallSpotlight.forSource("pet_request"))
        assertNotNull(PaywallSpotlight.forSource("gate_sharing"))
        assertEquals(4, PaywallSpotlight.forSource("pet_request")!!.rows.size)
        assertNull(PaywallSpotlight.forSource("settings_upgrade"))
    }

    @Test fun kidLoginLinkOpensWithTheCodeFilledIn() {
        assertEquals("https://chorestar.app/kid-login/b5aceec8", kidLoginUrl("b5aceec8"))
        assertEquals("https://chorestar.app/kid-login/a%20b", kidLoginUrl("a b"))
    }
}
