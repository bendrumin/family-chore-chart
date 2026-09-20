package com.chorestar.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.chorestar.app.data.Palette
import com.chorestar.app.data.model.Child

/** Signed URLs for children with an uploaded photo, keyed by child id; provided by the dashboard. */
val LocalAvatarPhotoUrls = compositionLocalOf<Map<String, String>> { emptyMap() }

/**
 * The same resolution order iOS uses: uploaded photo → DiceBear PNG → emoji on a
 * colour circle → initials on a colour circle.
 */
@Composable
fun ChildAvatar(child: Child, size: Dp = 44.dp, photoUrl: String? = LocalAvatarPhotoUrls.current[child.id]) {
    AvatarCircle(
        size = size,
        color = avatarColor(child.avatarColor),
        photoUrl = photoUrl?.takeIf { child.avatarPhotoPath != null },
        imageUrl = child.avatarUrl?.takeIf { it.isNotBlank() }?.let { diceBearPng(it, size.value.toInt() * 3) },
        emoji = child.avatarEmoji,
        initials = child.initials.ifEmpty { "?" },
    )
}

@Composable
fun AvatarCircle(size: Dp, color: Color, photoUrl: String?, imageUrl: String?, emoji: String?, initials: String) {
    val gradient = Brush.linearGradient(listOf(color, color.copy(alpha = 0.7f)))
    Box(Modifier.size(size).clip(CircleShape).background(gradient), contentAlignment = Alignment.Center) {
        when {
            photoUrl != null -> AsyncImage(photoUrl, contentDescription = null, modifier = Modifier.size(size), contentScale = ContentScale.Crop)
            imageUrl != null -> AsyncImage(imageUrl, contentDescription = null, modifier = Modifier.size(size), contentScale = ContentScale.Crop)
            emoji != null -> Text(emoji, fontSize = (size.value * 0.5f).sp)
            else -> Text(
                initials,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = (size.value * 0.4f).sp,
                style = MaterialTheme.typography.titleMedium,
            )
        }
    }
}

/** Legacy rows hold /svg? URLs; every platform rewrites them to PNG at a sane size. */
fun diceBearPng(url: String, size: Int): String {
    var u = url.replace("/svg?", "/png?")
    if (!u.contains("size=")) u += (if (u.contains("?")) "&" else "?") + "size=$size"
    return u
}

fun avatarColor(value: String?): Color = Color(Palette.hex(value))
