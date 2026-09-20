package com.chorestar.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.rotate
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

private val DEFAULT_PALETTE = listOf(Color(0xFF6366F1), Color(0xFF10B981), Color(0xFFF59E0B), Color(0xFFEC4899), Color(0xFFFACC15), Color(0xFFA855F7), Color(0xFF22D3EE))

/** The iOS ConfettiView: 60 pieces from the top centre, easing out over ~2.5 s, then gone. Draws nothing after. */
@Composable
fun Confetti(trigger: Any?, palette: List<Color> = DEFAULT_PALETTE, modifier: Modifier = Modifier) {
    val progress = remember { Animatable(0f) }
    val pieces = remember(trigger) {
        List(60) {
            Piece(
                color = palette.random(), size = 8f + Random.nextFloat() * 8f, drift = -100f + Random.nextFloat() * 200f,
                delay = Random.nextFloat() * 0.12f, speed = 0.6f + Random.nextFloat() * 0.4f, spin = 360f + Random.nextFloat() * 360f,
                shape = Random.nextInt(4), x0 = -50f + Random.nextFloat() * 100f,
            )
        }
    }
    LaunchedEffect(trigger) {
        if (trigger == null) return@LaunchedEffect
        progress.snapTo(0f)
        progress.animateTo(1f, tween(2500))
    }
    val t = progress.value
    if (t <= 0f || t >= 1f) return
    Canvas(modifier.fillMaxSize()) {
        val d = density
        pieces.forEach { p ->
            val local = ((t - p.delay) / p.speed).coerceIn(0f, 1f)
            if (local <= 0f) return@forEach
            val eased = 1 - (1 - local) * (1 - local)
            val x = size.width / 2 + (p.x0 + p.drift * eased) * d
            val y = -20f * d + (size.height + 40f * d) * eased
            val alpha = (1 - local).coerceIn(0f, 1f)
            val s = p.size * d
            rotate(p.spin * eased, pivot = Offset(x, y)) {
                when (p.shape) {
                    0 -> drawCircle(p.color.copy(alpha = alpha), radius = s / 2, center = Offset(x, y))
                    1 -> drawRect(p.color.copy(alpha = alpha), topLeft = Offset(x - s / 2, y - s / 2), size = Size(s, s))
                    2 -> drawPath(Path().apply { moveTo(x, y - s / 2); lineTo(x + s / 2, y + s / 2); lineTo(x - s / 2, y + s / 2); close() }, p.color.copy(alpha = alpha))
                    else -> drawPath(star(x, y, s / 2), p.color.copy(alpha = alpha))
                }
            }
        }
    }
}

private fun star(cx: Float, cy: Float, r: Float): Path = Path().apply {
    for (i in 0 until 10) {
        val radius = if (i % 2 == 0) r else r * 0.45f
        val a = Math.toRadians((i * 36 - 90).toDouble())
        val x = cx + (radius * cos(a)).toFloat()
        val y = cy + (radius * sin(a)).toFloat()
        if (i == 0) moveTo(x, y) else lineTo(x, y)
    }
    close()
}

private data class Piece(val color: Color, val size: Float, val drift: Float, val delay: Float, val speed: Float, val spin: Float, val shape: Int, val x0: Float)
