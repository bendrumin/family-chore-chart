package com.chorestar.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import com.chorestar.app.data.SeasonalTheme
import com.chorestar.app.data.ThemePreference

/** The colours the hero and kid screens paint with: custom accent > active seasonal theme > brand. */
data class ActiveTheme(val primary: Color, val secondary: Color, val glyph: String?, val theme: SeasonalTheme?, val accentHex: String?) {
    val gradient: List<Color> get() = listOf(primary, secondary)
}

val LocalActiveTheme = staticCompositionLocalOf { ActiveTheme(Indigo500, Violet500, null, null, null) }

fun resolveActiveTheme(pref: ThemePreference): ActiveTheme {
    val accent = pref.accentHex?.let { runCatching { Color(android.graphics.Color.parseColor(it)) }.getOrNull() }
    val theme = pref.activeTheme
    return when {
        accent != null -> ActiveTheme(accent, accent, theme?.glyph, theme, pref.accentHex)
        theme != null -> ActiveTheme(Color(theme.primary), Color(theme.secondary), theme.glyph, theme, null)
        else -> ActiveTheme(Indigo500, Violet500, null, null, null)
    }
}

private fun lightColors(primary: Color) = lightColorScheme(
    primary = primary,
    onPrimary = Color.White,
    primaryContainer = primary.copy(alpha = 0.14f),
    onPrimaryContainer = primary,
    secondary = Violet500,
    onSecondary = Color.White,
    secondaryContainer = Violet100,
    background = Canvas,
    onBackground = Ink,
    surface = Surface,
    onSurface = Ink,
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = InkMuted,
    outline = Color(0xFFE2E8F0),
    error = Color(0xFFDC2626),
    // Material's baseline surface containers are lavender-tinted; ours are the web's slate greys.
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFFFFFFF),
    surfaceContainer = Color(0xFFF8FAFC),
    surfaceContainerHigh = Color(0xFFF1F5F9),
    surfaceContainerHighest = Color(0xFFE9EEF5),
)

private fun darkColors(primary: Color) = darkColorScheme(
    primary = primary,
    onPrimary = Color.White,
    primaryContainer = primary.copy(alpha = 0.3f),
    onPrimaryContainer = Color(0xFFE0E7FF),
    secondary = Color(0xFFA78BFA),
    onSecondary = Color(0xFF2E1065),
    secondaryContainer = Color(0xFF4C1D95),
    background = CanvasDark,
    onBackground = Color(0xFFF1F5F9),
    surface = SurfaceDark,
    onSurface = Color(0xFFF1F5F9),
    surfaceVariant = Color(0xFF273449),
    onSurfaceVariant = Color(0xFF94A3B8),
    outline = Color(0xFF374151),
    error = Color(0xFFF87171),
    surfaceContainerLowest = Color(0xFF0B1220),
    surfaceContainerLow = Color(0xFF1A2333),
    surfaceContainer = Color(0xFF1F2937),
    surfaceContainerHigh = Color(0xFF273449),
    surfaceContainerHighest = Color(0xFF334155),
)

/** Brand colors on Material 3, tinted by the family's theme. Dynamic (wallpaper) color is deliberately off. */
@Composable
fun ChoreStarTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    preference: ThemePreference = ThemePreference(false, null, null),
    content: @Composable () -> Unit,
) {
    val active = resolveActiveTheme(preference)
    val primary = if (darkTheme && active.accentHex == null && active.theme == null) Color(0xFF818CF8) else active.primary
    CompositionLocalProvider(LocalActiveTheme provides active) {
        MaterialTheme(
            colorScheme = if (darkTheme) darkColors(primary) else lightColors(primary),
            typography = ChoreStarTypography,
            content = content,
        )
    }
}
