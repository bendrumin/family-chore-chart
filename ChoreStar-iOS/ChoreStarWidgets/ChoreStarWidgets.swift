import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Timeline

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: Date(), snapshot: .preview)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(TodayEntry(date: Date(), snapshot: WidgetSnapshot.load() ?? .preview))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let now = Date()
        let entry = TodayEntry(date: now, snapshot: WidgetSnapshot.load())
        // The app reloads timelines on every change; this is just a fallback
        // cadence. Midnight is always a refresh point so yesterday's rows lose
        // their tick buttons on time.
        let calendar = Calendar.current
        let halfHour = calendar.date(byAdding: .minute, value: 30, to: now) ?? now
        let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) ?? halfHour
        completion(Timeline(entries: [entry], policy: .after(min(halfHour, midnight))))
    }
}

extension WidgetSnapshot {
    static let preview = WidgetSnapshot(
        completedToday: 3,
        totalToday: 8,
        earnedTodayFormatted: "$1.50",
        children: [
            ChildProgress(id: UUID(), name: "Emma", colorName: "pink", done: 2, total: 4, remaining: [
                ChoreItem(id: UUID(), name: "Feed the cat", emoji: "🐱"),
                ChoreItem(id: UUID(), name: "Tidy room", isPending: true),
            ]),
            ChildProgress(id: UUID(), name: "Liam", colorName: "blue", done: 1, total: 4, remaining: [
                ChoreItem(id: UUID(), name: "Make bed", emoji: "🛏️"),
                ChoreItem(id: UUID(), name: "Homework"),
                ChoreItem(id: UUID(), name: "Water plants", emoji: "🪴"),
            ]),
        ],
        generatedAt: Date(),
        day: WidgetSnapshot.dayKey(for: Date()),
        canTick: true
    )

    static let empty = WidgetSnapshot(
        completedToday: 0,
        totalToday: 0,
        earnedTodayFormatted: "$0.00",
        children: [],
        generatedAt: Date()
    )
}

// MARK: - Shared bits

/// "#rrggbb" to Color. The widget target has no access to the app's Color
/// extensions, so this small parser lives here.
func widgetHexColor(_ hex: String) -> Color? {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    guard s.count == 6, let value = UInt32(s, radix: 16) else { return nil }
    return Color(
        red: Double((value >> 16) & 0xFF) / 255.0,
        green: Double((value >> 8) & 0xFF) / 255.0,
        blue: Double(value & 0xFF) / 255.0
    )
}

func widgetColor(_ name: String) -> Color {
    switch name.lowercased() {
    case "red": return .red
    case "blue": return .blue
    case "green": return .green
    case "orange": return .orange
    case "purple": return .purple
    case "pink": return .pink
    case "yellow": return .yellow
    case "teal": return .teal
    case "indigo": return .indigo
    case "mint": return .mint
    case "cyan": return .cyan
    case "brown": return .brown
    default: return .indigo
    }
}

let brandIndigo = Color(red: 0.388, green: 0.400, blue: 0.945)      // #6366f1 (light)
let brandIndigoDark = Color(red: 0.612, green: 0.639, blue: 0.996)  // #9ca3fe (brighter, for dark)

func chorestarURL(today: Bool = false, childId: UUID? = nil) -> URL {
    if let childId {
        return URL(string: "chorestar://child/\(childId.uuidString.lowercased())")!
    }
    return URL(string: "chorestar://today")!
}

struct WidgetRing: View {
    @Environment(\.colorScheme) private var colorScheme
    let progress: Double
    var lineWidth: CGFloat = 9
    var tint: Color? = nil

