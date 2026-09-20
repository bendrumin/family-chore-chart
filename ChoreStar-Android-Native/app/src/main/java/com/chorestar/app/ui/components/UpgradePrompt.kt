package com.chorestar.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.chorestar.app.R

enum class LimitType { Children, Chores }

/** The free plan's hard limits: 3 children, 20 chores. Same copy as iOS UpgradePromptView. */
@Composable
fun UpgradePrompt(type: LimitType, currentCount: Int, limit: Int, onSeePlans: () -> Unit, onDismiss: () -> Unit) {
    val items = pluralStringResource(if (type == LimitType.Children) R.plurals.limit_items_children else R.plurals.limit_items_chores, limit)
    val itemsNow = pluralStringResource(if (type == LimitType.Children) R.plurals.limit_items_children else R.plurals.limit_items_chores, currentCount)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(if (type == LimitType.Children) R.string.limit_child_title else R.string.limit_chore_title)) },
        text = {
            Column {
                Text(stringResource(R.string.limit_reached_body, limit, items))
                Text(stringResource(R.string.limit_current_body, currentCount, itemsNow))
                Spacer(Modifier.height(12.dp))
                Text("• " + stringResource(R.string.premium_bullet_unlimited), style = MaterialTheme.typography.bodyMedium)
                Text("• " + stringResource(R.string.premium_bullet_store), style = MaterialTheme.typography.bodyMedium)
                Text("• " + stringResource(R.string.premium_bullet_themes), style = MaterialTheme.typography.bodyMedium)
            }
        },
        confirmButton = { TextButton(onClick = onSeePlans) { Text(stringResource(R.string.see_premium_plans)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.not_now)) } },
    )
}
