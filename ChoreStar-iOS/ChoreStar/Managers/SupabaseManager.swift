import Foundation
import UIKit
import SwiftUI
import CryptoKit

#if canImport(Supabase)
import Supabase
#endif

class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()
    
    // Published properties
    @Published var isAuthenticated = false
    @Published var currentUserEmail: String?
    @Published var children: [Child] = []
    @Published var chores: [Chore] = []
    @Published var choreCompletions: [UUID: Date] = [:] // Today's completions
    @Published var weekCompletions: [(choreId: UUID, dayOfWeek: Int)] = [] // Full week completions (approved)
    /// Ticks this week that are waiting for a parent's OK (migration 016).
    /// Kept apart from weekCompletions so nothing downstream counts them.
    @Published var pendingCompletions: [(choreId: UUID, dayOfWeek: Int, id: UUID)] = []
    /// The parent's "Needs your OK" list, from /api/chores/pending.
    @Published var pendingApprovals: [PendingApproval] = []
    /// Store requests waiting for a parent, from the same endpoint (2.0).
    @Published var pendingRedemptions: [PendingRedemption] = []
    /// Each child's wallet (balance, goal, store), from /api/kid/wallet (2.0).
    @Published var wallets: [UUID: KidWallet] = [:]
    /// The family's reward store items, for the parent's Settings screen (2.0).
    @Published var rewardItems: [RewardItem] = []
    @Published var achievements: [Achievement] = []
    @Published var familySettings: FamilySettings?
    @Published var isChildSession = false
    @Published var currentChild: Child?
    @Published var routines: [Routine] = []
    @Published var subscriptionType: String = "free"
    /// Flips true when loadRemoteData finishes a full pass — gates decisions
    /// that must not run against a half-loaded account (e.g. first-run
    /// onboarding, which reads `children`). Reset on sign-out.
    @Published var initialDataLoaded = false
    
    var isPremium: Bool { subscriptionType == "premium" || subscriptionType == "lifetime" }
    var childLimit: Int { isPremium ? Int.max : 3 }
    var choreLimit: Int { isPremium ? Int.max : 20 }

    // Family's currency symbol (falls back to $ until settings load)
    var currencySymbol: String { familySettings?.currencySymbol ?? "$" }

    /// Whether per-chore reward amounts actually affect earnings.
    ///
    /// False on the flat daily rate, where a chore's own amount is ignored
    /// entirely and the child earns `dailyRewardCents` for finishing their whole
    /// list. Forms that let you set a per-chore amount need to say so, or you get
    /// an $8.00 chore next to an $0.08 one and totals that reflect neither.
    /// Defaults to false to match the schema default of 'flat'.
    var isPerChoreRewardMode: Bool { familySettings?.isPerChoreMode ?? false }

    /// Formats a dollar amount using the family's currency, e.g. "£2.50".
    func formatMoney(_ amount: Double) -> String {
        let symbol = currencySymbol
        let decimals = familySettings?.currencyDecimals ?? 2
        if decimals == 0 {
            return String(format: "%@%.0f", symbol, amount.rounded())
        }
        return String(format: "%@%.\(decimals)f", symbol, amount)
    }
    
    // Child session properties
    @Published var childSession: ChildSession?
    @Published var kidLoginCode: String?

    // Children that have a PIN set in child_pins (kid login enabled)
    @Published var childIdsWithPin: Set<UUID> = []

    func childHasPin(_ childId: UUID) -> Bool {
        childIdsWithPin.contains(childId)
    }

    // Standalone kid-mode session (kid's own device, no parent Supabase auth)
    @Published var kidModeSession: KidModeSession?
    /// Streak, week earnings, and badge counts for a standalone kid session.
    /// nil on a parent's device, where the same numbers come from local state.
    @Published var kidStats: KidStats?
    var isStandaloneKidSession: Bool { kidModeSession != nil }

    // Routines already completed today (drives "Done!" badges and replay prevention)
    @Published var completedRoutineIds: Set<UUID> = []

    // All-time completion history (feeds achievement progress)
    @Published var allTimeCompletions: [HistoricalCompletion] = []

    // Family sharing: if this user joined another family, that family owner's
    // id is the "effective" id all family data hangs off (web parity:
    // lib/utils/family.ts getEffectiveFamilyId)
    @Published var memberOfFamilyId: UUID?
    @Published var familyMembers: [FamilyMemberInfo] = []
    @Published var familyJoinCode: String?

    var isSharedMember: Bool { memberOfFamilyId != nil }

    /// The user id that owns the family's data (own id, or the joined family's owner).
    var effectiveUserId: String? {
        memberOfFamilyId?.uuidString ?? debugUserId
    }

    private static let kidModeSessionKey = "kid_mode_session"
    
    private static let appBaseURL = "https://chorestar.app"
    
    // Debug properties
    @Published var debugSupabaseURL: String?
    @Published var debugHasKey = false
    @Published var debugUserId: String?
    @Published var debugLastError: String?
    /// A message safe to put in front of a user. `debugLastError` carries
    /// engineering detail ("Delayed session check: nil") and must never be
    /// shown — App Review saw "❌ Auth error: Email not confirmed" and filed it
    /// as a bug under guideline 2.1(a).
    @Published var authErrorMessage: String?
    
    private var client: SupabaseClient?
    
    private init() {
        setupSupabase()
    }
    
    func setupSupabase() {
        #if canImport(Supabase)
        // Try to read from Bundle.main.infoDictionary first (more reliable)
        guard let infoDictionary = Bundle.main.infoDictionary,
              let urlString = infoDictionary["SUPABASE_URL"] as? String,
              let anonKey = infoDictionary["SUPABASE_ANON_KEY"] as? String else {
            // Fallback to reading from plist file
            guard let path = Bundle.main.path(forResource: "Info", ofType: "plist"),
                  let plist = NSDictionary(contentsOfFile: path),
                  let urlString = plist["SUPABASE_URL"] as? String,
                  let anonKey = plist["SUPABASE_ANON_KEY"] as? String else {
                debugLastError = "Missing Supabase configuration in Info.plist"
                return
            }
            
            debugSupabaseURL = urlString
            debugHasKey = !anonKey.isEmpty
            
            guard let url = URL(string: urlString) else {
                debugLastError = "Invalid Supabase URL"
                return
            }
            
            client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
            debugLastError = "Supabase client initialized successfully (from plist file)"
            return
        }
        
        debugSupabaseURL = urlString
        debugHasKey = !anonKey.isEmpty
        
        guard let url = URL(string: urlString) else {
            debugLastError = "Invalid Supabase URL: \(urlString)"
            return
        }
        
        client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
        debugLastError = "Supabase client initialized successfully (from bundle)"
        #else
        debugLastError = "Supabase not available"
        #endif
    }
    
    func initialize() async {
        await checkAuthStatus()
        
        if isAuthenticated {
            await loadRemoteData()
        }
        
        await checkChildSession()
    }
    
    func checkAuthStatus() async {
        #if canImport(Supabase)
        guard let client = client else {
            await MainActor.run {
                debugLastError = "No Supabase client"
            }
            return
        }
        
        do {
            let session = try await client.auth.session
            let user = session.user
            await MainActor.run {
                self.debugUserId = user.id.uuidString
                self.currentUserEmail = user.email
                self.isAuthenticated = true
                debugLastError = "User authenticated: \(user.email ?? "no email")"
            }
            await registerForPushNotifications()
        } catch {
            await MainActor.run {
                self.isAuthenticated = false
                self.currentUserEmail = nil
                self.debugUserId = nil
                debugLastError = "Auth check error: \(error.localizedDescription)"
            }
        }
        #else
        await MainActor.run {
            debugLastError = "Supabase not available for auth check"
        }
        #endif
    }
    
    func checkChildSession() async {
        // Standalone kid session takes priority (kid's own device)
        if await restoreKidModeSession() {
            return
        }

        // Check if there's a saved child session
        guard let savedChildId = UserDefaults.standard.string(forKey: "child_session_id"),
              let childUUID = UUID(uuidString: savedChildId),
              UserDefaults.standard.string(forKey: "child_session_token") != nil else {
            await MainActor.run {
                isChildSession = false
                currentChild = nil
                childSession = nil
            }
            return
        }
        
        // Find the child
        let foundChild = await MainActor.run { children.first(where: { $0.id == childUUID }) }
        
        await MainActor.run {
            if let child = foundChild {
                self.currentChild = child
                self.isChildSession = true
                debugLastError = "Child session restored: \(child.name)"
            } else {
                isChildSession = false
                currentChild = nil
                childSession = nil
            }
        }
    }
    
    /// Verifies a child's PIN against the web API (hashed child_pins model).
    /// Returns nil on success, or a user-facing error message on failure.
    func authenticateChild(childId: UUID, pin: String) async -> String? {
        let familyCode = await MainActor.run { kidLoginCode }

        guard let familyCode = familyCode, !familyCode.isEmpty else {
            return "Kid login isn't set up yet. Open Settings on chorestar.app to get your family code."
        }

        let outcome = await verifyPinViaAPI(familyCode: familyCode, pin: pin)
        switch outcome {
        case .failure(let message):
            await MainActor.run {
                debugLastError = "Child auth failed: \(message)"
            }
            return message
        case .success(let result):
            // The API matches the PIN against every child in the family —
            // only accept it if it belongs to the child that was selected.
            guard let matchedId = result.child.flatMap({ UUID(uuidString: $0.id) }),
                  matchedId == childId else {
                return "Incorrect PIN. Try again!"
            }

            let child = await MainActor.run { children.first(where: { $0.id == childId }) }
            guard let child = child else { return "Something went wrong. Try again!" }

            await MainActor.run {
                self.currentChild = child
                self.isChildSession = true
                debugLastError = "Child authenticated via API: \(child.name)"
            }

            UserDefaults.standard.set(childId.uuidString, forKey: "child_session_id")
            UserDefaults.standard.set(result.kidToken ?? UUID().uuidString, forKey: "child_session_token")
            return nil
        }
    }

    private struct PinVerifyResponse: Codable {
        let success: Bool?
        let child: PinVerifyChild?
        let kidToken: String?
        let error: String?
    }

    private struct PinVerifyChild: Codable {
        let id: String
        let name: String
        let avatar_color: String?
        let avatar_url: String?
        let avatar_file: String?
        /// Short-lived signed URL for an uploaded photo. Minted by the web API with
        /// the service role, because the bucket is private and a kid holds a
        /// kid_sessions token rather than a Supabase JWT — Storage RLS keys on
        /// auth.uid(), which is null for a kid.
        let avatar_signed_url: String?
    }

    private enum PinVerifyOutcome {
        case success(PinVerifyResponse)
        case failure(String)
    }

    private func verifyPinViaAPI(familyCode: String, pin: String) async -> PinVerifyOutcome {
        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/child-pin/verify") else {
            return .failure("Something went wrong. Try again!")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(["familyCode": familyCode, "pin": pin])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure("Couldn't reach ChoreStar. Check your connection.")
            }
            if httpResponse.statusCode == 429 {
                return .failure("Too many tries. Please wait a few minutes and try again.")
            }
            let decoded = try? JSONDecoder().decode(PinVerifyResponse.self, from: data)
            guard httpResponse.statusCode == 200, let decoded = decoded, decoded.success == true else {
                return .failure(decoded?.error ?? "Incorrect PIN. Try again!")
            }
            return .success(decoded)
        } catch {
            await MainActor.run {
                debugLastError = "PIN API verify failed: \(error.localizedDescription)"
            }
            return .failure("Couldn't reach ChoreStar. Check your connection.")
        }
    }

    // MARK: - Child PIN Management (child_pins table, matches web's hashed model)

    private static func randomSaltHex() -> String {
        // SystemRandomNumberGenerator is cryptographically secure on Apple platforms
        (0..<32).map { _ in String(format: "%02x", UInt8.random(in: .min ... .max)) }.joined()
    }

    private static func hashPin(_ pin: String, salt: String) -> String {
        let digest = SHA256.hash(data: Data("\(pin)\(salt)".utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    /// Sets or replaces a child's kid-login PIN (4-6 digits), stored salted+hashed in child_pins.
    func setChildPin(childId: UUID, pin: String) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }

        let digitsOnly = pin.filter(\.isNumber)
        guard digitsOnly.count >= 4, digitsOnly.count <= 6, digitsOnly == pin else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "PIN must be 4-6 digits"])
        }

        let salt = Self.randomSaltHex()

        struct PinUpsertRow: Encodable {
            let child_id: String
            let pin_hash: String
            let pin_salt: String
            let failed_attempts: Int
            let locked_until: String?
        }

        let row = PinUpsertRow(
            child_id: childId.uuidString,
            pin_hash: Self.hashPin(pin, salt: salt),
            pin_salt: salt,
            failed_attempts: 0,
            locked_until: nil
        )

        try await client
            .from("child_pins")
            .upsert(row, onConflict: "child_id")
            .execute()

        await MainActor.run {
            childIdsWithPin.insert(childId)
            debugLastError = "PIN set for child \(childId)"
        }
        #endif
    }

    /// Removes a child's kid-login PIN, disabling kid login for them.
    func removeChildPin(childId: UUID) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }

        try await client
            .from("child_pins")
            .delete()
            .eq("child_id", value: childId.uuidString)
            .execute()

        await MainActor.run {
            childIdsWithPin.remove(childId)
            debugLastError = "PIN removed for child \(childId)"
        }
        #endif
    }

    func loadChildPins() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let currentChildren = await MainActor.run { children }
        guard !currentChildren.isEmpty else {
            await MainActor.run { childIdsWithPin = [] }
            return
        }

        struct PinChildIdRow: Codable {
            let child_id: UUID
        }

        do {
            let rows: [PinChildIdRow] = try await client
                .from("child_pins")
                .select("child_id")
                .in("child_id", values: currentChildren.map { $0.id.uuidString })
                .execute()
                .value

            await MainActor.run {
                childIdsWithPin = Set(rows.map(\.child_id))
            }
        } catch {
            await MainActor.run {
                debugLastError = "Child PINs error: \(error.localizedDescription)"
            }
        }
        #endif
    }
    
    func signOutChild() {
        UserDefaults.standard.removeObject(forKey: "child_session_id")
        UserDefaults.standard.removeObject(forKey: "child_session_token")
        UserDefaults.standard.removeObject(forKey: SupabaseManager.kidModeSessionKey)

        isChildSession = false
        currentChild = nil
        childSession = nil
        kidModeSession = nil

        // Standalone sessions have no parent data behind them — clear kid-loaded routines
        if !isAuthenticated {
            routines = []
            completedRoutineIds = []
        }

        debugLastError = "Child signed out"
    }

    // MARK: - Standalone Kid Mode (kid's own device, mirrors web /kid-login flow)

    /// Logs a kid in with just a family code and PIN — no parent account needed on this device.
    /// Returns nil on success, or a user-facing error message.
    func kidLogin(familyCode: String, pin: String) async -> String? {
        let outcome = await verifyPinViaAPI(familyCode: familyCode, pin: pin)
        switch outcome {
        case .failure(let message):
            return message
        case .success(let result):
            guard let apiChild = result.child,
                  let childId = UUID(uuidString: apiChild.id),
                  let kidToken = result.kidToken else {
                return "Something went wrong. Try again!"
            }

            let session = KidModeSession(
                childId: childId,
                childName: apiChild.name,
                avatarColor: apiChild.avatar_color,
                avatarUrl: apiChild.avatar_url,
                avatarFile: apiChild.avatar_file,
                avatarSignedUrl: apiChild.avatar_signed_url,
                kidToken: kidToken,
                familyCode: familyCode,
                expiresAt: Date().addingTimeInterval(8 * 60 * 60)
            )

            if let encoded = try? JSONEncoder().encode(session) {
                UserDefaults.standard.set(encoded, forKey: SupabaseManager.kidModeSessionKey)
            }

            await MainActor.run {
                self.kidModeSession = session
                self.currentChild = session.asChild
                self.isChildSession = true
                debugLastError = "Kid logged in: \(apiChild.name)"
            }

            await loadKidModeTheme()
            await loadKidModeRoutines()
            await loadKidModeChores()
            await loadKidModeStats()
            await loadWallet(for: session.childId)
            return nil
        }
    }

    /// Restores a persisted standalone kid session if it hasn't expired.
    private func restoreKidModeSession() async -> Bool {
        guard let data = UserDefaults.standard.data(forKey: SupabaseManager.kidModeSessionKey),
              let session = try? JSONDecoder().decode(KidModeSession.self, from: data) else {
            return false
        }

        guard session.expiresAt > Date() else {
            UserDefaults.standard.removeObject(forKey: SupabaseManager.kidModeSessionKey)
            return false
        }

        await MainActor.run {
            self.kidModeSession = session
            self.currentChild = session.asChild
            self.isChildSession = true
            debugLastError = "Kid session restored: \(session.childName)"
        }

        await loadKidModeTheme()
        await loadKidModeRoutines()
        await loadKidModeChores()
        await loadKidModeStats()
        await loadWallet(for: session.childId)
        return true
    }

    /**
     Loads the family's theme for a standalone kid session.

     Kid devices have no parent session, so `loadFamilySettings()` never runs
     and the theme the parent picked never reached them: kid mode on an iPad
     was brand indigo whatever the family chose. /api/kid/child returns the
     shared custom_theme payload; ThemeManager persists it so the next launch
     paints before this request returns.
     */
    func loadKidModeTheme() async {
        guard let session = await MainActor.run(body: { kidModeSession }) else { return }
        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/kid/child") else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(session.kidToken)", forHTTPHeaderField: "Authorization")

        struct Response: Decodable {
            let theme: CustomThemePayload?
        }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else { return }
            let decoded = try JSONDecoder().decode(Response.self, from: data)
            await MainActor.run {
                ThemeManager.shared.apply(customTheme: decoded.theme)
            }
        } catch {
            await MainActor.run {
                debugLastError = "Kid theme error: \(error.localizedDescription)"
            }
        }
    }

    private struct KidRoutineStepRow: Codable {
        let id: UUID
        let title: String
        let description: String?
        let icon: String?
        let order_index: Int?
        let duration_seconds: Int?
    }

    private struct KidRoutineRow: Codable {
        let id: UUID
        let child_id: UUID
        let name: String
        let type: String
        let icon: String?
        let color: String?
        let reward_cents: Int?
        let is_active: Bool?
        let created_at: String?
        let updated_at: String?
        let routine_steps: [KidRoutineStepRow]?
        let completedToday: Bool?
    }

    /// Loads the kid's active routines through the web API (Bearer kid token bypasses RLS server-side).
    private struct KidChoreRow: Codable {
        let id: UUID
        let name: String
        let icon: String?
        let category: String?
        let reward_cents: Int?
        let sort_order: Int?
        let days_of_week: [Int]?
        let requires_photo: Bool?
    }

    private struct KidChoreCompletionRow: Codable {
        let chore_id: UUID
        let day_of_week: Int?
        let status: String?
    }

    /// A store request waiting for review (GET /api/chores/pending, `redemptions`).
    struct PendingRedemption: Decodable, Identifiable {
        let id: UUID
        let childId: UUID
        let childName: String
        let childColor: String?
        let itemId: UUID
        let itemTitle: String
        let itemEmoji: String?
        let priceCents: Int
        let requestedAt: String?
    }

    /// The kid's wallet (GET /api/kid/wallet): balance, goal, store, limits.
    struct KidWallet: Decodable {
        struct Goal: Decodable, Identifiable {
            let id: UUID
            let title: String
            let emoji: String?
            let targetCents: Int
            let progressCents: Int
            let percent: Int
            let reached: Bool
            let status: String
        }
        struct StoreItem: Decodable, Identifiable {
            let id: UUID
            let title: String
            let emoji: String?
            let priceCents: Int
            let affordable: Bool
            let shortByCents: Int
            let pendingRequestId: UUID?
        }
        struct Limits: Decodable {
            let premium: Bool
            let goalLimit: Int?
            let storeItemLimit: Int?
        }
        let childId: UUID
        let owedCents: Int
        let currencyCode: String?
        let goal: Goal?
        let reachedGoals: [Goal]
        let store: [StoreItem]
        let limits: Limits
    }

    /// A reward_items row (the family's store). Written through RLS as a parent.
    struct RewardItem: Codable, Identifiable {
        let id: UUID
        let user_id: UUID
        var title: String
        var emoji: String?
        var price_cents: Int
        var is_active: Bool
        var sort_order: Int
    }

    /// One row of the parent's approval tray (GET /api/chores/pending).
    struct PendingApproval: Decodable, Identifiable {
        let id: UUID
        let choreId: UUID
        let choreName: String
        let choreIcon: String?
        let rewardCents: Int
        let childId: UUID?
        let childName: String
        let childColor: String?
        let dayOfWeek: Int
        let dayName: String
        let weekStart: String
        let completedAt: String?
        let hasPhoto: Bool
        let photoUrl: String?
    }

    private struct KidChoresResponse: Codable {
        let chores: [KidChoreRow]
        let completions: [KidChoreCompletionRow]
    }

    /// GET /api/kid/stats — the kid's own motivation numbers, plus the raw
    /// history the achievement engine needs. See loadKidModeStats().
    struct KidStats: Decodable {
        struct NextBadge: Decodable {
            let id: String
            let name: String
            let icon: String
        }
        struct CompletionRow: Decodable {
            let chore_id: UUID
            let week_start: String
            let day_of_week: Int
            let status: String?
        }
        struct BadgeRow: Decodable {
            let id: String
            let child_id: UUID
            let badge_type: String
            let badge_name: String
            let badge_description: String
            let badge_icon: String
            let earned_at: String
        }

        let streak: Int
        let bestStreak: Int
        let todayPerfect: Bool
        let weekEarnedCents: Int
        let currencyCode: String?
        let earnedCount: Int
        let totalCount: Int
        let next: NextBadge?
        let completions: [CompletionRow]
        let earnedBadges: [BadgeRow]
    }

    /// Supabase timestamps carry fractional seconds ("...T02:00:00.123456+00:00"),
    /// which the default ISO8601DateFormatter rejects. Try both shapes.
    private static func parseTimestamp(_ raw: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = fractional.date(from: raw) { return d }
        return ISO8601DateFormatter().date(from: raw)
    }

    /**
     Loads the kid's streak, week earnings, and badge progress through the
     web API, and seeds the achievement engine's inputs.

     A standalone kid session has no Supabase JWT, so `loadAchievements()` and
     `loadAllTimeCompletions()` (RLS reads) never run for it: AchievementsView
     would show every badge locked. The stats endpoint returns the same rows,
     so this fills `allTimeCompletions` and `achievements` from it and the
     existing engine works unchanged in kid mode.
     */
    func loadKidModeStats() async {
        guard let session = await MainActor.run(body: { kidModeSession }) else { return }

        guard var components = URLComponents(string: "\(SupabaseManager.appBaseURL)/api/kid/stats") else { return }
        components.queryItems = [
            URLQueryItem(name: "weekStart", value: SupabaseManager.kidWeekStartString()),
            URLQueryItem(name: "dayOfWeek", value: String(RewardMath.dayIndex(of: Date()))),
        ]
        guard let url = components.url else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(session.kidToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                await MainActor.run {
                    debugLastError = "Kid stats fetch failed: HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0)"
                }
                return
            }

            let decoded = try JSONDecoder().decode(KidStats.self, from: data)

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let calendar = Calendar.current
            let history = decoded.completions.filter { $0.status != "pending" }.map { row -> HistoricalCompletion in
                let date = dateFormatter.date(from: row.week_start).flatMap {
                    calendar.date(byAdding: .day, value: row.day_of_week, to: $0)
                }
                return HistoricalCompletion(choreId: row.chore_id, weekStart: row.week_start, dayOfWeek: row.day_of_week, date: date)
            }
            let badges = decoded.earnedBadges.map { row in
                Achievement(
                    id: UUID(uuidString: row.id) ?? UUID(),
                    childId: row.child_id,
                    badgeType: row.badge_type,
                    badgeName: row.badge_name,
                    badgeDescription: row.badge_description,
                    badgeIcon: row.badge_icon,
                    earnedAt: SupabaseManager.parseTimestamp(row.earned_at) ?? Date()
                )
            }

            await MainActor.run {
                self.kidStats = decoded
                self.allTimeCompletions = history
                self.achievements = badges
                debugLastError = "Kid stats loaded: streak \(decoded.streak)"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Kid stats error: \(error.localizedDescription)"
            }
        }
    }

    /// The family's local Sunday, yyyy-MM-dd — the same convention the web
    /// dashboard writes. Computed explicitly rather than via
    /// .yearForWeekOfYear, whose first weekday follows the device locale and
    /// lands on Monday for much of the world.
    static func kidWeekStartString(for date: Date = Date()) -> String {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: date)   // Sunday = 1
        let sunday = calendar.date(byAdding: .day, value: -(weekday - 1),
                                   to: calendar.startOfDay(for: date)) ?? date
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: sunday)
    }

    /**
     Loads the kid's chores through the web API.

     Standalone kid mode showed an EMPTY chore list: ChildMainView renders
     manager.chores, but only a parent session ever loaded those, and no
     kid-token chores endpoint existed on any platform. Routines had one, so
     kids could run routines while the chores earning their allowance were
     invisible. This is the other half.
     */
    func loadKidModeChores() async {
        guard let session = await MainActor.run(body: { kidModeSession }) else { return }

        let weekStart = SupabaseManager.kidWeekStartString()
        guard var components = URLComponents(string: "\(SupabaseManager.appBaseURL)/api/kid/chores") else { return }
        components.queryItems = [URLQueryItem(name: "weekStart", value: weekStart)]
        guard let url = components.url else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(session.kidToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                await MainActor.run {
                    debugLastError = "Kid chores fetch failed: HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0)"
                }
                return
            }

            let decoded = try JSONDecoder().decode(KidChoresResponse.self, from: data)
            let today = Calendar.current.component(.weekday, from: Date()) - 1

            // Mirrors the parent-mode ChoreRow mapping — reward is DOLLARS
            // (cents / 100), matching loadRemoteData's conversion.
            let mapped = decoded.chores.map { row in
                Chore(
                    id: row.id,
                    name: row.name,
                    childId: session.childId,
                    reward: Double(row.reward_cents ?? 0) / 100.0,
                    description: nil,
                    category: row.category,
                    icon: row.icon,
                    color: nil,
                    notes: nil,
                    sortOrder: row.sort_order ?? 0,
                    daysOfWeek: ChoreSchedule.normalized(row.days_of_week),
                    requiresPhoto: row.requires_photo ?? false,
                    createdAt: Date(),
                    updatedAt: Date()
                )
            }

            // Approved ticks count; pending ones are shown as waiting.
            let week = decoded.completions.compactMap { c -> (choreId: UUID, dayOfWeek: Int)? in
                guard let d = c.day_of_week, c.status != "pending" else { return nil }
                return (choreId: c.chore_id, dayOfWeek: d)
            }
            let waiting = decoded.completions.compactMap { c -> (choreId: UUID, dayOfWeek: Int, id: UUID)? in
                guard let d = c.day_of_week, c.status == "pending" else { return nil }
                return (choreId: c.chore_id, dayOfWeek: d, id: UUID())
            }
            let todayDone = Dictionary(uniqueKeysWithValues:
                week.filter { $0.dayOfWeek == today }.map { ($0.choreId, Date()) })

            await MainActor.run {
                self.chores = mapped
                self.weekCompletions = week
                self.pendingCompletions = waiting
                self.choreCompletions = todayDone
                debugLastError = "Kid chores loaded: \(mapped.count)"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Kid chores error: \(error.localizedDescription)"
            }
        }
    }

    /// Kid-token chore toggle. Kids have no Supabase JWT, so the direct client
    /// write the parent path uses is impossible — the API validates the kid
    /// session and writes with the service role.
    private func toggleChoreViaKidAPI(_ chore: Chore, forDay dayOfWeek: Int, session: KidModeSession) async -> [Achievement] {
        let wasCompleted = isChoreCompleted(chore, forDay: dayOfWeek)

        // Optimistic flip; reverted below if the request fails.
        await MainActor.run {
            objectWillChange.send()
            if wasCompleted {
                weekCompletions.removeAll { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek }
                choreCompletions.removeValue(forKey: chore.id)
            } else {
                weekCompletions.append((choreId: chore.id, dayOfWeek: dayOfWeek))
                choreCompletions[chore.id] = Date()
            }
        }

        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/kid/chores/toggle") else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(session.kidToken)", forHTTPHeaderField: "Authorization")

        struct ToggleBody: Encodable {
            let choreId: String
            let dayOfWeek: Int
            let weekStart: String
            let completed: Bool
        }
        struct ToggleResponse: Decodable {
            let status: String?
        }
        request.httpBody = try? JSONEncoder().encode(ToggleBody(
            choreId: chore.id.uuidString.lowercased(),
            dayOfWeek: dayOfWeek,
            weekStart: SupabaseManager.kidWeekStartString(),
            completed: !wasCompleted
        ))

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            // Approval mode: the server may have parked the tick as pending.
            // Move it out of the "done" set so it earns nothing until a parent
            // approves, and show it as waiting.
            if !wasCompleted,
               let decoded = try? JSONDecoder().decode(ToggleResponse.self, from: data),
               decoded.status == "pending" {
                await MainActor.run {
                    objectWillChange.send()
                    weekCompletions.removeAll { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek }
                    choreCompletions.removeValue(forKey: chore.id)
                    pendingCompletions.append((choreId: chore.id, dayOfWeek: dayOfWeek, id: UUID()))
                }
            } else if wasCompleted {
                await MainActor.run {
                    pendingCompletions.removeAll { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek }
                }
            }
            // The tick is saved; refresh streak and badges in the background so
            // the header catches up without holding the checkmark hostage.
            Task { await loadKidModeStats() }
            return []
        } catch {
            // Revert the optimistic flip.
            await MainActor.run {
                objectWillChange.send()
                if wasCompleted {
                    weekCompletions.append((choreId: chore.id, dayOfWeek: dayOfWeek))
                    choreCompletions[chore.id] = Date()
                } else {
                    weekCompletions.removeAll { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek }
                    choreCompletions.removeValue(forKey: chore.id)
                }
                debugLastError = "Kid chore toggle failed: \(error.localizedDescription)"
            }
            return []
        }
    }

    func loadKidModeRoutines() async {
        guard let session = await MainActor.run(body: { kidModeSession }) else { return }

        guard var components = URLComponents(string: "\(SupabaseManager.appBaseURL)/api/routines") else { return }
        components.queryItems = [URLQueryItem(name: "childId", value: session.childId.uuidString.lowercased())]
        guard let url = components.url else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(session.kidToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                await MainActor.run {
                    debugLastError = "Kid routines fetch failed: HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0)"
                }
                return
            }

            let rows = try JSONDecoder().decode([KidRoutineRow].self, from: data)
            let isoFormatter = ISO8601DateFormatter()

            let mapped = rows.map { row in
                let steps = (row.routine_steps ?? []).map { stepRow in
                    RoutineStep(
                        id: stepRow.id,
                        routineId: row.id,
                        title: stepRow.title,
                        description: stepRow.description,
                        icon: stepRow.icon ?? "circle",
                        orderIndex: stepRow.order_index ?? 0,
                        durationSeconds: stepRow.duration_seconds,
                        createdAt: Date()
                    )
                }
                return Routine(
                    id: row.id,
                    childId: row.child_id,
                    name: row.name,
                    type: row.type,
                    icon: row.icon ?? "list.bullet",
                    color: row.color ?? "#6366f1",
                    rewardCents: row.reward_cents ?? 7,
                    isActive: row.is_active ?? true,
                    createdAt: isoFormatter.date(from: row.created_at ?? "") ?? Date(),
                    updatedAt: isoFormatter.date(from: row.updated_at ?? "") ?? Date(),
                    steps: steps
                )
            }

            let doneIds = Set(rows.filter { $0.completedToday == true }.map(\.id))

            await MainActor.run {
                self.routines = mapped
                self.completedRoutineIds = doneIds
                debugLastError = "Loaded \(mapped.count) kid-mode routines"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Kid routines error: \(error.localizedDescription)"
            }
        }
    }

    /// Completes a routine through the web API using the kid token (standalone mode only).
    private func completeRoutineViaAPI(routineId: UUID, stepsCompleted: Int, stepsTotal: Int, durationSeconds: Int) async throws {
        guard let session = await MainActor.run(body: { kidModeSession }) else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No kid session"])
        }

        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/routines/\(routineId.uuidString.lowercased())/complete") else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Bad URL"])
        }

        struct CompleteBody: Encodable {
            let childId: String
            let stepsCompleted: Int
            let stepsTotal: Int
            let durationSeconds: Int
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(session.kidToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(CompleteBody(
            childId: session.childId.uuidString.lowercased(),
            stepsCompleted: stepsCompleted,
            stepsTotal: stepsTotal,
            durationSeconds: durationSeconds
        ))

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Couldn't save your routine. Check your connection."])
        }
    }
    
    func signIn(email: String, password: String) async {
        #if canImport(Supabase)
        guard let client = client else {
            await MainActor.run {
                debugLastError = "No Supabase client"
            }
            return
        }
        
        do {
            _ = try await client.auth.signIn(
                email: email,
                password: password
            )
            await MainActor.run {
                debugLastError = "Sign-in successful"
            }
            
            // Check session immediately
            let immediateSession = try? await client.auth.session
            await MainActor.run {
                debugLastError = "Immediate session check: \(immediateSession?.user.id.uuidString ?? "nil")"
            }
            
            // Wait a moment for the session to be set
            try await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
            
            // Check session again
            let delayedSession = try? await client.auth.session
            
            await MainActor.run {
                debugLastError = "Delayed session check: \(delayedSession?.user.id.uuidString ?? "nil")"
                
                if let session = delayedSession {
                    self.debugUserId = session.user.id.uuidString
                    self.currentUserEmail = session.user.email ?? email
                    self.isAuthenticated = true
                    debugLastError = "Sign-in successful, user ID: \(session.user.id.uuidString)"
                } else {
                    debugLastError = "Sign-in succeeded but no session found after delay"
                    self.currentUserEmail = email
                    self.isAuthenticated = true
                }
            }
            
            await loadRemoteData()
        } catch {
            await MainActor.run {
                debugLastError = "❌ Auth error: \(error.localizedDescription)"
                self.authErrorMessage = Self.friendlySignInMessage(for: error)
                self.isAuthenticated = false
                self.currentUserEmail = nil
                self.debugUserId = nil
            }
        }
        #else
        await MainActor.run {
            debugLastError = "Supabase not available for sign in"
            authErrorMessage = "Sign in isn't available in this build."
        }
        #endif
    }

    /// Turns a raw auth error into something worth showing a parent.
    static func friendlySignInMessage(for error: Error) -> String {
        let raw = error.localizedDescription.lowercased()
        if raw.contains("not confirmed") || raw.contains("not_confirmed") {
            return "Please confirm your email address first. Check your inbox for the link we sent."
        }
        if raw.contains("invalid login") || raw.contains("invalid_credentials") || raw.contains("credentials") {
            // Supabase intentionally returns the same error for a wrong
            // password and a nonexistent account (email enumeration defense),
            // so the copy has to cover both without claiming to know which.
            return "We couldn't find an account matching that email and password. Double-check them, or tap Sign Up to create a new account."
        }
        if raw.contains("offline") || raw.contains("internet") || raw.contains("network")
            || raw.contains("timed out") || raw.contains("connection") {
            return "Couldn't reach ChoreStar. Check your connection and try again."
        }
        if raw.contains("rate") || raw.contains("too many") {
            return "Too many attempts. Please wait a moment and try again."
        }
        return "Sign in failed. Please try again."
    }
    
    private struct SignUpResponse: Codable {
        let success: Bool?
        let error: String?
    }

    /// Creates a parent account through the web API instead of calling Supabase
    /// directly.
    ///
    /// The `profiles` row must be inserted with the service-role key, which
    /// cannot ship in the app: right after signUp there is no session yet
    /// (email confirmation is required), so a client-side insert is rejected by
    /// the profiles `auth.uid() = id` policy with 42501. Calling
    /// `client.auth.signUp` from the app therefore created an auth user with NO
    /// profile — no family name, no `kid_login_code`, so kid login could never
    /// work for that family. Four accounts were left in that state before this
    /// was caught. POST /api/auth/signup creates the auth user and the profile
    /// together, and adds server-side email/password validation, signup rate
    /// limiting, and user-facing error messages.
    ///
    /// Never returns a session — the address has to be confirmed by email
    /// first, so callers should prompt the user to check their inbox.
    func signUp(email: String, password: String, familyName: String) async throws {
        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/auth/signup") else {
            throw NSError(domain: "SupabaseManager", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Something went wrong. Please try again."])
        }

        let trimmedFamily = familyName.trimmingCharacters(in: .whitespacesAndNewlines)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode([
            "email": email,
            "password": password,
            // The route falls back to "My Family" when this is blank.
            "familyName": trimmedFamily,
        ])

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw NSError(domain: "SupabaseManager", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Couldn't reach ChoreStar. Check your connection."])
        }

        guard let http = response as? HTTPURLResponse else {
            throw NSError(domain: "SupabaseManager", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Couldn't reach ChoreStar. Check your connection."])
        }

        let decoded = try? JSONDecoder().decode(SignUpResponse.self, from: data)

        guard http.statusCode == 200, decoded?.success == true else {
            let message: String
            if http.statusCode == 429 {
                message = "Too many signup attempts. Please wait a while and try again."
            } else {
                message = decoded?.error ?? "Unable to create your account. Please try again."
            }
            await MainActor.run { debugLastError = "Sign-up failed: \(message)" }
            throw NSError(domain: "SupabaseManager", code: http.statusCode,
                          userInfo: [NSLocalizedDescriptionKey: message])
        }

        await MainActor.run {
            debugLastError = "Sign-up successful. Check your email to confirm your account."
        }
    }
    
    func resetPassword(email: String) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        try await client.auth.resetPasswordForEmail(
            email,
            redirectTo: URL(string: "\(SupabaseManager.appBaseURL)/auth/callback?type=recovery")
        )
        
        await MainActor.run {
            debugLastError = "Password reset email sent"
        }
        #else
        throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Supabase not available"])
        #endif
    }
    
    func signOut() {
        #if canImport(Supabase)
        Task {
            try? await client?.auth.signOut()
            await MainActor.run {
                isAuthenticated = false
                currentUserEmail = nil
                debugUserId = nil
                initialDataLoaded = false
                children = []
                chores = []
                choreCompletions = [:]
                routines = []
                subscriptionType = "free"
                kidLoginCode = nil
                debugLastError = "Signed out successfully"
            }
            signOutChild()
        }
        #else
        debugLastError = "Supabase not available for sign out"
        #endif
    }

    // MARK: - Push Notifications

    /**
     Ask for notification permission and request an APNs token.

     Called after a parent authenticates. The two steps are independent: the
     device token arrives regardless of the permission answer (permission only
     governs whether alerts are DISPLAYED), so registration proceeds even if
     they decline — flipping permission on later in iOS Settings then works
     without another sign-in.
     */
    func registerForPushNotifications() async {
        // The simulator cannot talk to APNs, so the permission prompt there is
        // pure nag — it blocked every cold launch during screenshot runs.
        // Real devices still prompt once at first parent sign-in.
        #if !targetEnvironment(simulator)
        let center = UNUserNotificationCenter.current()
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
        #endif
    }

    /// Upserts this device's APNs token, called from PushDelegate.
    func registerPushToken(_ hexToken: String) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        guard let uid = try? await client.auth.session.user.id.uuidString.lowercased() else { return }

        // Xcode installs get sandbox tokens; TestFlight/App Store get production
        // ones. The two APNs gateways reject each other's tokens, so the server
        // picks its gateway from this column.
        #if DEBUG
        let environment = "development"
        #else
        let environment = "production"
        #endif

        struct TokenRow: Encodable {
            let user_id: String
            let token: String
            let platform: String
            let environment: String
            let updated_at: String
        }

        do {
            try await client
                .from("device_push_tokens")
                .upsert(TokenRow(
                    user_id: uid,
                    token: hexToken,
                    platform: "ios",
                    environment: environment,
                    updated_at: ISO8601DateFormatter().string(from: Date())
                ), onConflict: "token")
                .execute()
            await MainActor.run { debugLastError = "Push token registered" }
        } catch {
            await MainActor.run { debugLastError = "Push token save failed: \(error.localizedDescription)" }
        }
        #endif
    }

    /// Parent-mode completion writes skip the kid API — ping the server so it
    /// can fire the same "all chores done" APNs alert kid-mode already gets.
    /// Failures are silent: the chore is already saved.
    private func notifyParentIfAllChoresDone(childId: UUID, weekStart: String, dayOfWeek: Int) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        guard let accessToken = try? await client.auth.session.accessToken else { return }
        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/push/chores-done") else { return }

        struct Body: Encodable {
            let childId: String
            let weekStart: String
            let dayOfWeek: Int
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONEncoder().encode(Body(
            childId: childId.uuidString.lowercased(),
            weekStart: weekStart,
            dayOfWeek: dayOfWeek
        ))
        _ = try? await URLSession.shared.data(for: request)
        #endif
    }

    // MARK: - Approval mode (migration 016)

    /// Bearer token for the web API: the parent's Supabase access token.
    private func parentBearerToken() async -> String? {
        #if canImport(Supabase)
        guard let client = client else { return nil }
        return try? await client.auth.session.accessToken
        #else
        return nil
        #endif
    }

    private func reviewCompletion(id: UUID, action: String) async -> Bool {
        guard let token = await parentBearerToken(),
              let url = URL(string: "\(SupabaseManager.appBaseURL)/api/chores/approve") else { return false }
        struct Body: Encodable { let completionId: String; let action: String }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONEncoder().encode(Body(completionId: id.uuidString.lowercased(), action: action))
        guard let (_, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200 else { return false }
        return true
    }

    /// Approve a kid's pending tick. It then counts toward the day, the streak,
    /// and the allowance. Reloads completions so every view agrees.
    @discardableResult
    func approveCompletion(id: UUID) async -> Bool {
        await MainActor.run {
            objectWillChange.send()
            pendingApprovals.removeAll { $0.id == id }
            pendingCompletions.removeAll { $0.id == id }
        }
        let ok = await reviewCompletion(id: id, action: "approve")
        await loadCurrentDayCompletions()
        await loadPendingApprovals()
        if ok { await MainActor.run { publishWidgetSnapshot() } }
        return ok
    }

    /// Send a pending tick back: the row is deleted and the chore reappears on
    /// the kid's list.
    @discardableResult
    func rejectCompletion(id: UUID) async -> Bool {
        await MainActor.run {
            objectWillChange.send()
            pendingApprovals.removeAll { $0.id == id }
            pendingCompletions.removeAll { $0.id == id }
        }
        let ok = await reviewCompletion(id: id, action: "reject")
        await loadCurrentDayCompletions()
        await loadPendingApprovals()
        return ok
    }

    /// The parent's "Needs your OK" list.
    func loadPendingApprovals() async {
        guard let token = await parentBearerToken(),
              let url = URL(string: "\(SupabaseManager.appBaseURL)/api/chores/pending") else { return }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        struct Response: Decodable {
            let items: [PendingApproval]
            let redemptions: [PendingRedemption]?
        }
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }
            let decoded = try JSONDecoder().decode(Response.self, from: data)
            await MainActor.run {
                self.pendingApprovals = decoded.items
                self.pendingRedemptions = decoded.redemptions ?? []
            }
        } catch {
            await MainActor.run { debugLastError = "Pending approvals error: \(error.localizedDescription)" }
        }
    }

    /// Persist the family's approval preference (Settings toggle).
    func setRequireApproval(_ enabled: Bool) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { effectiveUserId }
        guard let uid = uid else { return }
        do {
            try await client
                .from("family_settings")
                .update(["require_approval": enabled])
                .eq("user_id", value: uid)
                .execute()
            await loadFamilySettings()
        } catch {
            await MainActor.run {
                debugLastError = "Approval pref failed: \(error.localizedDescription)"
            }
        }
        #endif
    }

    /**
     Check a chore off WITH a photo (a chore that asks for one).

     Posts the picture and the tick together to /api/kid/chores/proof, which
     creates the day's completion as pending. Works in a standalone kid session
     (kid token) and in kid mode on the parent's device (parent Bearer token).
     Returns nil on success or a user-facing message.
     */
    func submitChoreProof(chore: Chore, image: UIImage) async -> String? {
        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/kid/chores/proof") else {
            return "Something went wrong."
        }
        let session = await MainActor.run { kidModeSession }
        let token: String?
        if let session { token = session.kidToken } else { token = await parentBearerToken() }
        guard let token else { return "Not signed in." }

        guard let jpeg = SupabaseManager.prepareProofJPEG(image) else {
            return "That photo could not be read."
        }

        let dayOfWeek = todayIndex
        let weekStart = SupabaseManager.kidWeekStartString()
        let boundary = "chorestar-\(UUID().uuidString)"
        var body = Data()
        func field(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n".data(using: .utf8)!)
        }
        field("choreId", chore.id.uuidString.lowercased())
        field("dayOfWeek", String(dayOfWeek))
        field("weekStart", weekStart)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"proof.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(jpeg)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = body

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                return "Could not send the photo. Please try again."
            }
            await MainActor.run {
                objectWillChange.send()
                pendingCompletions.append((choreId: chore.id, dayOfWeek: dayOfWeek, id: UUID()))
            }
            if session != nil {
                await loadKidModeChores()
                Task { await loadKidModeStats() }
            } else {
                await loadCurrentDayCompletions()
            }
            return nil
        } catch {
            return "Could not send the photo. Please try again."
        }
    }

    /// Downscale a proof photo to 1280px on its long edge, JPEG.
    static func prepareProofJPEG(_ image: UIImage) -> Data? {
        let maxEdge: CGFloat = 1280
        let longest = max(image.size.width, image.size.height)
        let scale = min(1, maxEdge / max(longest, 1))
        let target = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: target, format: {
            let f = UIGraphicsImageRendererFormat.default()
            f.scale = 1
            return f
        }())
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: target)) }
        return resized.jpegData(compressionQuality: 0.82)
    }

    // MARK: - Goals & Reward Store (2.0)

    /// A kid-facing API call with whichever credential this device holds: the
    /// kid session token on a kid's device, or the parent's JWT (plus the child
    /// id) in kid mode on a parent's device. Returns (data, status).
    private func kidAPI(
        path: String,
        method: String,
        childId: UUID,
        body: [String: Any]? = nil
    ) async -> (Data, Int)? {
        let session = await MainActor.run { kidModeSession }
        var token: String? = session?.kidToken
        if token == nil { token = await parentBearerToken() }
        guard let token else { return nil }

        var components = URLComponents(string: "\(SupabaseManager.appBaseURL)\(path)")
        if session == nil && method == "GET" {
            components?.queryItems = [URLQueryItem(name: "childId", value: childId.uuidString.lowercased())]
        }
        guard let url = components?.url else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if var body, method != "GET" {
            if session == nil { body["childId"] = childId.uuidString.lowercased() }
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        guard let (data, response) = try? await URLSession.shared.data(for: request) else { return nil }
        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }

    /// Balance, goal, and store for one child.
    func loadWallet(for childId: UUID) async {
        guard let (data, status) = await kidAPI(path: "/api/kid/wallet", method: "GET", childId: childId),
              status == 200,
              let wallet = try? JSONDecoder().decode(KidWallet.self, from: data) else { return }
        await MainActor.run { wallets[childId] = wallet }
    }

    /// Everyone's wallets, for the parent Home and the widget.
    func loadAllWallets() async {
        let ids = await MainActor.run { children.map(\.id) }
        for id in ids { await loadWallet(for: id) }
        await MainActor.run { publishWidgetSnapshot() }
    }

    private func walletErrorMessage(_ data: Data, status: Int, fallback: String) -> String {
        if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let message = obj["message"] as? String { return message }
            if let code = obj["error"] as? String {
                switch code {
                case "goal_limit": return "One goal at a time on the free plan. Reach it or change it first."
                case "not_enough":
                    if let short = obj["shortByCents"] as? Int {
                        return "You need \(formatMoney(Double(short) / 100.0)) more for that one."
                    }
                    return "Not quite enough yet."
                default: break
                }
            }
        }
        return fallback
    }

    /// Kid (or parent, in kid mode) picks a goal. nil on success, else a message.
    func createGoal(childId: UUID, title: String, emoji: String?, targetCents: Int) async -> String? {
        var body: [String: Any] = ["title": title, "targetCents": targetCents]
        if let emoji { body["emoji"] = emoji }
        guard let (data, status) = await kidAPI(path: "/api/kid/goals", method: "POST", childId: childId, body: body) else {
            return "Could not save the goal."
        }
        guard status == 200 else { return walletErrorMessage(data, status: status, fallback: "Could not save the goal.") }
        await loadWallet(for: childId)
        return nil
    }

    func updateGoal(childId: UUID, goalId: UUID, title: String, emoji: String?, targetCents: Int) async -> String? {
        var body: [String: Any] = ["goalId": goalId.uuidString.lowercased(), "title": title, "targetCents": targetCents]
        if let emoji { body["emoji"] = emoji }
        guard let (data, status) = await kidAPI(path: "/api/kid/goals", method: "PATCH", childId: childId, body: body) else {
            return "Could not save the goal."
        }
        guard status == 200 else { return walletErrorMessage(data, status: status, fallback: "Could not save the goal.") }
        await loadWallet(for: childId)
        return nil
    }

    func archiveGoal(childId: UUID, goalId: UUID) async -> String? {
        let body: [String: Any] = ["goalId": goalId.uuidString.lowercased(), "action": "archive"]
        guard let (_, status) = await kidAPI(path: "/api/kid/goals", method: "PATCH", childId: childId, body: body),
              status == 200 else { return "Could not remove the goal." }
        await loadWallet(for: childId)
        return nil
    }

    /// Kid asks for a store item. nil on success, else a message.
    func requestReward(childId: UUID, itemId: UUID) async -> String? {
        guard let (data, status) = await kidAPI(path: "/api/kid/store/redeem", method: "POST", childId: childId,
                                                body: ["itemId": itemId.uuidString.lowercased()]) else {
            return "Could not send that. Try again."
        }
        guard status == 200 else { return walletErrorMessage(data, status: status, fallback: "Could not send that. Try again.") }
        await loadWallet(for: childId)
        return nil
    }

    func cancelRewardRequest(childId: UUID, redemptionId: UUID) async {
        _ = await kidAPI(path: "/api/kid/store/redeem", method: "POST", childId: childId,
                         body: ["redemptionId": redemptionId.uuidString.lowercased(), "action": "cancel"])
        await loadWallet(for: childId)
    }

    /// Parent reviews a store request. Approve spends the money server-side.
    @discardableResult
    func reviewRedemption(id: UUID, action: String) async -> String? {
        await MainActor.run {
            objectWillChange.send()
            pendingRedemptions.removeAll { $0.id == id }
        }
        guard let token = await parentBearerToken(),
              let url = URL(string: "\(SupabaseManager.appBaseURL)/api/rewards/redemptions") else { return "Not signed in." }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["redemptionId": id.uuidString.lowercased(), "action": action])
        let result: String?
        if let (data, response) = try? await URLSession.shared.data(for: request) {
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            result = status == 200 ? nil : walletErrorMessage(data, status: status, fallback: "Could not update that request.")
        } else {
            result = "Could not update that request."
        }
        await loadPendingApprovals()
        await loadAllWallets()
        return result
    }

    /// Parent records a payout: everything owed, or toward a goal (its target
    /// or what is owed, whichever is less; the goal is then reached).
    /// Returns the cents paid, or nil with a message.
    func payOut(childId: UUID, goalId: UUID? = nil) async -> (paidCents: Int?, error: String?) {
        guard let token = await parentBearerToken(),
              let url = URL(string: "\(SupabaseManager.appBaseURL)/api/allowance") else { return (nil, "Not signed in.") }
        var body: [String: Any] = ["childId": childId.uuidString.lowercased()]
        if let goalId { body["goalId"] = goalId.uuidString.lowercased() }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        guard let (data, response) = try? await URLSession.shared.data(for: request) else {
            return (nil, "Could not record the payout.")
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200,
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let paid = obj["paidCents"] as? Int else {
            return (nil, walletErrorMessage(data, status: status, fallback: "Could not record the payout."))
        }
        await loadWallet(for: childId)
        await MainActor.run { publishWidgetSnapshot() }
        return (paid, nil)
    }

    // Store management (parent, through RLS)

    func loadRewardItems() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { effectiveUserId }
        guard let uid = uid else { return }
        do {
            let rows: [RewardItem] = try await client
                .from("reward_items")
                .select()
                .eq("user_id", value: "\(uid)")
                .eq("is_active", value: true)
                .order("sort_order")
                .order("price_cents")
                .execute()
                .value
            await MainActor.run { rewardItems = rows }
        } catch {
            await MainActor.run { debugLastError = "Reward items error: \(error.localizedDescription)" }
        }
        #endif
    }

    /// Free plan lists three rewards; Premium removes the limit (web parity).
    var rewardItemLimit: Int { isPremium ? Int.max : 3 }

    func addRewardItem(title: String, emoji: String?, priceCents: Int) async -> String? {
        #if canImport(Supabase)
        guard let client = client else { return "Something went wrong." }
        let uid = await MainActor.run { effectiveUserId }
        guard let uid = uid else { return "Not signed in." }
        let count = await MainActor.run { rewardItems.count }
        guard count < rewardItemLimit else { return "The free plan lists 3 rewards. Premium removes the limit." }
        struct NewItem: Encodable {
            let user_id: String
            let title: String
            let emoji: String?
            let price_cents: Int
            let sort_order: Int
        }
        do {
            try await client
                .from("reward_items")
                .insert(NewItem(user_id: "\(uid)", title: title, emoji: emoji, price_cents: priceCents, sort_order: count))
                .execute()
            await loadRewardItems()
            return nil
        } catch {
            return "Could not add that reward."
        }
        #else
        return "Supabase not available."
        #endif
    }

    func updateRewardItemPrice(id: UUID, priceCents: Int) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        _ = try? await client
            .from("reward_items")
            .update(["price_cents": priceCents])
            .eq("id", value: id.uuidString)
            .execute()
        await loadRewardItems()
        #endif
    }

    /// Soft delete: payouts reference items, so history keeps the row.
    func removeRewardItem(id: UUID) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        _ = try? await client
            .from("reward_items")
            .update(["is_active": false])
            .eq("id", value: id.uuidString)
            .execute()
        await loadRewardItems()
        #endif
    }

    /// The same starter set the web offers (lib/constants/rewards.ts).
    static let starterRewards: [(emoji: String, title: String, priceCents: Int)] = [
        ("📱", "30 minutes of screen time", 200),
        ("🌙", "Stay up 30 minutes late", 300),
        ("🎬", "Pick the family movie", 400),
        ("🍕", "Pick Friday dinner", 500),
        ("🍦", "Ice cream trip", 500),
        ("🎲", "Family game night, your pick", 400),
    ]

    func addStarterRewards() async -> Int {
        var added = 0
        for item in SupabaseManager.starterRewards {
            let exists = await MainActor.run { rewardItems.contains { $0.title == item.title } }
            if exists { continue }
            let count = await MainActor.run { rewardItems.count }
            if count >= rewardItemLimit { break }
            if await addRewardItem(title: item.title, emoji: item.emoji, priceCents: item.priceCents) == nil { added += 1 }
        }
        return added
    }

    // MARK: - AI Chore Suggestions

    private struct AISuggestionRow: Codable {
        let name: String
        let category: String
        let icon: String
        let rewardCents: Int
        let reason: String
    }

    private struct AISuggestionsResponse: Codable {
        let suggestions: [AISuggestionRow]
    }

    /**
     Claude-personalized chore suggestions via the web API.

     Web has had these since July; iOS silently shipped only the rule-based
     port, so the same family saw smarter ideas in a browser than in the app.
     The endpoint takes the same bearer token as account deletion and applies a
     per-user rate limit server-side.

     Returns nil when the AI path is unavailable for any reason — no session,
     offline, 503 from a missing key, rate limit — and the caller falls back to
     the local ChoreSuggestionEngine. The feature degrades; it never breaks.
     */
    func fetchAISuggestions(
        childName: String,
        childAge: Int?,
        existingChoreNames: [String],
        completionRate: Double
    ) async -> [ChoreSuggestion]? {
        #if canImport(Supabase)
        guard let client = client else { return nil }
        guard let accessToken = try? await client.auth.session.accessToken else { return nil }
        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/ai/suggest-chores") else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        struct Body: Encodable {
            let childName: String
            let childAge: Int?
            let existingChoreNames: [String]
            let completionRate: Double
        }
        request.httpBody = try? JSONEncoder().encode(Body(
            childName: childName,
            childAge: childAge,
            existingChoreNames: existingChoreNames,
            completionRate: min(max(completionRate, 0), 100)
        ))

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }
            let decoded = try JSONDecoder().decode(AISuggestionsResponse.self, from: data)
            guard !decoded.suggestions.isEmpty else { return nil }
            return decoded.suggestions.map {
                ChoreSuggestion(name: $0.name, category: $0.category, icon: $0.icon,
                                rewardCents: $0.rewardCents, reason: $0.reason)
            }
        } catch {
            return nil
        }
        #else
        return nil
        #endif
    }

    // MARK: - Child Photo Avatars

    /// Private Storage bucket holding uploaded child photos.
    ///
    /// Private on purpose — these are photographs of children, so every read goes
    /// through a short-lived signed URL rather than a permanent public link.
    /// Policies (migration 008) scope a parent to `{their uid}/…` only.
    private static let childAvatarBucket = "child-avatars"

    /// Signed URLs, keyed by object path. They expire, so they are cached in
    /// memory for the app session only and never written to the database.
    private var signedAvatarURLs: [String: (url: URL, expires: Date)] = [:]

    /// Longest edge of a stored avatar. A face in a 44pt circle needs nothing
    /// larger, and it keeps uploads well inside the bucket's 2 MB ceiling.
    private static let avatarPixelSize: CGFloat = 512

    /**
     Object path for a child's avatar: `{user_id}/{child_id}/{uuid}.jpg`.

     Every component is lowercased. Storage object names are case-SENSITIVE, and
     the RLS policy from migration 008 compares the leading folder against
     `auth.uid()::text`, which Postgres renders lowercase. Foundation's
     UUID.uuidString is uppercase, so building this by interpolation produced a
     path the policy rejected outright.
     */
    static func avatarObjectPath(ownerId: String, childId: UUID) -> String {
        "\(ownerId.lowercased())/\(childId.uuidString.lowercased())/\(UUID().uuidString.lowercased()).jpg"
    }

    /**
     Centre-cropped, orientation-corrected 512x512 image — the exact pixels that
     get stored.

     Squared BEFORE downscaling so the circular avatar mask never lops off
     someone's chin. Exposed separately from the JPEG encode so the sticker
     editor can place props on the FINAL framing: positioning a moustache on the
     original and cropping afterwards would slide it off the face.
     */
    static func squareAvatarImage(_ image: UIImage) -> UIImage {
        let side = min(image.size.width, image.size.height)
        let cropRect = CGRect(
            x: (image.size.width - side) / 2,
            y: (image.size.height - side) / 2,
            width: side,
            height: side
        )

        // Normalize orientation by rendering through a context — a photo straight
        // from the camera usually carries an EXIF rotation that cgImage ignores,
        // which is how avatars end up sideways.
        let target = CGSize(width: avatarPixelSize, height: avatarPixelSize)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: target, format: format)

        return renderer.image { _ in
            guard let cg = image.cgImage?.cropping(to: cropRect.applying(
                CGAffineTransform(scaleX: image.scale, y: image.scale)
            )) else {
                // No cgImage (e.g. a CIImage-backed UIImage): fall back to drawing
                // the whole thing, accepting the aspect squeeze over failing.
                image.draw(in: CGRect(origin: .zero, size: target))
                return
            }
            UIImage(cgImage: cg, scale: 1, orientation: image.imageOrientation)
                .draw(in: CGRect(origin: .zero, size: target))
        }
    }

    /// Square-crop, downscale, and JPEG-encode. Idempotent for an image that has
    /// already been through squareAvatarImage (the sticker editor's output).
    static func prepareAvatarJPEG(_ image: UIImage) -> Data? {
        squareAvatarImage(image).jpegData(compressionQuality: 0.82)
    }

    /// Canvas edge length for composited avatars, in points. Matches the stored
    /// pixel size so the editor is WYSIWYG.
    static var avatarCanvasSize: CGFloat { avatarPixelSize }

    /**
     Upload a photo as a child's avatar and point the child row at it.

     Returns nil on success, or a user-facing message.

     The object path is `{user_id}/{child_id}/{uuid}.jpg`. The leading user id is
     what the Storage RLS policy keys on, and the uuid means a replacement never
     collides with a cached signed URL for the old image.
     */
    func uploadChildAvatar(childId: UUID, image: UIImage) async -> String? {
        #if canImport(Supabase)
        guard let client = client else { return "Something went wrong. Please try again." }
        guard let jpeg = SupabaseManager.prepareAvatarJPEG(image) else {
            return "That photo couldn't be processed. Try another one."
        }

        // Path folder must be the FAMILY OWNER's uid (children.user_id), not the
        // signed-in member's. Web already does this; co-parents writing under
        // their own uid left photos the owner couldn't sign. Storage RLS
        // (migration 013) lets family members write into the owner's folder.
        let ownerId: String
        if let childOwner = await MainActor.run(body: {
            children.first(where: { $0.id == childId })?.userId.uuidString
        }) {
            ownerId = childOwner
        } else {
            do {
                ownerId = try await client.auth.session.user.id.uuidString
            } catch {
                return "Your session expired. Please sign in again."
            }
        }

        let previousPath = await MainActor.run {
            children.first(where: { $0.id == childId })?.avatarPhotoPath
        }

        // LOWERCASED, and this is not cosmetic. Foundation's UUID.uuidString is
        // UPPERCASE; Postgres renders auth.uid()::text LOWERCASE. The storage
        // policy compares (storage.foldername(name))[1] against auth.uid()::text,
        // so an uppercase folder fails it and every upload came back as "new row
        // violates row-level security policy". Web never hit this because
        // JavaScript UUIDs are already lowercase.
        let path = SupabaseManager.avatarObjectPath(ownerId: ownerId, childId: childId)

        do {
            _ = try await client.storage
                .from(SupabaseManager.childAvatarBucket)
                .upload(path, data: jpeg, options: FileOptions(contentType: "image/jpeg", upsert: true))

            // Point the row at the new object and clear the preset, so avatar
            // resolution order (photo -> preset -> emoji -> initials) lands on it.
            try await updateChildAvatarPhoto(childId: childId, photoPath: path)

            // Only now remove the old object. Doing it first would leave the child
            // with no avatar at all if the upload then failed.
            if let previousPath, previousPath != path {
                _ = try? await client.storage
                    .from(SupabaseManager.childAvatarBucket)
                    .remove(paths: [previousPath])
                await MainActor.run { signedAvatarURLs[previousPath] = nil }
            }

            await loadRemoteData()
            await MainActor.run { debugLastError = "Avatar photo uploaded for \(childId)" }
            return nil
        } catch {
            await MainActor.run { debugLastError = "Avatar upload failed: \(error.localizedDescription)" }
            #if DEBUG
            // The generic message hid an RLS rejection behind "check your
            // connection", which sent me looking at the network for a policy bug.
            return "Upload failed: \(error.localizedDescription)"
            #else
            return "Couldn't upload that photo. Check your connection and try again."
            #endif
        }
        #else
        return "Supabase not available."
        #endif
    }

    /// Point a child row at an uploaded photo (or clear it with nil).
    /// `keepAvatarUrl` leaves avatar_url untouched — used when retiring a photo
    /// right after updateChild wrote a fresh preset there.
    private func updateChildAvatarPhoto(childId: UUID, photoPath: String?, keepAvatarUrl: Bool = false) async throws {
        #if canImport(Supabase)
        guard let client = client else { return }

        // Explicit encode(to:) because the SYNTHESIZED one uses encodeIfPresent
        // for Optionals, which omits a nil key entirely rather than sending null.
        // That silently broke two things: avatar_url was never actually cleared,
        // and removeChildAvatarPhoto (which passes photoPath: nil) sent only
        // updated_at — so removing a photo did nothing at all.
        struct AvatarPhotoUpdate: Encodable {
            let avatar_photo_path: String?
            let avatar_url: String?
            let updated_at: String

            enum CodingKeys: String, CodingKey {
                case avatar_photo_path, avatar_url, updated_at
            }

            let keepAvatarUrl: Bool

            enum SkipUrlKeys: String, CodingKey { case avatar_photo_path, updated_at }

            func encode(to encoder: Encoder) throws {
                if keepAvatarUrl {
                    var c = encoder.container(keyedBy: SkipUrlKeys.self)
                    try c.encode(avatar_photo_path, forKey: .avatar_photo_path)
                    try c.encode(updated_at, forKey: .updated_at)
                } else {
                    var c = encoder.container(keyedBy: CodingKeys.self)
                    // encode, not encodeIfPresent — nil must reach Postgres as null.
                    try c.encode(avatar_photo_path, forKey: .avatar_photo_path)
                    try c.encode(avatar_url, forKey: .avatar_url)
                    try c.encode(updated_at, forKey: .updated_at)
                }
            }
        }

        try await client
            .from("children")
            .update(AvatarPhotoUpdate(
                avatar_photo_path: photoPath,
                avatar_url: nil,
                updated_at: ISO8601DateFormatter().string(from: Date()),
                keepAvatarUrl: keepAvatarUrl
            ))
            .eq("id", value: childId.uuidString)
            .execute()
        #endif
    }

    /// Remove a child's uploaded photo — the object and the column.
    func removeChildAvatarPhoto(childId: UUID) async -> String? {
        #if canImport(Supabase)
        guard let client = client else { return "Something went wrong." }
        let path = await MainActor.run { children.first(where: { $0.id == childId })?.avatarPhotoPath }

        do {
            try await updateChildAvatarPhoto(childId: childId, photoPath: nil)
            if let path {
                _ = try? await client.storage
                    .from(SupabaseManager.childAvatarBucket)
                    .remove(paths: [path])
                await MainActor.run { signedAvatarURLs[path] = nil }
            }
            await loadRemoteData()
            return nil
        } catch {
            return "Couldn't remove the photo. Please try again."
        }
        #else
        return "Supabase not available."
        #endif
    }

    /**
     Resolve a storage path to a displayable signed URL.

     Cached per session and refreshed a minute before expiry, so scrolling a list
     of children doesn't mint a URL per cell per redraw.
     */
    func signedAvatarURL(for path: String) async -> URL? {
        #if canImport(Supabase)
        if let hit = await MainActor.run(body: { signedAvatarURLs[path] }),
           hit.expires > Date().addingTimeInterval(60) {
            return hit.url
        }
        guard let client = client else { return nil }

        let ttl = 3600
        do {
            let url = try await client.storage
                .from(SupabaseManager.childAvatarBucket)
                .createSignedURL(path: path, expiresIn: ttl)
            await MainActor.run {
                signedAvatarURLs[path] = (url, Date().addingTimeInterval(Double(ttl)))
            }
            return url
        } catch {
            return nil
        }
        #else
        return nil
        #endif
    }

    // MARK: - Account Deletion

    /// Outcome of a delete request, mirroring PinVerifyOutcome above.
    /// `billingCleanupFailed` means the account is gone but a Stripe subscription
    /// may still be live, so the user needs to be told rather than left to find
    /// out on their next statement.
    enum AccountDeletionOutcome {
        case deleted(billingCleanupFailed: Bool)
        case failure(String)
    }

    private struct AccountDeleteResponse: Codable {
        let success: Bool?
        let billingCleanupFailed: Bool?
        let error: String?
    }

    /// Permanently deletes the signed-in account and all of its family data.
    ///
    /// Required by App Store Guideline 5.1.1(v). Deletion runs server-side
    /// (POST /api/account/delete) because removing an auth user needs the
    /// service-role key, which must never ship in the app binary. The user's
    /// access token is sent as a bearer token so the server can prove who is
    /// asking; the same endpoint backs the web app's Settings flow.
    ///
    /// Signs out locally on success. Returns `.deleted` with a billing warning
    /// flag, or `.failure` with a user-facing message.
    func deleteAccount(confirmation: String) async -> AccountDeletionOutcome {
        #if canImport(Supabase)
        guard let client = client else {
            return .failure("Something went wrong. Please try again.")
        }

        let accessToken: String
        do {
            accessToken = try await client.auth.session.accessToken
        } catch {
            return .failure("Your session expired. Please sign in again and retry.")
        }

        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/account/delete") else {
            return .failure("Something went wrong. Please try again.")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONEncoder().encode(["confirm": confirmation])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure("Couldn't reach ChoreStar. Check your connection.")
            }

            let decoded = try? JSONDecoder().decode(AccountDeleteResponse.self, from: data)

            guard httpResponse.statusCode == 200, decoded?.success == true else {
                if httpResponse.statusCode == 429 {
                    return .failure("Too many attempts. Please wait a few minutes and try again.")
                }
                return .failure(decoded?.error ?? "We couldn't delete your account. Please try again.")
            }

            await MainActor.run {
                debugLastError = "Account deleted"
            }

            // The auth user no longer exists, so signOut() throwing is expected
            // and harmless — the local state reset below is what matters.
            signOut()

            return .deleted(billingCleanupFailed: decoded?.billingCleanupFailed == true)
        } catch {
            return .failure("Couldn't reach ChoreStar. Check your connection.")
        }
        #else
        return .failure("Supabase not available.")
        #endif
    }

    func changePassword(newPassword: String) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        try await client.auth.update(
            user: UserAttributes(
                password: newPassword
            )
        )
        
        await MainActor.run {
            debugLastError = "Password changed successfully"
        }
        #else
        throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Supabase not available"])
        #endif
    }
    
    func loadRemoteData() async {
        #if canImport(Supabase)
        guard let client = client else {
            await MainActor.run {
                debugLastError = "No Supabase client for data loading"
            }
            return
        }
        
        // Family membership decides whose data we load (own vs joined family)
        await resolveFamilyMembership()

        // Load children
        do {
            let remoteChildren: [ChildRow]
            let uid = await MainActor.run { effectiveUserId }

            guard let uid = uid else {
                await MainActor.run {
                    debugLastError = "Cannot load children: no authenticated user ID"
                }
                return
            }

            remoteChildren = try await client
                .from("children")
                .select()
                .eq("user_id", value: uid)
                .limit(100)
                .execute()
                .value
            await MainActor.run {
                debugLastError = "Querying children for user_id: \(uid)"
            }
            
            let mappedChildren = remoteChildren.map { row in
                Child(
                    id: row.id,
                    name: row.name,
                    age: row.age ?? 0,
                    avatarColor: row.avatar_color ?? "blue",
                    avatarUrl: row.avatar_url,
                    avatarFile: row.avatar_file,
                    avatarPhotoPath: row.avatar_photo_path,
                    userId: row.user_id,
                    createdAt: ISO8601DateFormatter().date(from: row.created_at) ?? Date(),
                    updatedAt: ISO8601DateFormatter().date(from: row.updated_at) ?? Date()
                )
            }
            
            await MainActor.run {
                self.children = mappedChildren
                debugLastError = "Found \(remoteChildren.count) children in DB, loaded \(self.children.count) children"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Children error: \(error.localizedDescription)"
            }
        }
        
        // Load chores
        do {
            var choresFetched: [ChoreRow] = []
            let currentChildren = await MainActor.run { children }
            
            // Load chores by child_id (matching web app approach)
            if !currentChildren.isEmpty {
                let ids = currentChildren.map { $0.id.uuidString }
                if !ids.isEmpty {
                    choresFetched = try await client
                        .from("chores")
                        .select()
                        .in("child_id", values: ids)
                        .eq("is_active", value: true)
                        .limit(200)
                        .execute()
                        .value
                    
                    await MainActor.run {
                        debugLastError = "Querying chores for \(ids.count) children, is_active=true"
                    }
                }
            }
            
            let mappedChores = choresFetched.map { row in
                Chore(
                    id: row.id,
                    name: row.name,
                    childId: row.child_id,
                    reward: Double(row.reward_cents ?? 0) / 100.0,
                    description: row.description,
                    category: row.category,
                    icon: row.icon,
                    color: row.color,
                    notes: row.notes,
                    sortOrder: row.sort_order ?? 0,
                    daysOfWeek: ChoreSchedule.normalized(row.days_of_week),
                    requiresPhoto: row.requires_photo ?? false,
                    createdAt: ISO8601DateFormatter().date(from: row.created_at) ?? Date(),
                    updatedAt: ISO8601DateFormatter().date(from: row.updated_at) ?? Date()
                )
            }
            .sorted { ($0.sortOrder, $0.createdAt) < ($1.sortOrder, $1.createdAt) }

            await MainActor.run {
                self.chores = mappedChores
                debugLastError = "Loaded \(self.chores.count) chores"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Chores error: \(error.localizedDescription)"
            }
        }
        
        await loadCurrentDayCompletions()
        await loadAchievements()
        await loadAllWallets()
        await loadFamilySettings()
        await loadProfile()
        await loadRoutines()
        await loadChildPins()
        await loadAllTimeCompletions()
        await loadFamilySharing()
        
        let currentChildren = await MainActor.run { children }
        let currentChores = await MainActor.run { chores }
        
        
        await MainActor.run {
            debugLastError = "Loaded \(currentChildren.count) children and \(currentChores.count) chores"
            initialDataLoaded = true
            publishWidgetSnapshot()
        }
        #endif
    }
    
    func loadCurrentDayCompletions() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        
        do {
            let now = Date()
            let calendar = Calendar.current
            
            // Get current day of week (0=Sunday, 1=Monday, etc.)
            let dayOfWeek = calendar.component(.weekday, from: now) - 1
            
            // Get week start (Sunday)
            let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now))!
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let weekStartString = dateFormatter.string(from: weekStart)
            
            // Load ALL completions for the current week (all 7 days)
            let allWeekCompletions: [ChoreCompletionRow] = try await client
                .from("chore_completions")
                .select()
                .eq("week_start", value: weekStartString)
                .execute()
                .value
            
            // Separate into today's completions and full week completions
            var todayCompletions: [UUID: Date] = [:]
            var fullWeekCompletions: [(choreId: UUID, dayOfWeek: Int)] = []
            
            var waiting: [(choreId: UUID, dayOfWeek: Int, id: UUID)] = []
            for completion in allWeekCompletions {
                // A tick waiting for a parent's OK is not done yet (migration 016).
                if completion.isPending {
                    waiting.append((choreId: completion.chore_id, dayOfWeek: completion.day_of_week, id: completion.id))
                    continue
                }
                // Add to full week list
                fullWeekCompletions.append((choreId: completion.chore_id, dayOfWeek: completion.day_of_week))

                // Add to today's list if it's for today
                if completion.day_of_week == dayOfWeek {
                    todayCompletions[completion.chore_id] = now
                }
            }

            let capturedToday = todayCompletions
            let capturedWeek = fullWeekCompletions
            let capturedWaiting = waiting
            await MainActor.run {
                self.choreCompletions = capturedToday
                self.weekCompletions = capturedWeek
                self.pendingCompletions = capturedWaiting
                debugLastError = "Loaded \(capturedToday.count) completions for today, \(capturedWeek.count) for week"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Completions error: \(error.localizedDescription)"
            }
        }
        #endif
    }
    
    func isChoreCompleted(_ chore: Chore, forDay dayOfWeek: Int) -> Bool {
        return weekCompletions.contains(where: { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek })
    }

    /// The kid ticked it and it is waiting for a parent (approval mode).
    func isChorePending(_ chore: Chore, forDay dayOfWeek: Int) -> Bool {
        pendingCompletions.contains(where: { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek })
    }

    func isChorePending(_ chore: Chore) -> Bool {
        isChorePending(chore, forDay: todayIndex)
    }

    /// Does a KID-path tick wait for a parent right now? Approval mode on, or
    /// the chore asks for a photo. Parent-path ticks never wait.
    func kidTickNeedsApproval(_ chore: Chore) -> Bool {
        chore.requiresPhoto || familySettings?.requireApproval == true
    }
    
    // Toggle completion for a specific day
    func toggleChoreCompletion(_ chore: Chore, forDay dayOfWeek: Int) async -> [Achievement] {
        #if canImport(Supabase)
        // Standalone kid session: no Supabase JWT, so the direct write below
        // would fail RLS. Route through the kid API instead.
        if let session = await MainActor.run(body: { kidModeSession }) {
            return await toggleChoreViaKidAPI(chore, forDay: dayOfWeek, session: session)
        }
        guard let client = client else { return [] }

        // A pending tick under a parent's finger is an approval; under the kid's
        // (kid mode on the parent's device) it is an un-tick.
        if let waiting = pendingCompletions.first(where: { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek }) {
            let childSession = await MainActor.run { isChildSession }
            if childSession {
                await MainActor.run {
                    objectWillChange.send()
                    pendingCompletions.removeAll { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek }
                }
                _ = try? await client
                    .from("chore_completions")
                    .delete()
                    .eq("id", value: waiting.id.uuidString)
                    .execute()
                return []
            }
            await approveCompletion(id: waiting.id)
            return []
        }

        let isCompleted = isChoreCompleted(chore, forDay: dayOfWeek)
        var newAchievements: [Achievement] = []
        
        let calendar = Calendar.current
        let now = Date()
        let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now))!
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let weekStartString = formatter.string(from: weekStart)
        
        if isCompleted {
            // Remove completion
            await MainActor.run {
                self.objectWillChange.send()
                weekCompletions.removeAll(where: { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek })
                if let idx = allTimeCompletions.firstIndex(where: {
                    $0.choreId == chore.id && $0.weekStart == weekStartString && $0.dayOfWeek == dayOfWeek
                }) {
                    allTimeCompletions.remove(at: idx)
                }

                // Also remove from today's completions if it's today
                let currentDay = calendar.component(.weekday, from: now) - 1
                if dayOfWeek == currentDay {
                    choreCompletions.removeValue(forKey: chore.id)
                }
            }
            
            // Delete from database
            do {
                let _ = try await client
                    .from("chore_completions")
                    .delete()
                    .eq("chore_id", value: chore.id.uuidString)
                    .eq("day_of_week", value: dayOfWeek)
                    .eq("week_start", value: weekStartString)
                    .execute()
            } catch {
                // Keep it removed from local state even if delete fails
            }
        } else {
            // Add completion
            await MainActor.run {
                self.objectWillChange.send()
                weekCompletions.append((choreId: chore.id, dayOfWeek: dayOfWeek))
                allTimeCompletions.append(HistoricalCompletion(
                    choreId: chore.id,
                    weekStart: weekStartString,
                    dayOfWeek: dayOfWeek,
                    date: calendar.date(byAdding: .day, value: dayOfWeek, to: weekStart)
                ))

                // Also add to today's completions if it's today
                let currentDay = calendar.component(.weekday, from: now) - 1
                if dayOfWeek == currentDay {
                    choreCompletions[chore.id] = now
                }
            }
            
            // Kid mode on the parent's device writes directly (parent JWT), so the
            // approval rule has to be applied here: the kid's tick waits when
            // approval is on or the chore asks for a photo. A parent's own tick
            // is always approved.
            let childSession = await MainActor.run { isChildSession }
            let waits = childSession && kidTickNeedsApproval(chore)

            // Save to database
            do {
                var completion = ChoreCompletionRow(
                    id: UUID(),
                    chore_id: chore.id,
                    day_of_week: dayOfWeek,
                    week_start: weekStartString,
                    completed_at: ISO8601DateFormatter().string(from: now)
                )
                if waits { completion.status = "pending" }

                try await client
                    .from("chore_completions")
                    .insert(completion)
                    .execute()

                if waits {
                    // Not done yet: move it from the done set to the waiting set.
                    await MainActor.run {
                        objectWillChange.send()
                        weekCompletions.removeAll { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek }
                        choreCompletions.removeValue(forKey: chore.id)
                        if let idx = allTimeCompletions.lastIndex(where: {
                            $0.choreId == chore.id && $0.weekStart == weekStartString && $0.dayOfWeek == dayOfWeek
                        }) {
                            allTimeCompletions.remove(at: idx)
                        }
                        pendingCompletions.append((choreId: chore.id, dayOfWeek: dayOfWeek, id: completion.id))
                    }
                    return []
                }

                // Parent-path write — ask the server to buzz if this finished the day.
                await notifyParentIfAllChoresDone(
                    childId: chore.childId,
                    weekStart: weekStartString,
                    dayOfWeek: dayOfWeek
                )

                // Check for achievements if it's today
                let currentDay = calendar.component(.weekday, from: now) - 1
                if dayOfWeek == currentDay {
                    newAchievements = await checkAndAwardAchievements(for: chore.childId)
                }
            } catch let error as PostgrestError {
                // If it's a duplicate key error, that's okay
                if error.code != "23505" {
                    // Remove from local state if save failed
                    await MainActor.run {
                        weekCompletions.removeAll(where: { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek })
                        let currentDay = calendar.component(.weekday, from: now) - 1
                        if dayOfWeek == currentDay {
                            choreCompletions.removeValue(forKey: chore.id)
                        }
                    }
                }
            } catch {
                // Remove from local state if save failed
                await MainActor.run {
                    weekCompletions.removeAll(where: { $0.choreId == chore.id && $0.dayOfWeek == dayOfWeek })
                    let currentDay = calendar.component(.weekday, from: now) - 1
                    if dayOfWeek == currentDay {
                        choreCompletions.removeValue(forKey: chore.id)
                    }
                }
            }
        }

        await MainActor.run {
            publishWidgetSnapshot()
        }
        #endif

        return newAchievements
    }
    
    // Toggle completion for today (convenience method)
    func toggleChoreCompletion(_ chore: Chore) async -> [Achievement] {
        let currentDay = Calendar.current.component(.weekday, from: Date()) - 1
        return await toggleChoreCompletion(chore, forDay: currentDay)
    }
    
    func isChoreCompleted(_ chore: Chore) -> Bool {
        guard let completionDate = choreCompletions[chore.id] else { return false }
        return Calendar.current.isDate(completionDate, inSameDayAs: Date())
    }
    
    // MARK: - Schedules

    /// Today's weekday index, 0 = Sunday.
    var todayIndex: Int { RewardMath.dayIndex(of: Date()) }

    /// A child's chores that are due on `dayOfWeek` (default: today). This is
    /// "the list" everywhere the app asks whether the day is finished.
    func dueChores(for childId: UUID, on dayOfWeek: Int? = nil) -> [Chore] {
        ChoreSchedule.due(chores.filter { $0.childId == childId }, on: dayOfWeek ?? todayIndex)
    }

    /// Every family chore due today, across children. The parent Home list.
    var choresDueToday: [Chore] {
        ChoreSchedule.due(chores, on: todayIndex)
    }

    // Check if ALL chores due today are completed (perfect day)
    func isTodayPerfectDay(for childId: UUID) -> Bool {
        isPerfectDay(for: childId, dayOfWeek: todayIndex)
    }

    // Check if ALL chores due on a specific day are completed (perfect day).
    // A day with nothing due is not perfect: there is nothing to be perfect at.
    func isPerfectDay(for childId: UUID, dayOfWeek: Int) -> Bool {
        let due = dueChores(for: childId, on: dayOfWeek)
        guard !due.isEmpty else { return false }
        return due.allSatisfy { isChoreCompleted($0, forDay: dayOfWeek) }
    }

    // Calculate earnings for a child for a specific day.
    // The math itself lives in RewardMath so it's unit-testable.
    //
    // Per-chore mode pays every completed chore, due that day or not (a parent
    // crediting Tuesday's trash on Wednesday is crediting real work). The flat
    // daily rate is judged against the chores DUE that day.
    func calculateDayEarnings(for childId: UUID, dayOfWeek: Int) -> Double {
        let childChores = chores.filter { $0.childId == childId }
        let isPerChore = familySettings?.isPerChoreMode == true
        let pool = isPerChore ? childChores : ChoreSchedule.due(childChores, on: dayOfWeek)
        let completedRewards = pool
            .filter { isChoreCompleted($0, forDay: dayOfWeek) }
            .map(\.reward)
        let cents = RewardMath.dayEarningsCents(
            completedRewards: completedRewards,
            totalChoreCount: pool.count,
            isPerChoreMode: isPerChore,
            dailyRewardCents: familySettings?.dailyRewardCents
        )
        return Double(cents) / 100.0
    }

    // Calculate earnings for a child based on today's completions
    // Money is only earned when ALL chores for the day are completed
    func calculateTodayEarnings(for childId: UUID) -> Double {
        return calculateDayEarnings(for: childId, dayOfWeek: RewardMath.dayIndex(of: Date()))
    }
    
    // MARK: - Family Settings
    
    func loadFamilySettings() async {
        #if canImport(Supabase)
        guard let client = client else { return }

        let uid = await MainActor.run { effectiveUserId }
        guard let uid = uid else { return }
        
        do {
            let settings: [FamilySettings] = try await client
                .from("family_settings")
                .select()
                .eq("user_id", value: uid)
                .limit(1)
                .execute()
                .value
            
            await MainActor.run {
                self.familySettings = settings.first
                // The custom accent lives in family_settings.custom_theme, shared
                // with web — a colour picked on either platform shows up on both.
                ThemeManager.shared.applyCustomAccent(settings.first?.customTheme?.accentColor)
                // Seasonal / classic / auto also live in that JSON — apply so a
                // Halloween pick on the website lands on the phone.
                ThemeManager.shared.applySeasonalFromCustomTheme(settings.first?.customTheme)
                if let settings = settings.first {
                    debugLastError = "Loaded settings: \(settings.dailyRewardCents)¢ per day"
                }
            }
        } catch {
            await MainActor.run {
                debugLastError = "Settings error: \(error.localizedDescription)"
            }
        }
        #endif
    }
    
    /**
     Sets (or clears, with nil) the family's custom accent colour.

     Written into family_settings.custom_theme — the SAME field the web accent
     picker uses, so the colour follows the family across platforms. The write
     is read-merge-write on the raw JSON: the web app keeps unrelated keys in
     that object (whatsNewSeenVersion and friends), and replacing the object
     wholesale would wipe them.
     */
    func setCustomAccentColor(_ hex: String?) async -> String? {
        #if canImport(Supabase)
        guard let client = client else { return "Something went wrong." }
        let uid = await MainActor.run { effectiveUserId }
        guard let uid = uid else { return "Not signed in." }

        struct RawThemeRow: Codable { let custom_theme: [String: AnyJSON]? }

        do {
            let rows: [RawThemeRow] = try await client
                .from("family_settings")
                .select("custom_theme")
                .eq("user_id", value: uid)
                .limit(1)
                .execute()
                .value

            var merged = rows.first?.custom_theme ?? [:]
            merged["accentColor"] = hex.map { AnyJSON.string($0) } ?? .null

            try await client
                .from("family_settings")
                .update(["custom_theme": AnyJSON.object(merged)])
                .eq("user_id", value: uid)
                .execute()

            await MainActor.run {
                ThemeManager.shared.applyCustomAccent(hex)
                debugLastError = "Custom accent \(hex ?? "cleared")"
            }
            await loadFamilySettings()
            return nil
        } catch {
            await MainActor.run { debugLastError = "Accent save failed: \(error.localizedDescription)" }
            return "Couldn't save that colour. Please try again."
        }
        #else
        return "Supabase not available."
        #endif
    }

    /// Persist the family preference for APNs activity alerts.
    func setActivityPushEnabled(_ enabled: Bool) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { effectiveUserId }
        guard let uid = uid else { return }

        do {
            try await client
                .from("family_settings")
                .update(["activity_push_enabled": enabled])
                .eq("user_id", value: uid)
                .execute()
            await loadFamilySettings()
        } catch {
            await MainActor.run {
                debugLastError = "Activity push pref failed: \(error.localizedDescription)"
            }
        }
        #endif
    }

    /**
     Writes seasonal theme preference into family_settings.custom_theme so web
     and iOS share the same pick.

     `setting` mirrors the ThemeGallery ids: "auto" | "none" | SeasonalTheme.rawValue.
     Web uses autoSeasonal bool + seasonalTheme string (stPatricks camelCase).
     */
    func setSeasonalThemePreference(_ setting: String) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { effectiveUserId }
        guard let uid = uid else { return }

        struct RawThemeRow: Codable { let custom_theme: [String: AnyJSON]? }

        do {
            let rows: [RawThemeRow] = try await client
                .from("family_settings")
                .select("custom_theme")
                .eq("user_id", value: uid)
                .limit(1)
                .execute()
                .value

            var merged = rows.first?.custom_theme ?? [:]
            switch setting {
            case "auto":
                merged["autoSeasonal"] = .bool(true)
                merged["seasonalTheme"] = .null
            case "none":
                merged["autoSeasonal"] = .bool(false)
                merged["seasonalTheme"] = .null
            default:
                merged["autoSeasonal"] = .bool(false)
                merged["seasonalTheme"] = .string(ThemeManager.webSeasonalId(fromIOS: setting))
            }

            try await client
                .from("family_settings")
                .update(["custom_theme": AnyJSON.object(merged)])
                .eq("user_id", value: uid)
                .execute()
        } catch {
            await MainActor.run {
                debugLastError = "Seasonal theme save failed: \(error.localizedDescription)"
            }
        }
        #endif
    }

    /// Reward mode, daily/weekly amounts, and currency — previously web-only.
    func updateFamilyRewards(
        rewardMode: String,
        dailyRewardCents: Int,
        weeklyBonusCents: Int,
        currencyCode: String
    ) async -> String? {
        #if canImport(Supabase)
        guard let client = client else { return "Something went wrong." }
        let uid = await MainActor.run { effectiveUserId }
        guard let uid = uid else { return "Not signed in." }

        // Upsert, not update: a family created on iOS has no family_settings row
        // until the web app makes one, and an update on a missing row is a silent
        // no-op. onConflict user_id turns this into "create or edit".
        struct RewardsUpsert: Encodable {
            let user_id: String
            let reward_mode: String
            let daily_reward_cents: Int
            let weekly_bonus_cents: Int
            let currency_code: String
        }

        do {
            try await client
                .from("family_settings")
                .upsert(RewardsUpsert(
                    user_id: "\(uid)",
                    reward_mode: rewardMode,
                    daily_reward_cents: dailyRewardCents,
                    weekly_bonus_cents: weeklyBonusCents,
                    currency_code: currencyCode
                ), onConflict: "user_id")
                .execute()
            await loadFamilySettings()
            return nil
        } catch {
            await MainActor.run {
                debugLastError = "Rewards save failed: \(error.localizedDescription)"
            }
            return "Couldn't save rewards. Please try again."
        }
        #else
        return "Supabase not available."
        #endif
    }

    func refreshData() {
        Task {
            await loadRemoteData()
        }
    }
    
    func checkAuthStatusSync() {
        Task {
            await checkAuthStatus()
        }
    }
    
    // MARK: - Children Management
    
    func createChild(name: String, age: Int, avatarColor: String, avatarUrl: String? = nil, avatarFile: String? = nil) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        let uid = await MainActor.run { debugUserId }
        guard let uid = uid else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No user ID"])
        }
        
        struct NewChildRow: Encodable {
            let name: String
            let age: Int
            let avatar_color: String
            let avatar_url: String?
            let avatar_file: String?
            let user_id: String
        }

        let newChild = NewChildRow(
            name: name,
            age: age,
            avatar_color: avatarColor,
            avatar_url: avatarUrl,
            avatar_file: avatarFile,
            user_id: uid
        )
        
        try await client
            .from("children")
            .insert(newChild)
            .execute()
        
        await MainActor.run {
            debugLastError = "Child created: \(name)"
        }
        
        await loadRemoteData()
        #endif
    }
    
    func updateChild(childId: UUID, name: String?, age: Int?, avatarColor: String?, avatarUrl: String?, avatarFile: String?) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }

        struct ChildUpdate: Encodable {
            let name: String?
            let age: Int?
            let avatar_color: String?
            let avatar_url: String?
            let avatar_file: String?
            let updated_at: String
        }

        let update = ChildUpdate(
            name: name,
            age: age,
            avatar_color: avatarColor,
            avatar_url: avatarUrl,
            avatar_file: avatarFile,
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        try await client
            .from("children")
            .update(update)
            .eq("id", value: childId.uuidString)
            .execute()

        // Actively choosing a preset or emoji must also retire an uploaded photo.
        // The photo sits ABOVE both in the resolution order (photo -> preset ->
        // emoji -> initials), so leaving its path in place means the new choice
        // never becomes visible — the picker looks broken. Only on an explicit
        // choice: a name-or-age-only save passes nil for both and must not
        // touch the photo (ChildUpdate's synthesized encoder omits nils).
        if avatarUrl != nil || avatarFile != nil {
            let previousPath = await MainActor.run {
                children.first(where: { $0.id == childId })?.avatarPhotoPath
            }
            if let previousPath {
                try await updateChildAvatarPhoto(childId: childId, photoPath: nil, keepAvatarUrl: true)
                _ = try? await client.storage
                    .from(SupabaseManager.childAvatarBucket)
                    .remove(paths: [previousPath])
                await MainActor.run { signedAvatarURLs[previousPath] = nil }
            }
        }
        
        await MainActor.run {
            debugLastError = "Child updated: \(childId)"
        }
        
        await loadRemoteData()
        #endif
    }
    
    func deleteChild(childId: UUID) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        let _ = try await client
            .from("children")
            .delete()
            .eq("id", value: childId.uuidString)
            .execute()
        
        await MainActor.run {
            debugLastError = "Child deleted: \(childId)"
        }
        
        await loadRemoteData()
        #endif
    }
    
    // MARK: - Chores Management
    
    // `chores` has no `description` column anymore, and `category` is the
    // Postgres enum `activity_category` — only ChoreCategory raw values insert.
    /// `daysOfWeek` nil leaves the column to its default (every day). Optionals
    /// are omitted from the encoded row, not sent as null, so a nil here never
    /// trips the NOT NULL constraint.
    func createChore(name: String, childId: UUID, rewardCents: Int, category: String?, icon: String?, color: String?, notes: String?, daysOfWeek: [Int]? = nil, requiresPhoto: Bool? = nil) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }

        struct NewChoreRow: Encodable {
            let name: String
            let child_id: String
            let reward_cents: Int
            let category: String?
            let icon: String?
            let color: String?
            let notes: String?
            let days_of_week: [Int]?
            let requires_photo: Bool?
        }

        let newChore = NewChoreRow(
            name: name,
            child_id: childId.uuidString,
            reward_cents: rewardCents,
            category: category.map { ChoreCategory.normalize($0).rawValue },
            icon: icon,
            color: color,
            notes: notes,
            days_of_week: daysOfWeek.map { ChoreSchedule.normalized($0) },
            requires_photo: requiresPhoto
        )
        
        try await client
            .from("chores")
            .insert(newChore)
            .execute()
        
        await MainActor.run {
            debugLastError = "Chore created: \(name)"
        }
        
        await loadRemoteData()
        #endif
    }
    
    func updateChore(choreId: UUID, name: String?, childId: UUID?, rewardCents: Int?, category: String?, icon: String?, color: String?, notes: String?, daysOfWeek: [Int]? = nil, requiresPhoto: Bool? = nil) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }

        struct ChoreUpdate: Encodable {
            let name: String?
            let child_id: String?
            let reward_cents: Int?
            let category: String?
            let icon: String?
            let color: String?
            let notes: String?
            let days_of_week: [Int]?
            let requires_photo: Bool?
            let updated_at: String
        }

        let update = ChoreUpdate(
            name: name,
            child_id: childId?.uuidString,
            reward_cents: rewardCents,
            category: category.map { ChoreCategory.normalize($0).rawValue },
            icon: icon,
            color: color,
            notes: notes,
            days_of_week: daysOfWeek.map { ChoreSchedule.normalized($0) },
            requires_photo: requiresPhoto,
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        try await client
            .from("chores")
            .update(update)
            .eq("id", value: choreId.uuidString)
            .execute()
        
        await MainActor.run {
            debugLastError = "Chore updated: \(choreId)"
        }
        
        await loadRemoteData()
        #endif
    }
    
    /// Persists a new display order for one child's chores (drag-to-reorder).
    /// Optimistically reorders local state, then writes sort_order sequentially.
    func updateChoreOrder(_ orderedChores: [Chore]) async {
        #if canImport(Supabase)
        guard let client = client else { return }

        // Optimistic local update
        await MainActor.run {
            let orderedIds = orderedChores.map(\.id)
            chores.sort { a, b in
                let ai = orderedIds.firstIndex(of: a.id) ?? Int.max
                let bi = orderedIds.firstIndex(of: b.id) ?? Int.max
                return ai == bi ? a.createdAt < b.createdAt : ai < bi
            }
        }

        struct SortUpdate: Encodable {
            let sort_order: Int
        }

        for (index, chore) in orderedChores.enumerated() where chore.sortOrder != index {
            do {
                try await client
                    .from("chores")
                    .update(SortUpdate(sort_order: index))
                    .eq("id", value: chore.id.uuidString)
                    .execute()
            } catch {
                await MainActor.run {
                    debugLastError = "Reorder error: \(error.localizedDescription)"
                }
            }
        }
        #endif
    }

    func deleteChore(choreId: UUID) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        let _ = try await client
            .from("chores")
            .delete()
            .eq("id", value: choreId.uuidString)
            .execute()
        
        await MainActor.run {
            debugLastError = "Chore deleted: \(choreId)"
        }
        
        await loadRemoteData()
        #endif
    }
    
    // MARK: - Achievement Management
    
    func loadAchievements() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        
        do {
            let currentChildren = await MainActor.run { children }
            guard !currentChildren.isEmpty else { return }
            
            let childIds = currentChildren.map { $0.id.uuidString }
            
            let achievementRows: [AchievementBadgeRow] = try await client
                .from("achievement_badges")
                .select()
                .in("child_id", values: childIds)
                .order("earned_at", ascending: false)
                .execute()
                .value
            
            let mappedAchievements = achievementRows.map { row in
                Achievement(
                    id: row.id,
                    childId: row.child_id,
                    badgeType: row.badge_type,
                    badgeName: row.badge_name,
                    badgeDescription: row.badge_description,
                    badgeIcon: row.badge_icon,
                    earnedAt: ISO8601DateFormatter().date(from: row.earned_at) ?? Date()
                )
            }
            
            await MainActor.run {
                self.achievements = mappedAchievements
                debugLastError = "Loaded \(self.achievements.count) achievements"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Achievements error: \(error.localizedDescription)"
            }
        }
        #endif
    }
    
    /// All-time completion history for achievement progress (web parity: the
    /// tracker evaluates against every completion, not just the current week).
    func loadAllTimeCompletions() async {
        #if canImport(Supabase)
        guard let client = client else { return }

        let currentChores = await MainActor.run { chores }
        guard !currentChores.isEmpty else {
            await MainActor.run { allTimeCompletions = [] }
            return
        }

        struct HistoryRow: Codable {
            let chore_id: UUID
            let week_start: String?
            let day_of_week: Int?
        }

        do {
            let rows: [HistoryRow] = try await client
                .from("chore_completions")
                .select("chore_id, week_start, day_of_week")
                .in("chore_id", values: currentChores.map { $0.id.uuidString })
                .limit(10000)
                .execute()
                .value

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let calendar = Calendar.current

            let mapped = rows.map { row -> HistoricalCompletion in
                let weekStart = row.week_start ?? ""
                let day = row.day_of_week ?? 0
                let date = dateFormatter.date(from: weekStart).flatMap {
                    calendar.date(byAdding: .day, value: day, to: $0)
                }
                return HistoricalCompletion(choreId: row.chore_id, weekStart: weekStart, dayOfWeek: day, date: date)
            }

            await MainActor.run {
                self.allTimeCompletions = mapped
            }
        } catch {
            await MainActor.run {
                debugLastError = "Completion history error: \(error.localizedDescription)"
            }
        }
        #endif
    }

    /// Full progress across the 10-achievement taxonomy (web parity).
    func achievementProgress(for childId: UUID) -> [AchievementProgressInfo] {
        AchievementEngine.progress(
            for: childId,
            chores: chores,
            completions: allTimeCompletions,
            earnedBadges: achievements
        )
    }

    /// Awards any newly-earned achievements and returns them (for celebration UI).
    func checkAndAwardAchievements(for childId: UUID) async -> [Achievement] {
        #if canImport(Supabase)
        guard let client = client else { return [] }

        let progress = await MainActor.run { achievementProgress(for: childId) }
        let persisted = await MainActor.run {
            Set(achievements.filter { $0.childId == childId }.map(\.badgeType))
        }

        let newlyEarned = progress.filter { $0.earned && !persisted.contains($0.definition.id) }
        guard !newlyEarned.isEmpty else { return [] }

        struct NewAchievement: Encodable {
            let child_id: String
            let badge_type: String
            let badge_name: String
            let badge_description: String
            let badge_icon: String
        }

        for info in newlyEarned {
            let row = NewAchievement(
                child_id: childId.uuidString,
                badge_type: info.definition.id,
                badge_name: info.definition.name,
                badge_description: info.definition.description,
                badge_icon: info.definition.icon
            )
            do {
                try await client
                    .from("achievement_badges")
                    .insert(row)
                    .execute()
            } catch {
                await MainActor.run {
                    debugLastError = "Achievement award error: \(error.localizedDescription)"
                }
            }
        }

        await loadAchievements()

        let earnedIds = Set(newlyEarned.map { $0.definition.id })
        return await MainActor.run {
            achievements.filter { $0.childId == childId && earnedIds.contains($0.badgeType) }
        }
        #else
        return []
        #endif
    }

    func getAchievements(for childId: UUID) -> [Achievement] {
        return achievements.filter { $0.childId == childId }
    }
    
    // MARK: - Profile & Subscription
    
    /// GET /api/kid-login-code — fetch-or-create this family's kid login code.
    /// Bearer-authenticated, so it works without a web session.
    private func materializeKidLoginCode() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        guard let token = try? await client.auth.session.accessToken else { return }
        guard let url = URL(string: "\(SupabaseManager.appBaseURL)/api/kid-login-code") else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        struct CodeResponse: Decodable { let code: String? }
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let decoded = try? JSONDecoder().decode(CodeResponse.self, from: data),
              let code = decoded.code, !code.isEmpty else {
            return
        }

        await MainActor.run {
            self.kidLoginCode = code
            debugLastError = "Kid login code generated"
        }
        #endif
    }

    func loadProfile() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { debugUserId }
        guard let uid = uid else { return }
        
        do {
            let profiles: [ProfileRow] = try await client
                .from("profiles")
                .select("id, subscription_type, kid_login_code")
                .eq("id", value: uid)
                .limit(1)
                .execute()
                .value
            
            await MainActor.run {
                self.subscriptionType = profiles.first?.subscription_type ?? "free"
                self.kidLoginCode = profiles.first?.kid_login_code
                debugLastError = "Profile loaded: \(self.subscriptionType)"
            }

            // Accounts created before signup seeded kid_login_code have none,
            // which made kid login impossible from an iOS-only family. The
            // endpoint mints one on demand (owners only — shared members use
            // the owner's code, handled below).
            if profiles.first?.kid_login_code == nil,
               await MainActor.run(body: { memberOfFamilyId }) == nil {
                await materializeKidLoginCode()
            }

            // Shared members use the family owner's kid login code
            // (readable once the family-sharing RLS migration is applied)
            if let ownerId = await MainActor.run(body: { memberOfFamilyId }) {
                let ownerProfiles: [ProfileRow] = (try? await client
                    .from("profiles")
                    .select("id, subscription_type, kid_login_code")
                    .eq("id", value: ownerId.uuidString)
                    .limit(1)
                    .execute()
                    .value) ?? []

                if let ownerCode = ownerProfiles.first?.kid_login_code {
                    await MainActor.run {
                        self.kidLoginCode = ownerCode
                    }
                }
            }
        } catch {
            await MainActor.run {
                debugLastError = "Profile error: \(error.localizedDescription)"
            }
        }
        #endif
    }
    
    // MARK: - Family Sharing (family_codes join flow + family_members)

    /// Resolves whether this user is a member of another family. Must run
    /// before loading children so queries use the effective family id.
    func resolveFamilyMembership() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { debugUserId }
        guard let uid = uid else { return }

        struct MembershipRow: Codable {
            let family_id: UUID
        }

        do {
            let rows: [MembershipRow] = try await client
                .from("family_members")
                .select("family_id")
                .eq("user_id", value: uid)
                .limit(1)
                .execute()
                .value

            await MainActor.run {
                memberOfFamilyId = rows.first?.family_id
            }
        } catch {
            await MainActor.run {
                debugLastError = "Family membership error: \(error.localizedDescription)"
            }
        }
        #endif
    }

    /// Loads this family's members (owner view) and the join code if one exists.
    func loadFamilySharing() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { debugUserId }
        guard let uid = uid else { return }

        struct MemberRow: Codable {
            let id: UUID
            let user_id: UUID
            let joined_at: String?
        }

        struct CodeRow: Codable {
            let code: String
        }

        do {
            let members: [MemberRow] = try await client
                .from("family_members")
                .select("id, user_id, joined_at")
                .eq("family_id", value: uid)
                .execute()
                .value

            let isoFormatter = ISO8601DateFormatter()
            let mapped = members.map { row in
                FamilyMemberInfo(
                    id: row.id,
                    userId: row.user_id,
                    joinedAt: row.joined_at.flatMap { isoFormatter.date(from: $0) }
                )
            }

            let codes: [CodeRow] = (try? await client
                .from("family_codes")
                .select("code")
                .eq("user_id", value: uid)
                .limit(1)
                .execute()
                .value) ?? []

            await MainActor.run {
                familyMembers = mapped
                familyJoinCode = codes.first?.code
            }
        } catch {
            await MainActor.run {
                debugLastError = "Family sharing error: \(error.localizedDescription)"
            }
        }
        #endif
    }

    /// Creates (or returns) this family's shareable join code.
    func generateFamilyJoinCode() async throws -> String {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        let uid = await MainActor.run { debugUserId }
        guard let uid = uid else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not signed in"])
        }

        if let existing = await MainActor.run(body: { familyJoinCode }) {
            return existing
        }

        let alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
        let code = String((0..<8).map { _ in alphabet.randomElement()! })

        struct NewCodeRow: Encodable {
            let user_id: String
            let code: String
        }

        try await client
            .from("family_codes")
            .insert(NewCodeRow(user_id: uid, code: code))
            .execute()

        await MainActor.run {
            familyJoinCode = code
        }
        return code
        #else
        throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Supabase not available"])
        #endif
    }

    /// Joins another family by code. Returns nil on success, else an error message.
    func joinFamily(code: String) async -> String? {
        #if canImport(Supabase)
        guard let client = client else { return "Something went wrong." }
        let uid = await MainActor.run { debugUserId }
        guard let uid = uid else { return "Not signed in." }

        struct CodeLookupRow: Codable {
            let user_id: UUID
        }

        do {
            let rows: [CodeLookupRow] = try await client
                .from("family_codes")
                .select("user_id")
                .eq("code", value: code.lowercased().trimmingCharacters(in: .whitespaces))
                .limit(1)
                .execute()
                .value

            guard let owner = rows.first?.user_id else {
                return "That code doesn't match any family. Double-check it and try again."
            }

            if owner.uuidString.lowercased() == uid.lowercased() {
                return "That's your own family code."
            }

            struct NewMemberRow: Encodable {
                let user_id: String
                let family_id: String
            }

            try await client
                .from("family_members")
                .insert(NewMemberRow(user_id: uid, family_id: owner.uuidString))
                .execute()

            await MainActor.run {
                memberOfFamilyId = owner
            }
            await loadRemoteData()
            return nil
        } catch let error as PostgrestError where error.code == "23505" {
            return "You've already joined this family."
        } catch {
            return "Couldn't join: \(error.localizedDescription)"
        }
        #else
        return "Supabase not available"
        #endif
    }

    /// Leaves the family this user is a member of.
    func leaveFamily() async throws {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { debugUserId }
        guard let uid = uid else { return }

        try await client
            .from("family_members")
            .delete()
            .eq("user_id", value: uid)
            .execute()

        await MainActor.run {
            memberOfFamilyId = nil
        }
        await loadRemoteData()
        #endif
    }

    /// Removes a member from this user's family (owner action).
    func removeFamilyMember(memberId: UUID) async throws {
        #if canImport(Supabase)
        guard let client = client else { return }

        try await client
            .from("family_members")
            .delete()
            .eq("id", value: memberId.uuidString)
            .execute()

        await loadFamilySharing()
        #endif
    }

    /// Publishes today's progress to the shared app group for the home screen widget.
    @MainActor
    func publishWidgetSnapshot() {
        // The widget shows today's list: only chores due today count.
        let childProgress = children.map { child -> WidgetSnapshot.ChildProgress in
            let childChores = dueChores(for: child.id)
            let done = childChores.filter { isChoreCompleted($0) }.count
            let goal = wallets[child.id]?.goal
            return WidgetSnapshot.ChildProgress(
                id: child.id,
                name: child.name,
                colorName: child.avatarColor,
                done: done,
                total: childChores.count,
                goalEmoji: goal?.emoji,
                goalPercent: goal?.percent
            )
        }

        let earned = children.reduce(0.0) { $0 + calculateTodayEarnings(for: $1.id) }
        let dueToday = choresDueToday
        let topStreak = children.map { calculateWeeklyStats(for: $0.id).streak }.max() ?? 0

        WidgetSnapshot(
            completedToday: dueToday.filter { isChoreCompleted($0) }.count,
            totalToday: dueToday.count,
            earnedTodayFormatted: formatMoney(earned),
            children: childProgress,
            generatedAt: Date(),
            topStreak: topStreak,
            accentHex: ThemeManager.shared.accentHex,
            secondaryHex: ThemeManager.shared.secondaryHex
        ).publish()
    }

    /// Persists a subscription upgrade to the user's profile (called after a
    /// verified App Store transaction — see StoreKitManager for the policy).
    func updateSubscriptionType(_ type: String) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let uid = await MainActor.run { debugUserId }
        guard let uid = uid else { return }

        struct ProfileUpdate: Encodable {
            let subscription_type: String
        }

        do {
            try await client
                .from("profiles")
                .update(ProfileUpdate(subscription_type: type))
                .eq("id", value: uid)
                .execute()

            await MainActor.run {
                self.subscriptionType = type
                debugLastError = "Subscription updated: \(type)"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Subscription update error: \(error.localizedDescription)"
            }
        }
        #endif
    }

    // MARK: - Routines Management
    
    func loadRoutines() async {
        #if canImport(Supabase)
        guard let client = client else { return }
        let currentChildren = await MainActor.run { children }
        guard !currentChildren.isEmpty else { return }
        
        let childIds = currentChildren.map { $0.id.uuidString }
        
        do {
            let routineRows: [RoutineRow] = try await client
                .from("routines")
                .select()
                .in("child_id", values: childIds)
                .eq("is_active", value: true)
                .order("created_at", ascending: false)
                .limit(100)
                .execute()
                .value
            
            let routineIds = routineRows.map { $0.id.uuidString }
            
            var stepRows: [RoutineStepRow] = []
            if !routineIds.isEmpty {
                stepRows = try await client
                    .from("routine_steps")
                    .select()
                    .in("routine_id", values: routineIds)
                    .order("order_index", ascending: true)
                    .execute()
                    .value
            }
            
            let stepsByRoutine = Dictionary(grouping: stepRows, by: { $0.routine_id })
            let isoFormatter = ISO8601DateFormatter()
            
            let mapped = routineRows.map { row in
                let steps = (stepsByRoutine[row.id] ?? []).map { stepRow in
                    RoutineStep(
                        id: stepRow.id,
                        routineId: stepRow.routine_id,
                        title: stepRow.title,
                        description: stepRow.description,
                        icon: stepRow.icon ?? "circle",
                        orderIndex: stepRow.order_index ?? 0,
                        durationSeconds: stepRow.duration_seconds,
                        createdAt: isoFormatter.date(from: stepRow.created_at) ?? Date()
                    )
                }
                return Routine(
                    id: row.id,
                    childId: row.child_id,
                    name: row.name,
                    type: row.type,
                    icon: row.icon ?? "list.bullet",
                    color: row.color ?? "#6366f1",
                    rewardCents: row.reward_cents ?? 7,
                    isActive: row.is_active ?? true,
                    createdAt: isoFormatter.date(from: row.created_at) ?? Date(),
                    updatedAt: isoFormatter.date(from: row.updated_at) ?? Date(),
                    steps: steps
                )
            }
            
            // Today's completions drive "Done!" badges and replay prevention
            struct CompletionIdRow: Codable {
                let routine_id: UUID
            }

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let today = dateFormatter.string(from: Date())

            var doneIds: Set<UUID> = []
            if !routineIds.isEmpty {
                let completionRows: [CompletionIdRow] = (try? await client
                    .from("routine_completions")
                    .select("routine_id")
                    .in("routine_id", values: routineIds)
                    .eq("date", value: today)
                    .execute()
                    .value) ?? []
                doneIds = Set(completionRows.map(\.routine_id))
            }

            let capturedDoneIds = doneIds
            await MainActor.run {
                self.routines = mapped
                self.completedRoutineIds = capturedDoneIds
                debugLastError = "Loaded \(mapped.count) routines"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Routines error: \(error.localizedDescription)"
            }
        }
        #endif
    }
    
    func createRoutine(name: String, childId: UUID, type: String, icon: String, color: String,
                       rewardCents: Int, steps: [(title: String, icon: String, durationSeconds: Int?)]) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        struct NewRoutineRow: Encodable {
            let id: String
            let child_id: String
            let name: String
            let type: String
            let icon: String
            let color: String
            let reward_cents: Int
            let is_active: Bool
        }
        
        let routineId = UUID()
        let newRoutine = NewRoutineRow(
            id: routineId.uuidString,
            child_id: childId.uuidString,
            name: name,
            type: type,
            icon: icon,
            color: color,
            reward_cents: rewardCents,
            is_active: true
        )
        
        try await client
            .from("routines")
            .insert(newRoutine)
            .execute()
        
        struct NewStepRow: Encodable {
            let routine_id: String
            let title: String
            let icon: String
            let order_index: Int
            let duration_seconds: Int?
        }
        
        if !steps.isEmpty {
            let stepRows = steps.enumerated().map { index, step in
                NewStepRow(
                    routine_id: routineId.uuidString,
                    title: step.title,
                    icon: step.icon,
                    order_index: index,
                    duration_seconds: step.durationSeconds
                )
            }
            
            try await client
                .from("routine_steps")
                .insert(stepRows)
                .execute()
        }
        
        await MainActor.run {
            debugLastError = "Routine created: \(name)"
        }
        
        await loadRoutines()
        #endif
    }
    
    func updateRoutine(routineId: UUID, name: String, childId: UUID, type: String, icon: String,
                       color: String, rewardCents: Int,
                       steps: [(title: String, icon: String, durationSeconds: Int?)]) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        struct RoutineUpdate: Encodable {
            let name: String
            let child_id: String
            let type: String
            let icon: String
            let color: String
            let reward_cents: Int
            let updated_at: String
        }
        
        let update = RoutineUpdate(
            name: name,
            child_id: childId.uuidString,
            type: type,
            icon: icon,
            color: color,
            reward_cents: rewardCents,
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        try await client
            .from("routines")
            .update(update)
            .eq("id", value: routineId.uuidString)
            .execute()
        
        // Replace steps: delete existing, insert new
        try await client
            .from("routine_steps")
            .delete()
            .eq("routine_id", value: routineId.uuidString)
            .execute()
        
        struct NewStepRow: Encodable {
            let routine_id: String
            let title: String
            let icon: String
            let order_index: Int
            let duration_seconds: Int?
        }
        
        if !steps.isEmpty {
            let stepRows = steps.enumerated().map { index, step in
                NewStepRow(
                    routine_id: routineId.uuidString,
                    title: step.title,
                    icon: step.icon,
                    order_index: index,
                    duration_seconds: step.durationSeconds
                )
            }
            
            try await client
                .from("routine_steps")
                .insert(stepRows)
                .execute()
        }
        
        await MainActor.run {
            debugLastError = "Routine updated: \(name)"
        }
        
        await loadRoutines()
        #endif
    }
    
    func deleteRoutine(routineId: UUID) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        try await client
            .from("routine_steps")
            .delete()
            .eq("routine_id", value: routineId.uuidString)
            .execute()
        
        try await client
            .from("routines")
            .delete()
            .eq("id", value: routineId.uuidString)
            .execute()
        
        await MainActor.run {
            debugLastError = "Routine deleted: \(routineId)"
        }
        
        await loadRoutines()
        #endif
    }
    
    func completeRoutine(routineId: UUID, childId: UUID, stepsCompleted: Int,
                         stepsTotal: Int, durationSeconds: Int) async throws {
        // Standalone kid mode: no parent Supabase session, go through the web API
        if await MainActor.run(body: { isStandaloneKidSession }) {
            try await completeRoutineViaAPI(
                routineId: routineId,
                stepsCompleted: stepsCompleted,
                stepsTotal: stepsTotal,
                durationSeconds: durationSeconds
            )
            _ = await MainActor.run {
                completedRoutineIds.insert(routineId)
            }
            return
        }

        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        let routine = await MainActor.run { routines.first(where: { $0.id == routineId }) }
        let pointsEarned = (stepsCompleted == stepsTotal) ? (routine?.rewardCents ?? 0) : 0
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        struct NewCompletionRow: Encodable {
            let routine_id: String
            let child_id: String
            let duration_seconds: Int
            let steps_completed: Int
            let steps_total: Int
            let points_earned: Int
            let date: String
        }
        
        let row = NewCompletionRow(
            routine_id: routineId.uuidString,
            child_id: childId.uuidString,
            duration_seconds: durationSeconds,
            steps_completed: stepsCompleted,
            steps_total: stepsTotal,
            points_earned: pointsEarned,
            date: formatter.string(from: Date())
        )
        
        do {
            try await client
                .from("routine_completions")
                .insert(row)
                .execute()
        } catch let error as PostgrestError where error.code == "23505" {
            // Already completed today (unique index on routine_id + child_id + date)
            await MainActor.run {
                completedRoutineIds.insert(routineId)
                debugLastError = "Routine already completed today: \(routineId)"
            }
            return
        }

        await MainActor.run {
            completedRoutineIds.insert(routineId)
            debugLastError = "Routine completed: \(routineId), earned \(pointsEarned) points"
        }
        #endif
    }
    
    // MARK: - Weekly Stats
    
    func calculateWeeklyStats(for childId: UUID) -> WeeklyStats {
        let calendar = Calendar.current
        let childChores = chores.filter { $0.childId == childId }
        guard !childChores.isEmpty else { return .empty }
        
        var perfectDayCount = 0
        var dailyStatus: [Bool] = []
        var daysWithCompletions = 0
        var totalCompletions = 0
        // Days this week with at least one chore due: the "out of" for perfect
        // days and the perfect-week bonus. 7 for an unscheduled list.
        let dueDayCount = ChoreSchedule.dueDayCount(childChores)

        for day in 0..<7 {
            let dayCompletions = weekCompletions.filter { completion in
                completion.dayOfWeek == day && childChores.contains(where: { $0.id == completion.choreId })
            }
            totalCompletions += dayCompletions.count

            // Perfect = every chore DUE that day done. Nothing due: not perfect.
            let due = ChoreSchedule.due(childChores, on: day)
            let allDone = !due.isEmpty && due.allSatisfy { chore in
                dayCompletions.contains(where: { $0.choreId == chore.id })
            }
            dailyStatus.append(allDone)
            if allDone { perfectDayCount += 1 }
            if !dayCompletions.isEmpty { daysWithCompletions += 1 }
        }
        
        let weeklyBonusCents = familySettings?.weeklyBonusCents ?? 0
        var earningsCents: Int
        
        if familySettings?.isPerChoreMode == true {
            earningsCents = 0
            for day in 0..<7 {
                let dayCompletions = weekCompletions.filter { completion in
                    completion.dayOfWeek == day && childChores.contains(where: { $0.id == completion.choreId })
                }
                for completion in dayCompletions {
                    if let chore = childChores.first(where: { $0.id == completion.choreId }) {
                        earningsCents += Int(round(chore.reward * 100))
                    }
                }
            }
        } else {
            let dailyRewardCents = familySettings?.dailyRewardCents ?? 7
            earningsCents = perfectDayCount * dailyRewardCents
        }
        
        if dueDayCount > 0 && perfectDayCount == dueDayCount {
            earningsCents += weeklyBonusCents
        }

        let completionRate = dueDayCount > 0 ? Double(perfectDayCount) / Double(dueDayCount) : 0

        // Streak: consecutive days with at least one completion, counting
        // backwards from today. A day with nothing due is skipped, not broken.
        let currentDay = calendar.component(.weekday, from: Date()) - 1
        var streak = 0
        for offset in 0..<7 {
            let day = (currentDay - offset + 7) % 7
            if ChoreSchedule.due(childChores, on: day).isEmpty { continue }
            let hasCompletion = weekCompletions.contains { completion in
                completion.dayOfWeek == day && childChores.contains(where: { $0.id == completion.choreId })
            }
            if hasCompletion {
                streak += 1
            } else {
                break
            }
        }
        
        return WeeklyStats(
            totalCompletions: totalCompletions,
            totalEarnings: Double(earningsCents) / 100.0,
            completionRate: completionRate,
            perfectDays: perfectDayCount,
            streak: streak,
            dailyStatus: dailyStatus
        )
    }
    
    func calculateAggregateWeeklyStats() -> WeeklyStats {
        guard !children.isEmpty else { return .empty }
        
        var totalCompletions = 0
        var totalEarnings = 0.0
        var totalPerfectDays = 0
        var maxStreak = 0
        var aggregateDailyStatus = Array(repeating: true, count: 7)
        
        for child in children {
            let stats = calculateWeeklyStats(for: child.id)
            totalCompletions += stats.totalCompletions
            totalEarnings += stats.totalEarnings
            totalPerfectDays += stats.perfectDays
            maxStreak = max(maxStreak, stats.streak)
            for i in 0..<7 {
                aggregateDailyStatus[i] = aggregateDailyStatus[i] && stats.dailyStatus[i]
            }
        }
        
        let avgPerfectDays = totalPerfectDays / max(children.count, 1)
        let avgRate = Double(avgPerfectDays) / 7.0
        
        return WeeklyStats(
            totalCompletions: totalCompletions,
            totalEarnings: totalEarnings,
            completionRate: avgRate,
            perfectDays: avgPerfectDays,
            streak: maxStreak,
            dailyStatus: aggregateDailyStatus
        )
    }
    
}
