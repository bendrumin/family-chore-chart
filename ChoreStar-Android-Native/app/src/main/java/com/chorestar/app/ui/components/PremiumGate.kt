package com.chorestar.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chorestar.app.R

/** The small "👑 Premium" tag next to a locked control. */
@Composable
fun PremiumTag(modifier: Modifier = Modifier) {
    Text(
        "👑 " + stringResource(R.string.premium_tag),
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onTertiaryContainer,
        modifier = modifier.background(MaterialTheme.colorScheme.tertiaryContainer, RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

/** A Premium tool shown as a preview: lock, what it does, and a tap that opens the paywall with its source. */
@Composable
fun LockedFeatureRow(icon: String, title: String, subtitle: String?, onUnlock: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onUnlock).padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Filled.Lock, contentDescription = stringResource(R.string.premium_tag), tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
    }
}

/** A whole card's worth of Premium: what it is, and See Premium. */
@Composable
fun PremiumGateCard(icon: String, title: String, body: String, onSeePremium: () -> Unit, modifier: Modifier = Modifier, content: (@Composable () -> Unit)? = null) {
    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(icon, style = MaterialTheme.typography.headlineSmall); Spacer(Modifier.width(10.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                PremiumTag()
            }
            Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            content?.invoke()
            Button(onClick = onSeePremium, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.see_premium)) }
        }
    }
}

/** A text button that reads "👑 See Premium", for inline locks. */
@Composable
fun SeePremiumButton(onClick: () -> Unit) {
    TextButton(onClick = onClick) { Text("👑 " + stringResource(R.string.see_premium)) }
}
