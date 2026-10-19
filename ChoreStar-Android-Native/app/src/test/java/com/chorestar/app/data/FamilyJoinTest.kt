package com.chorestar.app.data

import com.chorestar.app.data.ChoreStarRepository.Companion.joinErrorForText
import com.chorestar.app.data.ChoreStarRepository.Companion.normalizeJoinCode
import com.chorestar.app.data.ChoreStarRepository.Companion.parseOwnerId
import com.chorestar.app.data.ChoreStarRepository.Companion.paywallSource
import com.chorestar.app.data.ChoreStarRepository.JoinError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FamilyJoinTest {
    @Test fun normalizesCode() {
        assertEquals("abcd2345", normalizeJoinCode("  ABcd2345 \n"))
    }

    @Test fun ownerIdFromRpcBody() {
        assertEquals("0b7c1f9e-1111-2222-3333-444455556666", parseOwnerId("\"0b7c1f9e-1111-2222-3333-444455556666\""))
        assertEquals("0b7c1f9e-1111-2222-3333-444455556666", parseOwnerId("0b7c1f9e-1111-2222-3333-444455556666"))
    }

    @Test fun nullOrEmptyBodyMeansCodeNotFound() {
        assertNull(parseOwnerId(null))
        assertNull(parseOwnerId(""))
        assertNull(parseOwnerId("null"))
        assertNull(parseOwnerId("  null "))
        assertNull(parseOwnerId("\"\""))
    }

    @Test fun mapsServerErrors() {
        assertEquals(JoinError.NotFound, joinErrorForText("code_not_found"))
        assertEquals(JoinError.OwnFamily, joinErrorForText("P0001 own_family"))
        assertEquals(JoinError.NotPremium, joinErrorForText("raise: family_not_premium"))
        assertEquals(JoinError.TooManyAttempts, joinErrorForText("hint: too_many_attempts"))
        assertEquals(JoinError.Already, joinErrorForText("duplicate key value violates unique constraint (23505)"))
        assertNull(joinErrorForText("not_signed_in"))
        assertNull(joinErrorForText("network down"))
    }

    @Test fun paywallSourceFitsColumn() {
        assertEquals("limit_chores", paywallSource(" limit_chores "))
        assertEquals("unknown", paywallSource(""))
        assertEquals(40, paywallSource("x".repeat(60)).length)
    }
}
