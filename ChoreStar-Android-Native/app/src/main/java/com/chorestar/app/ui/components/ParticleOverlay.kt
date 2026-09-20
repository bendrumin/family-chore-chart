package com.chorestar.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.sin

/** The iOS ThemeParticleOverlay: a dozen glyphs drifting down with a sine sway. */
@Composable
fun ParticleOverlay(glyph: String?, count: Int = 12, alpha: Float = 0.5f, modifier: Modifier = Modifier) {
    if (glyph == null) return
    var height by remember { androidx.compose.runtime.mutableIntStateOf(0) }
    var width by remember { androidx.compose.runtime.mutableIntStateOf(0) }
    val density = LocalDensity.current
    Box(modifier.fillMaxSize().clipToBounds().onSizeChanged { height = it.height; width = it.width }) {
        val transition = rememberInfiniteTransition(label = "particles")
        repeat(count) { i ->
            val seed = (i + 1) * 17
            val duration = 7000 + (seed * 7) % 6000
            val t by transition.animateFloat(
                initialValue = 0f, targetValue = 1f,
                animationSpec = infiniteRepeatable(tween(duration, delayMillis = (seed * 13) % 4000, easing = LinearEasing), RepeatMode.Restart),
                label = "p$i",
            )
            val x0 = ((seed * 37) % 90) / 100f
            val sway = sin(t * 6.28f * 2) * 12f
            val size = 11 + (seed % 9)
            with(density) {
                Text(
                    glyph,
                    fontSize = size.sp,
                    modifier = Modifier
                        .offset(x = (width * x0).toDp() + sway.dp, y = ((height + 40 * density.density) * t).toDp() - 30.dp)
                        .alpha(alpha * (0.6f + (seed % 5) * 0.08f)),
                )
            }
        }
    }
}
