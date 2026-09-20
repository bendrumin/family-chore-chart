package com.chorestar.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chorestar.app.data.model.Child

/** The colour-plus-initials fallback every avatar path shares (photo avatars come later). */
@Composable
fun ChildAvatar(child: Child, size: Dp = 44.dp) {
    Box(
        Modifier.size(size).background(avatarColor(child.avatarColor), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            child.name.trim().take(1).uppercase(),
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = (size.value * 0.42f).sp,
            style = MaterialTheme.typography.titleMedium,
        )
    }
}

/** avatar_color holds either a hex string or one of the web's named swatches. */
fun avatarColor(value: String?): Color {
    val v = value?.trim()?.lowercase() ?: return Color(0xFF6366F1)
    if (v.startsWith("#") && (v.length == 7 || v.length == 9)) {
        return runCatching { Color(android.graphics.Color.parseColor(v)) }.getOrDefault(Color(0xFF6366F1))
    }
    return when (v) {
        "red" -> Color(0xFFEF4444); "orange" -> Color(0xFFF97316); "amber", "yellow" -> Color(0xFFF59E0B)
        "green" -> Color(0xFF22C55E); "teal" -> Color(0xFF14B8A6); "blue" -> Color(0xFF3B82F6)
        "indigo" -> Color(0xFF6366F1); "purple", "violet" -> Color(0xFF8B5CF6); "pink" -> Color(0xFFEC4899)
        else -> Color(0xFF6366F1)
    }
}
