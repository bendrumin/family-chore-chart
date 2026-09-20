package com.chorestar.app.data

import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

/**
 * Money is integer cents in the database, whatever the currency. Display follows
 * the phone's locale (so a Spanish phone shows "0,10 US$"), with the currency's
 * own fraction digits (none for JPY, KRW, CLP).
 */
object Money {
    private val zeroDecimal = setOf("JPY", "KRW", "CLP")

    fun currency(code: String?): Currency =
        runCatching { Currency.getInstance(code?.uppercase() ?: "USD") }.getOrDefault(Currency.getInstance("USD"))

    fun decimals(code: String?): Int = if ((code ?: "USD").uppercase() in zeroDecimal) 0 else 2

    fun format(cents: Int, code: String?, locale: Locale = Locale.getDefault()): String {
        val cur = currency(code)
        val fmt = NumberFormat.getCurrencyInstance(locale)
        fmt.currency = cur
        val d = decimals(code)
        fmt.minimumFractionDigits = d
        fmt.maximumFractionDigits = d
        return fmt.format(cents / 100.0)
    }

    fun symbol(code: String?, locale: Locale = Locale.getDefault()): String = currency(code).getSymbol(locale)

    /** "0.10" style plain number for an editable field, in the locale's digits and separator. */
    fun plain(cents: Int, code: String?, locale: Locale = Locale.getDefault()): String {
        val fmt = NumberFormat.getNumberInstance(locale)
        val d = decimals(code)
        fmt.minimumFractionDigits = d
        fmt.maximumFractionDigits = d
        fmt.isGroupingUsed = false
        return fmt.format(cents / 100.0)
    }

    /** Parses what a person typed into a money field back to cents; null when it is not a number. */
    fun parseCents(text: String, locale: Locale = Locale.getDefault()): Int? {
        val cleaned = text.trim().replace(Regex("[^0-9.,]"), "")
        if (cleaned.isEmpty()) return null
        val n = runCatching { NumberFormat.getNumberInstance(locale).parse(cleaned)?.toDouble() }.getOrNull()
            ?: cleaned.replace(',', '.').toDoubleOrNull() ?: return null
        return Math.round(n * 100).toInt()
    }
}
