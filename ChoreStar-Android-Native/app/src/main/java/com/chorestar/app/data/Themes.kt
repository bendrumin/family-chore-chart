package com.chorestar.app.data

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.LocalDate

/**
 * The seasonal theme catalog, shared with iOS SeasonalThemes.swift and the web
 * lib/constants/seasonal-themes.ts. Ids are the WEB ids (camelCase stPatricks and
 * newYear), which is what family_settings.custom_theme stores.
 */
data class SeasonalTheme(
    val id: String,
    val name: String,
    val emoji: String,
    val primary: Long,
    /** The web's `highlight`: a saturated second hue for badges, flames, gradients. */
    val secondary: Long,
    /** MM-DD inclusive; null for the premium themes, which never auto-activate. */
    val start: String?,
    val end: String?,
    val glyph: String,
    val premium: Boolean = false,
    /** A pale SECOND hue for washes and backdrops only, never a fill under text (the four seasons). */
    val tint: Long? = null,
)

object SeasonalThemes {
    val holidays = listOf(
        SeasonalTheme("christmas", "Christmas", "🎄", 0xFFDC2626, 0xFF218733, "12-01", "12-31", "❄️"),
        SeasonalTheme("thanksgiving", "Thanksgiving", "🦃", 0xFFEA8811, 0xFFC75A0D, "11-20", "11-30", "🍂"),
        SeasonalTheme("halloween", "Halloween", "🎃", 0xFFF79307, 0xFF8C24AB, "10-01", "10-31", "🎃"),
        SeasonalTheme("easter", "Easter", "🐰", 0xFFA855F7, 0xFFED789E, "04-01", "04-30", "🌸"),
        SeasonalTheme("valentine", "Valentine's Day", "💕", 0xFFEC4899, 0xFFD92E61, "02-10", "02-15", "💕"),
        SeasonalTheme("stPatricks", "St. Patrick's Day", "☘️", 0xFF22B84E, 0xFF148738, "03-10", "03-18", "☘️"),
        SeasonalTheme("newYear", "New Year", "🎉", 0xFF6366F1, 0xFF8C5CF7, "01-01", "01-07", "🎊"),
    )
    val seasons = listOf(
        SeasonalTheme("spring", "Spring", "🌸", 0xFFEE3C6B, 0xFFE7206B, "03-01", "05-31", "🌸", tint = 0xFFC5D8EB),
        SeasonalTheme("summer", "Summer", "☀️", 0xFF3A9AA3, 0xFFED706F, "06-01", "08-31", "✨", tint = 0xFFF1C8C1),
        SeasonalTheme("fall", "Fall", "🍂", 0xFFB31E11, 0xFFFA6A18, "09-01", "11-30", "🍂", tint = 0xFFEE9C15),
        SeasonalTheme("winter", "Winter", "❄️", 0xFF1A22B0, 0xFF2F7CC6, "12-01", "02-28", "❄️", tint = 0xFFA9ADB1),
    )
    val premium = listOf(
        SeasonalTheme("ocean", "Ocean", "🌊", 0xFF0284C7, 0xFF0A5CA6, null, null, "🫧", premium = true),
        SeasonalTheme("sunset", "Sunset", "🌅", 0xFFEA4C23, 0xFFF59E0A, null, null, "✨", premium = true),
        SeasonalTheme("forest", "Forest", "🌲", 0xFF158750, 0xFF0D6138, null, null, "🍃", premium = true),
        SeasonalTheme("aurora", "Aurora", "🌌", 0xFF592EBA, 0xFF1FAB8C, null, null, "✦", premium = true),
        SeasonalTheme("coral", "Coral", "🪸", 0xFFF56B5B, 0xFFF59E0A, null, null, "🫧", premium = true),
        SeasonalTheme("lavender", "Lavender", "💜", 0xFF9466DD, 0xFF6640B3, null, null, "✿", premium = true),
    )
    val all = holidays + seasons + premium

    fun byId(id: String?): SeasonalTheme? = id?.let { i -> all.firstOrNull { it.id.equals(i, ignoreCase = true) } }

