package com.chorestar.app.data

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/** Weeks start on Sunday, as they do on the web and in Postgres (day_of_week 0). */
object Dates {
    fun today(): LocalDate = LocalDate.now()

    /** 0 = Sunday .. 6 = Saturday, matching chores.days_of_week. */
    fun dayOfWeek(date: LocalDate = today()): Int = date.dayOfWeek.value % 7

    /** ISO date of the Sunday that starts the week containing [date]. */
    fun weekStart(date: LocalDate = today()): String =
        date.minusDays(dayOfWeek(date).toLong()).toString()

    fun previousWeek(weekStart: String): String = LocalDate.parse(weekStart).minusWeeks(1).toString()
    fun nextWeek(weekStart: String): String = LocalDate.parse(weekStart).plusWeeks(1).toString()
    fun isCurrentWeek(weekStart: String): Boolean = weekStart == weekStart(today())

    /**
     * The order the seven days are SHOWN, from the device locale: Monday-first
     * across most of Europe and Latin America, Saturday-first in parts of the
     * Middle East, Sunday-first in the US. Storage never changes: week_start
     * is always the Sunday and day_of_week 0 is always Sunday, on every
     * client, so a family on two continents sees one week.
     */
    fun displayOrder(locale: Locale = Locale.getDefault()): List<Int> {
        val first = WeekFields.of(locale).firstDayOfWeek.index
        return (0..6).map { (first + it) % 7 }
    }

    /** Localized day names indexed 0 = Sunday .. 6 = Saturday. */
    fun shortDayName(day: Int, locale: Locale = Locale.getDefault()): String =
        DayOfWeek.of(if (day == 0) 7 else day).getDisplayName(TextStyle.SHORT, locale)
    fun longDayName(day: Int, locale: Locale = Locale.getDefault()): String =
        DayOfWeek.of(if (day == 0) 7 else day).getDisplayName(TextStyle.FULL, locale)

    fun formatLong(date: LocalDate, locale: Locale = Locale.getDefault()): String =
        date.format(DateTimeFormatter.ofPattern("EEEE, d MMMM", locale))
    fun formatMedium(date: LocalDate, locale: Locale = Locale.getDefault()): String =
        date.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale))

    val DayOfWeek.index: Int get() = value % 7
}
