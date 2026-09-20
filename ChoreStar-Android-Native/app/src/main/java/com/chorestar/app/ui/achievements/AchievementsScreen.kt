package com.chorestar.app.ui.achievements

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.BadgeDef
import com.chorestar.app.data.BadgeProgress
import com.chorestar.app.ui.theme.Success
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/** iOS AchievementsView, shown to parents (child detail) and kids (badge cabinet) alike. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AchievementsScreen(childName: String, progress: List<BadgeProgress>, onBack: () -> Unit) {
    val earned = progress.count { it.earned }
    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = { TopAppBar(windowInsets = WindowInsets(0), title = { Text(stringResource(R.string.achievements)) }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } }) },
    ) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("🏆", style = MaterialTheme.typography.displayMedium)
                    Text(stringResource(R.string.childs_achievements, childName), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.badges_earned_of, earned, progress.size), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                }
            }
            items(progress, key = { it.def.id }) { p -> BadgeCard(p) }
        }
    }
}

@Composable
fun BadgeCard(p: BadgeProgress) {
    val gradient = Brush.linearGradient(p.def.rarity.colors.map { Color(it) })
    Card(Modifier.fillMaxWidth().alpha(if (p.earned) 1f else 0.92f).border(1.5.dp, if (p.earned) Color(p.def.rarity.colors[0]).copy(alpha = 0.45f) else Color.Transparent, RoundedCornerShape(16.dp)), shape = RoundedCornerShape(16.dp)) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(64.dp).clip(CircleShape).then(if (p.earned) Modifier.background(gradient) else Modifier.background(MaterialTheme.colorScheme.surfaceVariant)), contentAlignment = Alignment.Center) {
                Text(p.def.icon, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.alpha(if (p.earned) 1f else 0.4f))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(p.def.name), style = MaterialTheme.typography.titleMedium, maxLines = 1)
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(p.def.rarity.label), style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.background(gradient, RoundedCornerShape(8.dp)).padding(horizontal = 6.dp, vertical = 2.dp))
                }
                Text(stringResource(p.def.description), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                if (p.earned) {
                    val date = p.earnedAt?.let { runCatching { OffsetDateTime.parse(it).toLocalDate().format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(Locale.getDefault())) }.getOrNull() }
                    Text("✅ " + (date?.let { stringResource(R.string.earned_on, it) } ?: stringResource(R.string.stats_earned)), style = MaterialTheme.typography.labelMedium, color = Success)
                } else {
                    LinearProgressIndicator(progress = { p.ratio }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp).height(6.dp), color = Color(p.def.rarity.colors[0]))
                    Text("${p.current}/${p.required}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

/** The parent-side "Achievement unlocked" alert after a tick. */
@Composable
fun AchievementUnlockedDialog(badges: List<BadgeDef>, onDismiss: () -> Unit) {
    if (badges.isEmpty()) return
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.achievement_unlocked)) },
        text = { Column { badges.forEach { b -> Text("${b.icon} " + stringResource(b.name), style = MaterialTheme.typography.titleMedium); Text(stringResource(b.description), color = MaterialTheme.colorScheme.onSurfaceVariant) } } },
        confirmButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.ok_label)) } },
    )
}
