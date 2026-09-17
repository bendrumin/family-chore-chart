import Foundation

/// The setup-funnel state behind the dashboard's getting-started card.
/// Pure so the step logic is unit-testable; the view derives one of these
/// from SupabaseManager's published state. Mirrors the web card
/// (components/dashboard/getting-started-card.tsx): the signup funnel showed
/// most families add a kid and then stall before creating chores or handing
/// the app to the kid, and iOS is the bigger signup channel.
struct GettingStartedProgress: Equatable {
    let hasKids: Bool
    let hasChores: Bool
    let hasCompletion: Bool

    var allDone: Bool { hasKids && hasChores && hasCompletion }

    /// Step states in display order: add a kid, give them chores, first check-off.
    var steps: [Bool] { [hasKids, hasChores, hasCompletion] }

    /// The first incomplete step (0-based), or nil when the funnel is done.
    var nextStep: Int? { steps.firstIndex(of: false) }
}