    /** Holidays win over seasons; ranges compare month*100+day; winter wraps the year. */
    fun current(date: LocalDate = LocalDate.now()): SeasonalTheme? {
        val md = date.monthValue * 100 + date.dayOfMonth
        fun matches(t: SeasonalTheme): Boolean {
            val s = t.start?.replace("-", "")?.toInt() ?: return false
            val e = t.end?.replace("-", "")?.toInt() ?: return false
            return if (s <= e) md in s..e else md >= s || md <= e
        }
        return holidays.firstOrNull(::matches) ?: seasons.firstOrNull(::matches)
    }
}

/** The three keys iOS and the web keep in family_settings.custom_theme; everything else in that JSON is preserved. */
data class ThemePreference(val autoSeasonal: Boolean, val seasonalTheme: String?, val accentHex: String?) {
    /** "auto", "none", or a theme id: the same three-way value the iOS gallery binds to. */
    val selection: String get() = if (autoSeasonal) "auto" else seasonalTheme ?: "none"
    val activeTheme: SeasonalTheme? get() = if (autoSeasonal) SeasonalThemes.current() else SeasonalThemes.byId(seasonalTheme)

    companion object {
        fun from(json: JsonElement?): ThemePreference {
            val o = (json as? JsonObject) ?: return ThemePreference(false, null, null)
            return ThemePreference(
                autoSeasonal = o["autoSeasonal"]?.jsonPrimitive?.booleanOrNull ?: false,
                seasonalTheme = o["seasonalTheme"]?.takeIf { it !is JsonNull }?.jsonPrimitive?.contentOrNull,
                accentHex = o["accentColor"]?.takeIf { it !is JsonNull }?.jsonPrimitive?.contentOrNull?.let(::normalizeHex),
            )
        }

        fun normalizeHex(v: String?): String? {
            val s = v?.trim()?.lowercase() ?: return null
            return if (Regex("^#[0-9a-f]{6}$").matches(s)) s else null
        }
    }
}

/** Read-merge-write helper: returns the JSON to store with only the given keys changed. */
fun mergeCustomTheme(existing: JsonElement?, vararg changes: Pair<String, JsonElement>): JsonObject {
    val base = (existing as? JsonObject)?.toMutableMap() ?: mutableMapOf()
    for ((k, v) in changes) base[k] = v
    return JsonObject(base)
}

fun jsonString(v: String?): JsonElement = v?.let { JsonPrimitive(it) } ?: JsonNull
fun jsonBool(v: Boolean): JsonElement = JsonPrimitive(v)

/** Everything the family's Rewards & Currency screen edits, and the 36 currencies iOS and the web list. */
data class FamilyCurrency(val code: String, val symbol: String, val flag: String, val name: String, val decimals: Int = 2)

