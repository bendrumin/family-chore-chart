import WidgetKit
import SwiftUI

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
        let entry = TodayEntry(date: Date(), snapshot: WidgetSnapshot.load())
        // The app reloads timelines on every change; this is just a fallback cadence.
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

extension WidgetSnapshot {
    static let preview = WidgetSnapshot(
        completedToday: 3,
        totalToday: 8,
        earnedTodayFormatted: "$1.50",
        children: [
            ChildProgress(id: UUID(), name: "Emma", colorName: "pink", done: 2, total: 4),
            ChildProgress(id: UUID(), name: "Liam", colorName: "blue", done: 1, total: 4),
        ],
        generatedAt: Date()
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
        case .systemMedium:
            medium
        default:
            small
        }
    }

    private var snapshot: WidgetSnapshot { entry.snapshot ?? .empty }

    /// Brighter accent in dark mode so the ring and checkmark pop on a dark surface.
    private var accent: Color {
        colorScheme == .dark ? brandIndigoDark : brandIndigo
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

            Text(snapshot.totalToday == 0 ? "No chores today" : "\(snapshot.earnedTodayFormatted) earned")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .containerBackground(for: .widget) { widgetBackground }
    }

    private var medium: some View {
        HStack(spacing: 16) {
            ZStack {
                WidgetRing(progress: snapshot.progress)
                Text("\(Int(snapshot.progress * 100))%")
                    .font(.system(.headline, design: .rounded).weight(.bold))
                    .foregroundColor(accent)
            }
            .frame(width: 72, height: 72)

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
                        HStack(spacing: 8) {
                            Circle()
                                .fill(widgetColor(child.colorName))
                                .frame(width: 8, height: 8)
                            Text(child.name)
                                .font(.caption)
                                .lineLimit(1)
                            Spacer()
                            Text("\(child.done)/\(child.total)")
                                .font(.system(.caption, design: .rounded).weight(.semibold))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .containerBackground(for: .widget) { widgetBackground }
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
        .description("Your family's chore ring for today.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
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
