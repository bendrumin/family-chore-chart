package com.chorestar.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Indigo500,
    onPrimary = Color.White,
    primaryContainer = Indigo100,
    onPrimaryContainer = Indigo600,
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
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF818CF8),
    onPrimary = Color(0xFF1E1B4B),
    primaryContainer = Color(0xFF3730A3),
    onPrimaryContainer = Indigo100,
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
)

/** Brand colors on Material 3. Dynamic (wallpaper) color is deliberately off. */
@Composable
fun ChoreStarTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = ChoreStarTypography,
        content = content,
    )
}
