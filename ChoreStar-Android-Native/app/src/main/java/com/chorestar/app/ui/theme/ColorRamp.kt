package com.chorestar.app.ui.theme

import androidx.compose.ui.graphics.Color
import kotlin.math.pow

/**
 * The web's colour maths, ported (chorestar-nextjs/lib/utils/accent-scale.ts
 * and contrast.ts): a Tailwind-shaped 50→900 ramp from one accent, WCAG
 * contrast, and the "nudge the fill until the pair passes" rule from
 * docs/DESIGN.md. Every Material role in Theme.kt is derived through here, so
 * a seasonal theme or a picked accent recolours the whole scheme, not just
 * the buttons, and never paints text it cannot carry.
 */
object ColorRamp {
    /** Mix ratio per step: toward white below 500, toward black above. Measured from Tailwind's indigo. */
    private val STEP_RATIOS = mapOf(
        50 to 0.935f, 100 to 0.881f, 200 to 0.758f, 300 to 0.573f, 400 to 0.314f,
        500 to 0f, 600 to 0.189f, 700 to 0.312f, 800 to 0.433f, 900 to 0.506f,
    )

    const val AA_NORMAL = 4.5f
    val ON_ACCENT_LIGHT = Color.White
    val ON_ACCENT_DARK = Color(0xFF111827)

    fun step(base: Color, step: Int): Color {
        val ratio = STEP_RATIOS[step] ?: error("no ramp step $step")
        if (ratio == 0f) return base
        return mix(base, if (step < 500) Color.White else Color.Black, ratio)
    }

    fun mix(a: Color, b: Color, amount: Float): Color = Color(
        red = a.red + (b.red - a.red) * amount,
        green = a.green + (b.green - a.green) * amount,
        blue = a.blue + (b.blue - a.blue) * amount,
        alpha = 1f,
    )

    fun luminance(c: Color): Float {
        fun lin(v: Float) = if (v <= 0.03928f) v / 12.92f else ((v + 0.055f) / 1.055f).pow(2.4f)
        return 0.2126f * lin(c.red) + 0.7152f * lin(c.green) + 0.0722f * lin(c.blue)
    }

    fun contrast(a: Color, b: Color): Float {
        val la = luminance(a); val lb = luminance(b)
        val hi = maxOf(la, lb); val lo = minOf(la, lb)
        return (hi + 0.05f) / (lo + 0.05f)
    }

    /** Moves [color] away from [background] in 5% steps until it reads at [target]. */
    fun ensureReadable(color: Color, background: Color, target: Float = AA_NORMAL): Color {
        if (contrast(color, background) >= target) return color
        val toward = if (luminance(background) > 0.5f) Color.Black else Color.White
        var best = color
        for (s in 1..20) {
            best = mix(color, toward, s / 20f)
            if (contrast(best, background) >= target) return best
        }
        return best
    }

    /** Whichever of white or dark ink reads better on this fill. */
    fun bestForeground(fill: Color): Color =
        if (contrast(fill, ON_ACCENT_LIGHT) >= contrast(fill, ON_ACCENT_DARK)) ON_ACCENT_LIGHT else ON_ACCENT_DARK

    data class Pair(val fill: Color, val foreground: Color)

    /** A fill and an ink that clear AA together; the fill is nudged, hue kept. */
    fun accessiblePair(fill: Color, target: Float = AA_NORMAL): Pair {
        val fg = bestForeground(fill)
        return Pair(ensureReadable(fill, fg, target), fg)
    }

    /** The hero rule: prefer white ink, darken the fill until AA passes (brand #6366f1 becomes #5e61e5). */
    fun accessiblePairPreferWhite(fill: Color, target: Float = AA_NORMAL): Pair {
        val adjusted = ensureReadable(fill, ON_ACCENT_LIGHT, target)
        return if (contrast(adjusted, ON_ACCENT_LIGHT) >= target) Pair(adjusted, ON_ACCENT_LIGHT) else accessiblePair(fill, target)
    }
}