    private var ringColor: Color {
        tint ?? (colorScheme == .dark ? brandIndigoDark : brandIndigo)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(ringColor.opacity(colorScheme == .dark ? 0.28 : 0.16),
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
            Circle()
                .trim(from: 0, to: max(0.001, progress))
                .stroke(
                    AngularGradient(
                        gradient: Gradient(colors: [ringColor, ringColor.opacity(0.7), ringColor]),
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
        }
    }
}

// MARK: - Views

struct TodayRingWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme
    let entry: TodayEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            accessoryCircular
        case .accessoryRectangular:
            accessoryRectangular
        case .systemMedium:
            medium
        case .systemLarge:
            large
        default:
            small
        }
    }

    private var snapshot: WidgetSnapshot { entry.snapshot ?? .empty }

    private var tickable: Bool { snapshot.allowsTicks(at: entry.date) }

    /// The family's theme accent when the app has published one; otherwise the
    /// brand indigo, brighter in dark mode so the ring pops on a dark surface.
    private var accent: Color {
        if let hex = snapshot.accentHex, let themed = widgetHexColor(hex) {
            return themed
        }
        return colorScheme == .dark ? brandIndigoDark : brandIndigo
    }

    /// A subtle brand-tinted gradient surface — an elevated dark gray in dark
    /// mode (never pure black) and a faint indigo wash in light — so the widget
    /// reads with depth instead of a flat panel.
    @ViewBuilder private var widgetBackground: some View {
        let base = colorScheme == .dark
            ? Color(red: 0.11, green: 0.11, blue: 0.15)
            : Color(uiColor: .systemBackground)
        LinearGradient(
            colors: [base, accent.opacity(colorScheme == .dark ? 0.18 : 0.08)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    /// Money earned today, with the family's best streak once it is worth
    /// bragging about. A one-day "streak" is just a day.
    private var smallCaption: String {
        if snapshot.totalToday == 0 { return String(localized: "No chores today") }
        if let streak = snapshot.topStreak, streak >= 2 {
            return String(localized: "\(snapshot.earnedTodayFormatted) · 🔥 \(streak) days")
        }
        return String(localized: "\(snapshot.earnedTodayFormatted) earned")
    }

    private var small: some View {
        VStack(spacing: 8) {
            ZStack {
                WidgetRing(progress: snapshot.progress)
                if snapshot.totalToday > 0, snapshot.progress >= 1.0 {
                    Image(systemName: "checkmark")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(accent)
                } else {
                    VStack(spacing: 0) {
                        Text("\(snapshot.completedToday)")
                            .font(.system(.title2, design: .rounded).weight(.bold))
                        Text("of \(snapshot.totalToday)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(maxHeight: .infinity)

            Text(smallCaption)
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .containerBackground(for: .widget) { widgetBackground }
        .widgetURL(chorestarURL(today: true))
    }

    private var medium: some View {
        HStack(spacing: 16) {
            Link(destination: chorestarURL(today: true)) {
                ZStack {
                    WidgetRing(progress: snapshot.progress)
                    Text("\(Int(snapshot.progress * 100))%")
                        .font(.system(.headline, design: .rounded).weight(.bold))
                        .foregroundColor(accent)
                        .invalidatableContent()
                }
                .frame(width: 72, height: 72)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Today's Chores")
                    .font(.subheadline)
                    .fontWeight(.bold)

                if snapshot.children.isEmpty {
                    Text("Open ChoreStar to get started")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(snapshot.children.prefix(3)) { child in
                        mediumChildRow(child)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .containerBackground(for: .widget) { widgetBackground }
    }

    /// Name, next chore, and count open the child in the app; the trailing
    /// circle ticks that next chore off.
    private func mediumChildRow(_ child: WidgetSnapshot.ChildProgress) -> some View {
        let next = tickable ? child.remaining?.first : nil
        return HStack(spacing: 6) {
            Link(destination: chorestarURL(childId: child.id)) {
                VStack(spacing: 3) {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(widgetColor(child.colorName))
                            .frame(width: 8, height: 8)
                        Text(child.name)
                            .font(.caption)
                            .lineLimit(1)
                            .foregroundStyle(.primary)
                            .layoutPriority(1)
                        if let next {
                            Text(next.name)
                                .font(.caption2)
                                .lineLimit(1)
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 2)
                        Text("\(child.done)/\(child.total)")
                            .font(.system(.caption, design: .rounded).weight(.semibold))
                            .foregroundStyle(.secondary)
                            .fixedSize()
                            .invalidatableContent()
                    }
                    // The goal bar: how close the kid is to the thing
                    // they are saving for (2.0).
                    if let pct = child.goalPercent {
                        HStack(spacing: 6) {
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule().fill(accent.opacity(0.15))
                                    Capsule()
                                        .fill(pct >= 100 ? Color.orange : accent)
                                        .frame(width: geo.size.width * CGFloat(min(max(pct, 0), 100)) / 100)
                                }
                            }
                            .frame(height: 4)
                            Text("\(child.goalEmoji ?? "🎯") \(pct)%")
                                .font(.system(.caption2, design: .rounded).weight(.semibold))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                                .fixedSize()
                        }
                    }
                }
            }
            if let next {
                Button(intent: CompleteChoreIntent(choreId: next.id)) {
                    TickCircle(isPending: next.isPending == true, tint: accent)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("Mark \(next.name) done"))
            }
        }
    }

    /// Every kid with today's remaining chores as tickable rows.
    private var large: some View {
        let kids = Array(snapshot.children.prefix(5))
        let budget = widgetRowBudget(remainingCounts: kids.map { $0.remaining?.count ?? 0 }, lines: 11)
        return VStack(alignment: .leading, spacing: 10) {
            Link(destination: chorestarURL(today: true)) {
                HStack(spacing: 12) {
                    ZStack {
                        WidgetRing(progress: snapshot.progress, lineWidth: 6)
                        Text("\(Int(snapshot.progress * 100))%")
                            .font(.system(.caption, design: .rounded).weight(.bold))
                            .foregroundColor(accent)
                            .invalidatableContent()
                    }
                    .frame(width: 44, height: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Today's Chores")
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Text(smallCaption)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    Text("\(snapshot.completedToday) of \(snapshot.totalToday) today")
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .foregroundStyle(.secondary)
                        .invalidatableContent()
                }
            }

            if kids.isEmpty {
                Spacer(minLength: 0)
                Text("Open ChoreStar to get started")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                Spacer(minLength: 0)
            } else {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(Array(kids.enumerated()), id: \.element.id) { index, child in
                        largeChildSection(child, rows: budget[index])
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .containerBackground(for: .widget) { widgetBackground }
    }

    private func largeChildSection(_ child: WidgetSnapshot.ChildProgress, rows: Int) -> some View {
        let remaining = child.remaining ?? []
        let hidden = remaining.count - rows
        let tint = widgetColor(child.colorName)
        return VStack(alignment: .leading, spacing: 3) {
            Link(destination: chorestarURL(childId: child.id)) {
                HStack(spacing: 8) {
                    Circle().fill(tint).frame(width: 8, height: 8)
                    Text(child.name)
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    if child.total > 0, remaining.isEmpty {
                        Label("All done!", systemImage: "checkmark.circle.fill")
                            .labelStyle(.titleAndIcon)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(accent)
                    } else if hidden > 0 {
                        Text("+\(hidden) more")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    Text("\(child.done)/\(child.total)")
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .foregroundStyle(.secondary)
                        .invalidatableContent()
                }
            }
            ForEach(remaining.prefix(rows)) { item in
                ChoreTickRow(item: item, childId: child.id, tint: accent, tickable: tickable)
                    .padding(.leading, 16)
            }
        }
    }

    private var accessoryCircular: some View {
        Gauge(value: snapshot.progress) {
            Image(systemName: "star.fill")
        } currentValueLabel: {
            Text("\(snapshot.completedToday)")
                .font(.system(.body, design: .rounded).weight(.bold))
        }
        .gaugeStyle(.accessoryCircular)
        .containerBackground(for: .widget) { Color.clear }
        .widgetURL(chorestarURL(today: true))
    }

    private var accessoryRectangular: some View {
        HStack(spacing: 10) {
            WidgetRing(progress: snapshot.progress, lineWidth: 5)
                .frame(width: 28, height: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text("ChoreStar")
                    .font(.headline)
                    .widgetAccentable()
                if let top = snapshot.children.first {
                    Text("\(top.name) · \(top.done)/\(top.total)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                } else {
                    Text("\(snapshot.completedToday) of \(snapshot.totalToday) today")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .containerBackground(for: .widget) { Color.clear }
        .widgetURL(
            snapshot.children.first.map { chorestarURL(childId: $0.id) } ?? chorestarURL(today: true)
        )
    }
}

// MARK: - Widget

struct TodayRingWidget: Widget {
    let kind: String = "TodayRingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            TodayRingWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Progress")
        .description("Your family's chores for today. Tick them off right here.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular])
    }
}

#Preview(as: .systemSmall) {
    TodayRingWidget()
} timeline: {
    TodayEntry(date: .now, snapshot: .preview)
}

#Preview(as: .systemMedium) {
    TodayRingWidget()
} timeline: {
    TodayEntry(date: .now, snapshot: .preview)
}

#Preview(as: .systemLarge) {
    TodayRingWidget()
} timeline: {
    TodayEntry(date: .now, snapshot: .preview)
}

#Preview(as: .accessoryRectangular) {
    TodayRingWidget()
} timeline: {
    TodayEntry(date: .now, snapshot: .preview)
}
