package com.chorestar.app.data

import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

object Money {
    fun format(cents: Int, currencyCode: String?): String {
        val fmt = NumberFormat.getCurrencyInstance(Locale.getDefault())
        runCatching { fmt.currency = Currency.getInstance(currencyCode ?: "USD") }
        return fmt.format(cents / 100.0)
    }
}