object Currencies {
    val all = listOf(
        FamilyCurrency("USD", "$", "🇺🇸", "US Dollar"), FamilyCurrency("EUR", "€", "🇪🇺", "Euro"), FamilyCurrency("GBP", "£", "🇬🇧", "British Pound"),
        FamilyCurrency("CAD", "$", "🇨🇦", "Canadian Dollar"), FamilyCurrency("AUD", "$", "🇦🇺", "Australian Dollar"), FamilyCurrency("NZD", "$", "🇳🇿", "New Zealand Dollar"),
        FamilyCurrency("SAR", "ر.س", "🇸🇦", "Saudi Riyal"), FamilyCurrency("AED", "د.إ", "🇦🇪", "UAE Dirham"), FamilyCurrency("QAR", "ر.ق", "🇶🇦", "Qatari Riyal"),
        FamilyCurrency("EGP", "E£", "🇪🇬", "Egyptian Pound"), FamilyCurrency("ILS", "₪", "🇮🇱", "Israeli Shekel"), FamilyCurrency("TRY", "₺", "🇹🇷", "Turkish Lira"),
        FamilyCurrency("JPY", "¥", "🇯🇵", "Japanese Yen", 0), FamilyCurrency("CNY", "¥", "🇨🇳", "Chinese Yuan"), FamilyCurrency("KRW", "₩", "🇰🇷", "South Korean Won", 0),
        FamilyCurrency("INR", "₹", "🇮🇳", "Indian Rupee"), FamilyCurrency("SGD", "$", "🇸🇬", "Singapore Dollar"), FamilyCurrency("HKD", "$", "🇭🇰", "Hong Kong Dollar"),
        FamilyCurrency("TWD", "NT$", "🇹🇼", "New Taiwan Dollar"), FamilyCurrency("THB", "฿", "🇹🇭", "Thai Baht"), FamilyCurrency("PHP", "₱", "🇵🇭", "Philippine Peso"),
        FamilyCurrency("MYR", "RM", "🇲🇾", "Malaysian Ringgit"), FamilyCurrency("IDR", "Rp", "🇮🇩", "Indonesian Rupiah"), FamilyCurrency("CHF", "Fr", "🇨🇭", "Swiss Franc"),
        FamilyCurrency("SEK", "kr", "🇸🇪", "Swedish Krona"), FamilyCurrency("NOK", "kr", "🇳🇴", "Norwegian Krone"), FamilyCurrency("DKK", "kr", "🇩🇰", "Danish Krone"),
        FamilyCurrency("PLN", "zł", "🇵🇱", "Polish Złoty"), FamilyCurrency("CZK", "Kč", "🇨🇿", "Czech Koruna"), FamilyCurrency("MXN", "$", "🇲🇽", "Mexican Peso"),
        FamilyCurrency("BRL", "R$", "🇧🇷", "Brazilian Real"), FamilyCurrency("COP", "$", "🇨🇴", "Colombian Peso"), FamilyCurrency("ARS", "$", "🇦🇷", "Argentine Peso"),
        FamilyCurrency("PEN", "S/", "🇵🇪", "Peruvian Sol"), FamilyCurrency("CLP", "$", "🇨🇱", "Chilean Peso", 0), FamilyCurrency("ZAR", "R", "🇿🇦", "South African Rand"),
    )
    fun find(code: String?): FamilyCurrency = all.firstOrNull { it.code.equals(code, true) }
        ?: FamilyCurrency(code?.uppercase() ?: "USD", Money.symbol(code), "💱", code?.uppercase() ?: "USD")
}

object TimeZones {
    /** id → city label, the same 41 iOS lists. */
    val all: List<Pair<String, String>> = listOf(
        "America/New_York" to "New York", "America/Chicago" to "Chicago", "America/Denver" to "Denver", "America/Los_Angeles" to "Los Angeles",
        "America/Toronto" to "Toronto", "America/Vancouver" to "Vancouver", "America/Mexico_City" to "Mexico City", "America/Sao_Paulo" to "São Paulo",
        "America/Buenos_Aires" to "Buenos Aires", "Europe/London" to "London", "Europe/Dublin" to "Dublin", "Europe/Paris" to "Paris", "Europe/Berlin" to "Berlin",
        "Europe/Amsterdam" to "Amsterdam", "Europe/Madrid" to "Madrid", "Europe/Rome" to "Rome", "Europe/Stockholm" to "Stockholm", "Europe/Warsaw" to "Warsaw",
        "Africa/Cairo" to "Cairo", "Africa/Johannesburg" to "Johannesburg", "Africa/Lagos" to "Lagos", "Asia/Riyadh" to "Riyadh", "Asia/Dubai" to "Dubai",
        "Asia/Qatar" to "Doha", "Asia/Kuwait" to "Kuwait City", "Asia/Bahrain" to "Manama", "Asia/Muscat" to "Muscat", "Asia/Jerusalem" to "Jerusalem",
        "Asia/Istanbul" to "Istanbul", "Asia/Karachi" to "Karachi", "Asia/Kolkata" to "Mumbai", "Asia/Bangkok" to "Bangkok", "Asia/Jakarta" to "Jakarta",
        "Asia/Singapore" to "Singapore", "Asia/Hong_Kong" to "Hong Kong", "Asia/Shanghai" to "Shanghai", "Asia/Tokyo" to "Tokyo", "Asia/Seoul" to "Seoul",
        "Australia/Sydney" to "Sydney", "Australia/Melbourne" to "Melbourne", "Pacific/Auckland" to "Auckland",
    )
}
