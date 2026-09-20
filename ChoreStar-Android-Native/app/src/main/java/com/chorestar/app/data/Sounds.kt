package com.chorestar.app.data

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.sin

/**
 * The four cues iOS synthesises at launch (no audio assets): pop, success, coin,
 * cheer. Rendered as 16-bit mono PCM and played on a short-lived AudioTrack that
 * mixes with whatever else is playing.
 */
object Sounds {
    enum class Cue { Pop, Success, Coin, Cheer }

    private const val RATE = 44100
    private val cache = HashMap<Cue, ShortArray>()
    private val scope = CoroutineScope(Dispatchers.Default)

    fun play(cue: Cue, prefs: Prefs) {
        if (!prefs.soundEnabled) return
        scope.launch {
            val pcm = cache.getOrPut(cue) { render(cue) }
            runCatching {
                val track = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                    .setAudioFormat(AudioFormat.Builder().setSampleRate(RATE).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                    .setBufferSizeInBytes(pcm.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()
                track.write(pcm, 0, pcm.size)
                track.play()
                Thread.sleep((pcm.size * 1000L / RATE) + 50)
                track.release()
            }
        }
    }

    private fun render(cue: Cue): ShortArray = when (cue) {
        Cue.Pop -> tone(listOf(523.25 to 0.16))
        Cue.Success -> tone(listOf(1046.5 to 0.12, 1318.5 to 0.18))
        Cue.Coin -> tone(listOf(1568.0 to 0.08, 784.0 to 0.14))
        Cue.Cheer -> tone(listOf(523.25 to 0.1, 659.25 to 0.1, 783.99 to 0.1, 1046.5 to 0.16, 1318.5 to 0.08, 1568.0 to 0.22))
    }

    /** Sequential plucked notes (freq Hz to seconds) with a soft attack and exponential decay. */
    private fun tone(notes: List<Pair<Double, Double>>): ShortArray {
        val total = notes.sumOf { (it.second * RATE).toInt() }
        val out = ShortArray(total)
        var pos = 0
        for ((freq, secs) in notes) {
            val n = (secs * RATE).toInt()
            for (i in 0 until n) {
                val t = i.toDouble() / RATE
                val attack = minOf(1.0, i / (0.008 * RATE))
                val decay = Math.exp(-4.0 * t / secs)
                val v = sin(2 * PI * freq * t) * 0.35 + sin(2 * PI * freq * 2 * t) * 0.08
                out[pos + i] = (v * attack * decay * Short.MAX_VALUE).toInt().toShort()
            }
            pos += n
        }
        return out
    }
}
