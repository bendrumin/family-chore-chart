package com.chorestar.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import com.chorestar.app.data.SeasonalTheme
import com.chorestar.app.data.ThemePreference
import com.chorestar.app.ui.theme.ColorRamp.mix
import com.chorestar.app.ui.theme.ColorRamp.step

/**
 * The colours a theme is made of: custom accent > active seasonal theme > brand.
 *
 * [primary] is the accent as chosen (the web's light primary). [secondary] is
 * the theme's second, saturated hue (the web's `highlight`), or the accent's
 * own 700 step for a picked colour, so a theme is never an unrelated pair.
 * [tint] is the pale wash a season may declare, for backdrops only.
 */
data class ActiveTheme(
    val primary: Color,
    val secondary: Color,
    val glyph: String?,
    val theme: SeasonalTheme?,
    val accentHex: String?,
    val tint: Color? = null,
) {
    /** The accent darkened until white text reads on it (brand #6366f1 → #5e61e5). Use under white type. */
    val fill: Color get() = ColorRamp.accessiblePairPreferWhite(primary).fill
    val gradient: List<Color> get() = listOf(fill, secondary)
}

val LocalActiveTheme = staticCompositionLocalOf { ActiveTheme(Indigo500, Violet500, null, null, null) }

fun resolveActiveTheme(pref: ThemePreference): ActiveTheme {
    val accent = pref.accentHex?.let { runCatching { Color(android.graphics.Color.parseColor(it)) }.getOrNull() }
    val theme = pref.activeTheme
    return when {
        accent != null -> ActiveTheme(accent, step(accent, 700), theme?.glyph, theme, pref.accentHex, theme?.tint?.let(::Color))
        theme != null -> ActiveTheme(Color(theme.primary), Color(theme.secondary), theme.glyph, theme, null, theme.tint?.let(::Color))
        else -> ActiveTheme(Indigo500, Violet500, null, null, null)
    }
}

/**
 * The whole Material scheme from the three theme colours.
 *
 * Accent roles come off the web's 50→900 ramp; fills are nudged until their
 * ink clears AA. Surfaces are the slate tokens with a few percent of the
 * accent mixed in, Material's own way of tinting, so a theme colours cards
 * and the canvas without ever putting text on a pale hue.
 */
private fun lightScheme(t: ActiveTheme): ColorScheme {
    val a = t.primary
    val p = ColorRamp.accessiblePairPreferWhite(a)
    val s = ColorRamp.accessiblePairPreferWhite(t.secondary)
    val tint = t.tint ?: step(t.secondary, 300)
    val ter = ColorRamp.accessiblePair(step(tint, 600))
    fun wash(base: Color, amount: Float) = mix(base, a, amount)
    return lightColorScheme(
        primary = p.fill, onPrimary = p.foreground,
        primaryContainer = step(a, 100), onPrimaryContainer = ColorRamp.ensureReadable(step(a, 800), step(a, 100)),
        inversePrimary = step(a, 300),
        secondary = s.fill, onSecondary = s.foreground,
        secondaryContainer = step(t.secondary, 100), onSecondaryContainer = ColorRamp.ensureReadable(step(t.secondary, 800), step(t.secondary, 100)),
        tertiary = ter.fill, onTertiary = ter.foreground,
        tertiaryContainer = mix(tint, Color.White, 0.55f), onTertiaryContainer = ColorRamp.ensureReadable(step(tint, 800), mix(tint, Color.White, 0.55f)),
        background = wash(Canvas, 0.012f), onBackground = Ink,
        surface = wash(Surface, 0.008f), onSurface = Ink,
        surfaceVariant = wash(Slate100, 0.02f), onSurfaceVariant = InkMuted,
        surfaceTint = p.fill,
        inverseSurface = Ink, inverseOnSurface = InkDark,
        outline = mix(Slate300, a, 0.15f), outlineVariant = mix(Slate200, a, 0.10f),
        error = ErrorLight, onError = Color.White,
        errorContainer = Color(0xFFFEE2E2), onErrorContainer = Color(0xFF991B1B),
        // Material's baseline containers are lavender; ours are the web's slate greys, warmed by the accent.
        surfaceContainerLowest = Surface,
        surfaceContainerLow = wash(Surface, 0.01f),
        surfaceContainer = wash(Slate50, 0.015f),
        surfaceContainerHigh = wash(Slate100, 0.02f),
        surfaceContainerHighest = wash(Slate150, 0.02f),
        scrim = Color.Black,
    )
}

private fun darkScheme(t: ActiveTheme): ColorScheme {
    // Dark mode lifts the accent (the web uses the 400 step) so it reads on slate.
    val a = step(t.primary, 400)
    val p = ColorRamp.accessiblePair(a)
    val s = ColorRamp.accessiblePair(step(t.secondary, 400))
    val tint = t.tint ?: step(t.secondary, 300)
    val ter = ColorRamp.accessiblePair(step(tint, 400))
    fun wash(base: Color, amount: Float) = mix(base, t.primary, amount)
    return darkColorScheme(
        primary = p.fill, onPrimary = p.foreground,
        primaryContainer = step(t.primary, 800), onPrimaryContainer = step(t.primary, 100),
        inversePrimary = step(t.primary, 600),
        secondary = s.fill, onSecondary = s.foreground,
        secondaryContainer = step(t.secondary, 800), onSecondaryContainer = step(t.secondary, 100),
        tertiary = ter.fill, onTertiary = ter.foreground,
        tertiaryContainer = mix(step(tint, 800), SurfaceDark, 0.3f), onTertiaryContainer = step(tint, 100),
        background = wash(CanvasDark, 0.06f), onBackground = InkDark,
        surface = wash(SurfaceDark, 0.05f), onSurface = InkDark,
        surfaceVariant = wash(SlateDark750, 0.07f), onSurfaceVariant = InkMutedDark,
        surfaceTint = p.fill,
        inverseSurface = InkDark, inverseOnSurface = Ink,
        outline = mix(SlateDark600, t.primary, 0.15f), outlineVariant = mix(SlateDark700, t.primary, 0.10f),
        error = ErrorDark, onError = Color(0xFF450A0A),
        errorContainer = Color(0xFF7F1D1D), onErrorContainer = Color(0xFFFECACA),
        surfaceContainerLowest = wash(SlateDark950, 0.05f),
        surfaceContainerLow = wash(SlateDark850, 0.06f),
        surfaceContainer = wash(SurfaceDark, 0.07f),
        surfaceContainerHigh = wash(SlateDark750, 0.08f),
        surfaceContainerHighest = wash(SlateDark700, 0.09f),
        scrim = Color.Black,
    )
}

/** Brand colours on Material 3, the whole scheme derived from the family's theme. Dynamic (wallpaper) colour is deliberately off. */
@Composable
fun ChoreStarTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    preference: ThemePreference = ThemePreference(false, null, null),
    content: @Composable () -> Unit,
) {
    val active = remember(preference) { resolveActiveTheme(preference) }
    val scheme = remember(active, darkTheme) { if (darkTheme) darkScheme(active) else lightScheme(active) }
    CompositionLocalProvider(LocalActiveTheme provides active) {
        MaterialTheme(colorScheme = scheme, typography = ChoreStarTypography, content = content)
    }
}
