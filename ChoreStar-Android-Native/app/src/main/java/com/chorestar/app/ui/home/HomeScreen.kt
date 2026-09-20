package com.chorestar.app.ui.home

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.chorestar.app.R
import com.chorestar.app.data.Dates
import com.chorestar.app.data.Money
import com.chorestar.app.data.model.Child
import com.chorestar.app.data.model.PendingApproval
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.components.ChildAvatar
import com.chorestar.app.ui.components.avatarColor
import com.chorestar.app.ui.components.ParticleOverlay
import com.chorestar.app.ui.theme.LocalActiveTheme
import com.chorestar.app.ui.theme.Success
import com.chorestar.app.ui.theme.Warning
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/** iOS DashboardView: hero, getting started, needs-your-OK tray, today's chores. */
@Composable
fun HomeScreen(vm: DashboardViewModel, state: DashboardState, onOpenChores: () -> Unit, onOpenChild: (Child) -> Unit, onOpenFamily: () -> Unit, onKidMode: () -> Unit = {}) {
    PullToRefreshBox(isRefreshing = state.loading, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
        if (state.loading && state.children.isEmpty()) {
            Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) { CircularProgressIndicator() }
            return@PullToRefreshBox
        }
        val today = state.today
        val onVacation = state.isOnVacationToday
        val dueToday = state.children.flatMap { c -> state.dueOn(c.id, today).map { c to it } }
        val familyDone = dueToday.count { (_, chore) -> state.isDone(chore.id, today) }
        val earnedToday = state.children.sumOf { state.earnedCents(it.id, today) }

        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { HeroCard(vm, state, familyDone, dueToday.size, earnedToday, onVacation, onOpenChild) }
            if (state.pinChildIds.isNotEmpty()) item {
                OutlinedButton(onClick = onKidMode, modifier = Modifier.fillMaxWidth()) { Text("🧒 " + stringResource(R.string.kid_mode)) }
            }

            if (state.children.isEmpty() || state.chores.isEmpty()) item { GettingStartedCard(state, onOpenFamily, onOpenChores) }

            if (state.pendingApprovals.isNotEmpty() || state.pendingRedemptions.isNotEmpty()) item { ApprovalTray(vm, state) }

            if (state.chores.isNotEmpty()) {
                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.todays_chores), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                        Text("$familyDone/${dueToday.size}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (state.settings?.isPerChore != true && !onVacation) {
                        Text(
                            stringResource(R.string.flat_rate_explainer, Money.format(state.settings?.dailyRewardCents ?: 7, state.currency)),
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (dueToday.isEmpty()) {
                    item {
                        Text(
                            stringResource(if (onVacation) R.string.vacation_mode_on_chores else R.string.nothing_due_today_long),
                            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    item {
                        Card(Modifier.fillMaxWidth()) {
                            Column {
                                dueToday.forEachIndexed { i, (child, chore) ->
                                    if (i > 0) HorizontalDivider(Modifier.padding(start = 56.dp))
                                    val done = state.isDone(chore.id, today)
                                    val pending = state.isPending(chore.id, today)
                                    Row(
                                        Modifier.fillMaxWidth().clickable { vm.toggleToday(chore) }.padding(horizontal = 12.dp, vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        when {
                                            pending -> Icon(Icons.Filled.Schedule, contentDescription = stringResource(R.string.chore_state_waiting_tap), tint = Warning)
                                            done -> Icon(Icons.Filled.CheckCircle, contentDescription = stringResource(R.string.chore_state_done), tint = Success)
                                            else -> Icon(Icons.Outlined.Circle, contentDescription = stringResource(R.string.chore_state_not_done), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Spacer(Modifier.width(12.dp))
                                        Text(chore.icon ?: "📝", style = MaterialTheme.typography.titleLarge)
                                        Spacer(Modifier.width(10.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(chore.name, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                                textDecoration = if (done) TextDecoration.LineThrough else null,
                                                color = if (done) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                                            Text(child.name, style = MaterialTheme.typography.labelSmall, color = avatarColor(child.avatarColor))
                                        }
                                        if (state.settings?.isPerChore == true) Text(Money.format(chore.rewardCents, state.currency), style = MaterialTheme.typography.bodyMedium, color = if (done) Success else MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HeroCard(vm: DashboardViewModel, state: DashboardState, done: Int, due: Int, earnedCents: Int, onVacation: Boolean, onOpenChild: (Child) -> Unit) {
    val hour = LocalTime.now().hour
    val greeting = when {
        hour < 12 -> "🌅 " + stringResource(R.string.greeting_morning)
        hour < 17 -> "☀️ " + stringResource(R.string.greeting_afternoon)
        hour < 21 -> "🌇 " + stringResource(R.string.greeting_evening)
        else -> "🌙 " + stringResource(R.string.greeting_night)
    }
    val date = Dates.formatLong(LocalDate.now())
    val resume = state.vacationResumeDate
    val through = state.settings?.vacationEndsOn?.let { runCatching { LocalDate.parse(it).format(DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.getDefault())) }.getOrNull() }
    val active = LocalActiveTheme.current
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
        Box(Modifier.background(Brush.linearGradient(active.gradient))) {
        ParticleOverlay(active.glyph)
        Column(Modifier.padding(20.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(if (onVacation) stringResource(R.string.on_vacation) else greeting, color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodyLarge)
                Text(if (onVacation && through != null) stringResource(R.string.through_date, through) else date, color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodyMedium)
            }
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    state.profile?.familyName?.trim()?.ifBlank { null } ?: stringResource(R.string.my_family),
                    color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold,
                )
                if (state.isSharedMember) {
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.shared), style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.background(Color.White.copy(alpha = 0.25f), RoundedCornerShape(8.dp)).padding(horizontal = 6.dp, vertical = 2.dp))
                }
            }
            Spacer(Modifier.height(12.dp))
            if (state.children.isEmpty()) {
                Text(stringResource(R.string.add_child_to_start), color = Color.White.copy(alpha = 0.9f))
            } else if (onVacation) {
                Text(stringResource(R.string.nothing_due_streaks_safe), color = Color.White, style = MaterialTheme.typography.titleMedium)
                TextButton(onClick = { vm.clearVacation() }, colors = ButtonDefaults.textButtonColors(contentColor = Color.White)) { Text(stringResource(R.string.end_vacation_early), textDecoration = TextDecoration.Underline) }
            } else {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(stringResource(R.string.home_done_of_due, done, due), color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.home_chores_done_today), color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodyMedium)
                }
                Text(
                    if (due == 0) stringResource(R.string.no_chores_due_today) else stringResource(R.string.home_earned_today, Money.format(earnedCents, state.currency)),
                    color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodyMedium,
                )
            }
            if (state.children.isNotEmpty()) {
                Spacer(Modifier.height(14.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.children, key = { it.id }) { child ->
                        val d = state.dueOn(child.id, state.today).size
                        val n = state.doneOn(child.id, state.today)
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable { onOpenChild(child) }.alpha(if (onVacation) 0.85f else 1f)) {
                            Box(contentAlignment = Alignment.Center) {
                                if (!onVacation) androidx.compose.material3.CircularProgressIndicator(
                                    progress = { if (d == 0) 0f else n.toFloat() / d }, modifier = Modifier.size(62.dp), color = Color.White,
                                    trackColor = Color.White.copy(alpha = 0.28f), strokeWidth = 4.dp,
                                )
                                ChildAvatar(child, 50.dp)
                            }
                            Spacer(Modifier.height(4.dp))
                            val first = child.name.trim().split(" ").first()
                            Text(if (onVacation) first else if (d == 0) stringResource(R.string.child_none_today, first) else "$first $n/$d", color = Color.White, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }
        }
    }
}

@Composable
private fun GettingStartedCard(state: DashboardState, onOpenFamily: () -> Unit, onOpenChores: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("🏁 " + stringResource(R.string.getting_started), style = MaterialTheme.typography.titleMedium)
            Step(stringResource(R.string.gs_add_child), stringResource(R.string.gs_add_child_hint), state.children.isNotEmpty(), onOpenFamily)
            Step(stringResource(R.string.gs_create_chore), stringResource(R.string.gs_create_chore_hint), state.chores.isNotEmpty(), onOpenChores)
            Step(stringResource(R.string.gs_setup_routine), stringResource(R.string.gs_setup_routine_hint), false, onOpenChores)
        }
    }
}

@Composable
private fun Step(title: String, hint: String, done: Boolean, onTap: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(enabled = !done, onClick = onTap), verticalAlignment = Alignment.CenterVertically) {
        if (done) Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = Success) else Icon(Icons.Outlined.Circle, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(10.dp))
        Column {
            Text(title, textDecoration = if (done) TextDecoration.LineThrough else null, color = if (done) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
            if (!done) Text(hint, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** iOS ApprovalTrayView: every kid tick waiting for a parent, with the proof photo when there is one. */
@Composable
fun ApprovalTray(vm: DashboardViewModel, state: DashboardState) {
    var lightbox by remember { mutableStateOf<PendingApproval?>(null) }
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Schedule, contentDescription = null, tint = Warning)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.home_needs_your_ok), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                Text("${state.pendingApprovals.size + state.pendingRedemptions.size}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            state.pendingRedemptions.forEach { r ->
                HorizontalDivider(Modifier.padding(vertical = 10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) { Text(r.itemEmoji ?: "🎁", style = MaterialTheme.typography.headlineSmall) }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(r.itemTitle, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Row { Text(stringResource(R.string.wants_this, r.childName), style = MaterialTheme.typography.bodySmall, color = avatarColor(r.childColor)); Text(" · " + Money.format(r.priceCents, state.currency), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                    TextButton(onClick = { vm.reviewRedemption(r.id, false) }) { Text(stringResource(R.string.not_now)) }
                    Button(onClick = { vm.reviewRedemption(r.id, true) }, colors = ButtonDefaults.buttonColors(containerColor = Success), contentPadding = PaddingValues(horizontal = 14.dp)) { Text(stringResource(R.string.yes_label)) }
                }
            }
            state.pendingApprovals.forEach { item ->
                HorizontalDivider(Modifier.padding(vertical = 10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant).clickable(enabled = item.photoUrl != null) { lightbox = item }, contentAlignment = Alignment.Center) {
                        if (item.photoUrl != null) AsyncImage(item.photoUrl, contentDescription = null, modifier = Modifier.size(52.dp), contentScale = ContentScale.Crop)
                        else Text(item.choreIcon ?: "📝", style = MaterialTheme.typography.headlineSmall)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(item.choreName, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(item.childName, style = MaterialTheme.typography.bodySmall, color = avatarColor(item.childColor))
                            Text(" · " + Dates.longDayName(item.dayOfWeek), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (item.hasPhoto) { Spacer(Modifier.width(4.dp)); Icon(Icons.Filled.PhotoCamera, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                    }
                    IconButton(onClick = { vm.reject(item.id) }) { Icon(Icons.AutoMirrored.Filled.Undo, contentDescription = stringResource(R.string.send_back_to, item.choreName, item.childName)) }
                    Button(onClick = { vm.approve(item.id) }, colors = ButtonDefaults.buttonColors(containerColor = Success), contentPadding = PaddingValues(horizontal = 12.dp)) {
                        Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.approve))
                    }
                }
            }
        }
    }
    lightbox?.let { item ->
        AlertDialog(
            onDismissRequest = { lightbox = null },
            title = { Text("${item.childName} · ${item.choreName}") },
            text = { AsyncImage(item.photoUrl, contentDescription = null, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)), contentScale = ContentScale.FillWidth) },
            confirmButton = { Button(onClick = { vm.approve(item.id); lightbox = null }, colors = ButtonDefaults.buttonColors(containerColor = Success)) { Text(stringResource(R.string.approve)) } },
            dismissButton = { OutlinedButton(onClick = { vm.reject(item.id); lightbox = null }) { Text(stringResource(R.string.send_back)) } },
        )
    }
}
