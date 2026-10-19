import SwiftUI
import UIKit

/// Settings > Family > Calendar Feed (Premium, migration 033): a secret
/// iCalendar link for the whole family or one kid, for Apple Calendar,
/// Google Calendar or Outlook. Managed through /api/calendar/feeds; turning a
/// feed off is never gated.
struct CalendarFeedView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.openURL) private var openURL

    @State private var response: CalendarFeed.ListResponse?
    @State private var failed = false
    @State private var busy: String?
    @State private var notice: String?
    @State private var showingPaywall = false
    @State private var confirmRegenerate: UUID??

    var body: some View {
        Form {
            if failed {
                Section {
                    Text("The calendar feed isn't available right now. Try again in a moment.")
                        .foregroundColor(.choreStarTextSecondary)
                }
            } else if let response {
                Section {
                    Text("Chores show as all-day events on their days, and routines at their usual times. Calendars refresh on their own schedule, usually every few hours.")
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                    if !response.premium && response.feeds.isEmpty {
                        PremiumUpsellCard(
                            title: "Family calendar feed",
                            message: "See chores and routines in Apple Calendar, Google Calendar or Outlook.",
                            source: CalendarFeed.paywallSource,
                            icon: "calendar"
                        )
                    }
                }
                scopeSection(childId: nil, title: String(localized: "Whole family"), response: response)
                ForEach(response.children) { child in
                    scopeSection(childId: child.id, title: child.name, response: response)
                }
                Section {
                    Text("Anyone with a link can see that calendar. Regenerate a link to stop the old one working.")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }
            } else {
                Section { HStack { Spacer(); ProgressView(); Spacer() } }
            }
        }
        .navigationTitle("Calendar Feed")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showingPaywall) { PaywallView(source: CalendarFeed.paywallSource) }
        .alert(isPresented: Binding(get: { notice != nil }, set: { if !$0 { notice = nil } })) {
            Alert(title: Text(notice ?? ""))
        }
        .confirmationDialog(
            String(localized: "Make a new link? The old one stops working, so calendars using it need the new one."),
            isPresented: Binding(get: { confirmRegenerate != nil }, set: { if !$0 { confirmRegenerate = nil } }),
            titleVisibility: .visible
        ) {
            Button("New link", role: .destructive) {
                if let scope = confirmRegenerate { Task { await enable(scope) } }
            }
        }
    }

    @ViewBuilder
    private func scopeSection(childId: UUID?, title: String, response: CalendarFeed.ListResponse) -> some View {
        let feed = CalendarFeed.feed(for: childId, in: response.feeds)
        let key = CalendarFeed.scopeParam(childId)
        Section(title) {
            Toggle(isOn: Binding(
                get: { feed != nil },
                set: { on in Task { if on { await enable(childId) } else { await disable(childId) } } }
            )) {
                Label("Calendar feed", systemImage: "calendar")
            }
            .disabled(busy != nil || (!response.premium && feed == nil))

            if let feed {
                Text(feed.https)
                    .font(.caption.monospaced())
                    .foregroundColor(.choreStarTextSecondary)
                    .lineLimit(2)
                    .textSelection(.enabled)
                Button {
                    if let url = CalendarFeed.subscribeURL(feed) { openURL(url) }
                } label: {
                    Label("Add to Apple Calendar", systemImage: "calendar.badge.plus")
                }
                Button {
                    UIPasteboard.general.string = feed.https
                    notice = String(localized: "Link copied")
                } label: {
                    Label("Copy link", systemImage: "doc.on.doc")
                }
                if response.premium {
                    Button {
                        confirmRegenerate = .some(childId)
                    } label: {
                        Label("New link", systemImage: "arrow.clockwise")
                    }
                }
            }
            if busy == key { ProgressView() }
        }
    }

    private func load() async {
        if let loaded = await manager.loadCalendarFeeds() {
            response = loaded
            failed = false
        } else if response == nil {
            failed = true
        }
    }

    private func enable(_ childId: UUID?) async {
        busy = CalendarFeed.scopeParam(childId)
        defer { busy = nil; confirmRegenerate = nil }
        switch await manager.enableCalendarFeed(childId: childId) {
        case .success: await load()
        case .premiumRequired: showingPaywall = true
        case .failure(let message): notice = message
        }
    }

    private func disable(_ childId: UUID?) async {
        busy = CalendarFeed.scopeParam(childId)
        defer { busy = nil }
        if await manager.disableCalendarFeed(childId: childId) {
            await load()
        } else {
            notice = String(localized: "Could not turn off the calendar feed")
        }
    }
}
