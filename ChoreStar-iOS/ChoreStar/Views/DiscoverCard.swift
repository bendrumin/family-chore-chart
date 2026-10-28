import SwiftUI

/// One feature this family has not tried yet, once the getting-started card
/// has retired. Families were paying for Premium features they never found
/// (October 2026: five new features, ten uses between them), so this surfaces
/// them one at a time. Which feature, in what order, and the copy all come
/// from the web (lib/engagement/discovery.ts via /api/engagement/discover),
/// so the web card, the lapse push and this card never disagree.
struct DiscoverCard: View {
    @EnvironmentObject var manager: SupabaseManager
    @AppStorage("gettingStartedHidden") private var setupDone = false
    /// Comma-separated feature ids this device has dismissed or acted on.
    @AppStorage("discoverDismissed") private var dismissedRaw = ""
    @State private var feature: DiscoverFeature?
    @State private var sheet: DiscoverSheet?

    var body: some View {
        Group {
            if let feature, setupDone, !manager.isChildSession, !manager.isSharedMember {
                card(feature)
            }
        }
        .task(id: setupDone) { await load() }
        .featureSheet($sheet)
    }

    private func card(_ feature: DiscoverFeature) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "sparkles")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.choreStarPrimary)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(feature.title)
                        .font(.display(17, weight: .bold))
                        .foregroundColor(.choreStarTextPrimary)
                    Text(feature.body)
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            HStack(spacing: 16) {
                Button {
                    open(feature)
                } label: {
                    Text(feature.cta)
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.choreStarFill)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                Button("Not now") { dismiss(feature) }
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.choreStarPrimary.opacity(0.25), lineWidth: 1)
        )
    }

    private var dismissed: [String] {
        dismissedRaw.split(separator: ",").map(String.init)
    }

    private func dismiss(_ feature: DiscoverFeature) {
        dismissedRaw = (dismissed + [feature.id]).joined(separator: ",")
        withAnimation { self.feature = nil }
    }

    private func open(_ feature: DiscoverFeature) {
        // Acting on it counts as seen; once used, the server stops offering it anyway.
        dismiss(feature)
        sheet = DiscoverSheet(featureId: feature.id, firstChild: manager.children.first)
    }

    private func load() async {
        guard setupDone, !manager.isChildSession, !manager.isSharedMember else { return }
        // The language the app is actually showing (not just the device's),
        // so the card matches the screen around it.
        let lang = Bundle.main.preferredLocalizations.first ?? "en"
        let query = ["skip": dismissed.joined(separator: ","), "surface": "app", "lang": lang]
        guard let (data, status) = await manager.parentAPI("/api/engagement/discover", query: query),
              status == 200,
              let answer = try? JSONDecoder().decode(DiscoverAnswer.self, from: data) else { return }
        // Only ids this build knows how to open; a newer server feature waits for an update.
        if let next = answer.feature, DiscoverCard.knownIds.contains(next.id) {
            feature = next
        }
    }

    static let knownIds: Set<String> = ["kid_login", "routines", "star_pets", "challenges", "money_jars", "calendar_feed"]
}

struct DiscoverFeature: Decodable, Equatable {
    let id: String
    let title: String
    let body: String
    let cta: String
}

private struct DiscoverAnswer: Decodable {
    let feature: DiscoverFeature?
}

/// Where a suggested feature opens, shared by the discover and trial cards.
enum DiscoverSheet: Identifiable {
    case editChild(Child)
    case routine, challenge, money, calendar, pets

    init?(featureId: String, firstChild: Child?) {
        switch featureId {
        case "kid_login":
            guard let firstChild else { return nil }
            self = .editChild(firstChild)
        case "routines": self = .routine
        case "challenges": self = .challenge
        case "money_jars": self = .money
        case "calendar_feed": self = .calendar
        case "star_pets": self = .pets
        default: return nil
        }
    }

    var id: String {
        switch self {
        case .editChild(let child): return "child-\(child.id)"
        case .routine: return "routine"
        case .challenge: return "challenge"
        case .money: return "money"
        case .calendar: return "calendar"
        case .pets: return "pets"
        }
    }
}

extension View {
    /// Presents the screen a discover or trial card's button points at.
    func featureSheet(_ sheet: Binding<DiscoverSheet?>) -> some View {
        self.sheet(item: sheet) { item in
            switch item {
            case .editChild(let child):
                AddEditChildView(child: child)
            case .routine:
                RoutineBuilderView()
            case .challenge:
                ChallengeBuilderSheet { }
            case .money:
                FeatureSheetFrame(sheet: sheet) { MoneySettingsView() }
            case .calendar:
                FeatureSheetFrame(sheet: sheet) { CalendarFeedView() }
            case .pets:
                FeatureSheetFrame(sheet: sheet) { PetsSettingsView() }
            }
        }
    }
}

/// A settings screen shown as a sheet, with a Done button.
private struct FeatureSheetFrame<Content: View>: View {
    @Binding var sheet: DiscoverSheet?
    @ViewBuilder let content: () -> Content

    var body: some View {
        NavigationStack {
            content()
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { sheet = nil }
                    }
                }
        }
    }
}
