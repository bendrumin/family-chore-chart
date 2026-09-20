package com.chorestar.app.ui.family

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.Money
import com.chorestar.app.data.model.Child
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.avatarColor

/** iOS ChildrenView: cards with today's ring and earnings, kid login code, + to add. */
@Composable
fun FamilyScreen(state: DashboardState, onAddChild: () -> Unit, onOpenChild: (Child) -> Unit, onEditChild: (Child) -> Unit) {
    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text(stringResource(R.string.family_title), style = MaterialTheme.typography.headlineMedium)
                Text(stringResource(R.string.family_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            items(state.children, key = { it.id }) { child ->
                val due = state.dueOn(child.id, state.today)
                val done = state.doneOn(child.id, state.today)
                val earned = state.earnedCents(child.id, state.today)
                Card(Modifier.fillMaxWidth().clickable { onOpenChild(child) }) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        ChildAvatar(child, 64.dp)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(child.name, style = MaterialTheme.typography.titleMedium)
                            val choreCount = state.choresFor(child.id).size
                            val bits = listOfNotNull(
                                child.age?.let { stringResource(R.string.family_age, it) },
                                pluralStringResource(R.plurals.family_chore_count, choreCount, choreCount),
                            )
                            Text(bits.joinToString(" · "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (due.isNotEmpty()) {
                                Spacer(Modifier.height(8.dp))
                                LinearProgressIndicator(progress = { done.toFloat() / due.size }, modifier = Modifier.fillMaxWidth().height(6.dp), color = avatarColor(child.avatarColor))
                                Text("$done/${due.size}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            if (earned > 0) Text(Money.format(earned, state.currency), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                            IconButton(onClick = { onEditChild(child) }) { Icon(Icons.Filled.Edit, contentDescription = stringResource(R.string.edit_child), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                    }
                }
            }
            if (state.children.isEmpty() && !state.loading) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("👨‍👩‍👧", style = MaterialTheme.typography.displayMedium)
                        Text(stringResource(R.string.no_family_members), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.tap_plus_to_add_child), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            state.profile?.kidLoginCode?.let { code ->
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text(stringResource(R.string.family_kid_login_code), style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.family_kid_login_hint), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(code.uppercase(), style = MaterialTheme.typography.headlineMedium, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(top = 8.dp))
                        }
                    }
                }
            }
        }
        FloatingActionButton(onClick = onAddChild, modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp)) {
            Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.add_child))
        }
    }
}
