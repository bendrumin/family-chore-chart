package com.chorestar.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.chorestar.app.MainActivity
import com.chorestar.app.data.Prefs
import kotlinx.serialization.Serializable

/** What the dashboard last saw, written by DashboardViewModel.refresh; the widget never talks to the network itself. */
@Serializable
data class WidgetSnapshot(val familyName: String = "", val rows: List<Row> = emptyList(), val updatedAt: Long = 0) {
    @Serializable
    data class Row(val name: String, val done: Int, val due: Int, val color: String? = null)
}

/** The iOS home-screen widget: today's progress per kid, tap to open the app. */
class TodayWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = Prefs(context).widgetSnapshotJson?.let { runCatching { com.chorestar.app.data.SupabaseModule.json.decodeFromString(WidgetSnapshot.serializer(), it) }.getOrNull() } ?: WidgetSnapshot()
        provideContent {
            GlanceTheme {
                Column(
                    GlanceModifier.fillMaxSize().background(ColorProvider(Color(0xFF6366F1))).cornerRadius(20.dp).padding(14.dp).clickable(actionStartActivity<MainActivity>()),
                ) {
                    Text("⭐ " + snapshot.familyName.ifBlank { "ChoreStar" }, style = TextStyle(color = ColorProvider(Color.White), fontWeight = FontWeight.Bold, fontSize = 14.sp))
                    Spacer(GlanceModifier.height(6.dp))
                    if (snapshot.rows.isEmpty()) Text("Open ChoreStar to see today", style = TextStyle(color = ColorProvider(Color.White), fontSize = 12.sp))
                    snapshot.rows.take(4).forEach { r ->
                        Row(GlanceModifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(r.name, style = TextStyle(color = ColorProvider(Color.White), fontSize = 13.sp), modifier = GlanceModifier.defaultWeight())
                            Spacer(GlanceModifier.width(8.dp))
                            Text(if (r.due == 0) "—" else "${r.done}/${r.due}" + if (r.due > 0 && r.done == r.due) " ⭐" else "", style = TextStyle(color = ColorProvider(Color.White), fontWeight = FontWeight.Bold, fontSize = 13.sp))
                        }
                    }
                }
            }
        }
    }

    companion object {
        suspend fun refresh(context: Context) { runCatching { TodayWidget().updateAll(context) } }
    }
}

class TodayWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayWidget()
}
