import SwiftUI
import CoreImage.CIFilterBuiltins
import StoreKit

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

                // A 44pt target: as bare caption text it was about 16pt tall.
                Button { dismiss(feature) } label: {
                    Text("Not now")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextSecondary)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
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

    static let knownIds: Set<String> = ["kid_login", "kid_device", "routines", "star_pets", "shared_chores", "challenges", "money_jars", "calendar_feed"]
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
    case routine, challenge, money, calendar, pets, sharedChore, kidDevice

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
        case "shared_chores": self = .sharedChore
        case "kid_device": self = .kidDevice
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
        case .sharedChore: return "shared-chore"
        case .kidDevice: return "kid-device"
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
            case .sharedChore:
                // Add Chore, where "Rotate between kids" and "Bonus" live.
                AddChoreWizardView()
            case .kidDevice:
                KidDeviceView()
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


/// Home card for monthly subscribers who've renewed: switch to yearly at the
/// App Store's own prices. Hidden for everyone else, and for 30 days after Not now.
struct YearlyUpsellCard: View {
    @EnvironmentObject var manager: SupabaseManager
    @StateObject private var store = StoreKitManager.shared
    @State private var offer: YearlyUpsell.Offer?

    var body: some View {
        content
            .task(id: manager.isPremium) { await load() }
    }

    @ViewBuilder private var content: some View {
        if let current = offer {
            card(current)
        } else {
            Color.clear.frame(width: 0, height: 0)
        }
    }

    private func load() async {
        guard manager.isPremium, !manager.isSharedMember, !YearlyUpsell.isSnoozed() else {
            offer = nil
            return
        }
        offer = await store.yearlyUpgradeOffer()
    }

    private func switchToYearly(_ product: Product) {
        Task {
            if await store.purchase(product) {
                withAnimation { offer = nil }
            }
        }
    }

    private func notNow() {
        YearlyUpsell.snooze()
        withAnimation { offer = nil }
    }

    private func card(_ current: YearlyUpsell.Offer) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "calendar.badge.checkmark")
                    .font(.title3)
                    .foregroundColor(.choreStarLink)
                    .accessibilityHidden(true)
                Text("Switch to yearly and save \(current.savingsPercent)%")
                    .font(.headline)
                    .foregroundColor(.choreStarTextPrimary)
            }
            Text("\(current.yearly.displayPrice) a year instead of \(current.monthly.displayPrice) a month. Same Premium, billed once a year by Apple.")
                .font(.subheadline)
                .foregroundColor(.choreStarTextSecondary)
                .fixedSize(horizontal: false, vertical: true)
            buttons(current)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .padding(.horizontal, 20)
    }

    private func buttons(_ current: YearlyUpsell.Offer) -> some View {
        HStack(spacing: 12) {
            Button { switchToYearly(current.yearly) } label: {
                Text("Switch to yearly")
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.choreStarFill)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .disabled(store.purchaseInProgress)
            Button(action: notNow) {
                Text("Not now")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.choreStarTextSecondary)
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }
}

/// A kid's own device: the family code, a QR code that opens kid login with
/// it filled in (/kid-login/<code>), and the link to share. Opened by the
/// discovery tip `kid_device` (web lib/engagement/discovery.ts).
struct KidDeviceView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    /// Settings opens this for every kid, so it says "your kid", not the first one's name.
    var namesFirstKid = true

    private var kidName: String {
        guard namesFirstKid else { return String(localized: "Your kid") }
        return manager.children.first.map { $0.name.split(separator: " ").first.map(String.init) ?? $0.name } ?? String(localized: "Your kid")
    }

    private var url: URL? {
        guard let code = manager.kidLoginCode, !code.isEmpty else { return nil }
        return URL(string: "https://chorestar.app/kid-login/\(code.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? code)")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let url, let code = manager.kidLoginCode {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(namesFirstKid
                                 ? "1. On \(kidName)'s tablet or an old phone, scan this code or open the link."
                                 : "1. On your kid's tablet or an old phone, scan this code or open the link.")
                            Text("2. \(kidName) taps their name and enters their PIN.")
                            Text("3. That's it. Checked-off chores show up for you right away.")
                        }
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextPrimary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                        if let qr = KidDeviceView.qrImage(for: url.absoluteString) {
                            Image(uiImage: qr)
                                .interpolation(.none)
                                .resizable()
                                .scaledToFit()
                                .frame(width: 220, height: 220)
                                .padding(12)
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .accessibilityLabel(namesFirstKid ? "QR code for \(kidName)'s kid login" : "QR code for kid login")
                        }

                        VStack(spacing: 4) {
                            Text("Family code")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.choreStarTextSecondary)
                            Text(code.uppercased())
                                .font(.system(.largeTitle, design: .monospaced).weight(.black))
                                .foregroundColor(.choreStarTextPrimary)
                        }

                        ShareLink(item: url) {
                            Label("Send the link", systemImage: "square.and.arrow.up")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.choreStarFill)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    } else {
                        Text("Your family code isn't ready yet. You'll find it in Settings > Family Sharing & Kid Login.")
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
                .padding(20)
            }
            .background(Color.choreStarBackground)
            .navigationTitle("\(kidName)'s own login")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }

    /// A crisp QR code: CoreImage's generator, scaled up without smoothing.
    static func qrImage(for string: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 10, y: 10)),
              let cg = CIContext().createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
