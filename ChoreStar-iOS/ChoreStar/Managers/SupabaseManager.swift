import Foundation
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
    @Published var weekCompletions: [(choreId: UUID, dayOfWeek: Int)] = [] // Full week completions
    @Published var achievements: [Achievement] = []
    @Published var familySettings: FamilySettings?
    @Published var isChildSession = false
    @Published var currentChild: Child?
    @Published var routines: [Routine] = []
    @Published var subscriptionType: String = "free"
    
    var isPremium: Bool { subscriptionType == "premium" || subscriptionType == "lifetime" }
    var childLimit: Int { isPremium ? Int.max : 3 }
    var choreLimit: Int { isPremium ? Int.max : 20 }

    // Family's currency symbol (falls back to $ until settings load)
    var currencySymbol: String { familySettings?.currencySymbol ?? "$" }

    /// Formats a dollar amount using the family's currency, e.g. "£2.50".
    func formatMoney(_ amount: Double) -> String {
        String(format: "%@%.2f", currencySymbol, amount)
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

            await loadKidModeRoutines()
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

        await loadKidModeRoutines()
        return true
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
                self.isAuthenticated = false
                self.currentUserEmail = nil
                self.debugUserId = nil
            }
        }
        #else
        await MainActor.run {
            debugLastError = "Supabase not available for sign in"
        }
        #endif
    }
    
    func signUp(email: String, password: String) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        let result = try await client.auth.signUp(
            email: email,
            password: password
        )
        
        if let session = result.session {
            await MainActor.run {
                self.debugUserId = session.user.id.uuidString
                self.currentUserEmail = session.user.email ?? email
                self.isAuthenticated = true
                debugLastError = "Sign-up successful, user ID: \(session.user.id.uuidString)"
            }
            await loadRemoteData()
        } else {
            await MainActor.run {
                debugLastError = "Sign-up successful — check your email to confirm your account."
            }
        }
        #else
        throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Supabase not available"])
        #endif
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
                    createdAt: ISO8601DateFormatter().date(from: row.created_at) ?? Date(),
                    updatedAt: ISO8601DateFormatter().date(from: row.updated_at) ?? Date()
                )
            }
            
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
        await loadFamilySettings()
        await loadProfile()
        await loadRoutines()
        await loadChildPins()
        await loadAllTimeCompletions()
        await loadFamilySharing()
        
        let currentChildren = await MainActor.run { children }
        let currentChores = await MainActor.run { chores }
        
        #if DEBUG
        if currentChildren.isEmpty && currentChores.isEmpty {
            let uid = await MainActor.run { debugUserId }
            await MainActor.run {
                debugLastError = "No remote data found for user \(uid ?? "unknown"), loading demo data"
                loadSampleData()
            }
        }
        #endif
        
        await MainActor.run {
            debugLastError = "Loaded \(currentChildren.count) children and \(currentChores.count) chores"
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
            
            for completion in allWeekCompletions {
                // Add to full week list
                fullWeekCompletions.append((choreId: completion.chore_id, dayOfWeek: completion.day_of_week))
                
                // Add to today's list if it's for today
                if completion.day_of_week == dayOfWeek {
                    todayCompletions[completion.chore_id] = now
                }
            }
            
            let capturedToday = todayCompletions
            let capturedWeek = fullWeekCompletions
            await MainActor.run {
                self.choreCompletions = capturedToday
                self.weekCompletions = capturedWeek
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
    
    // Toggle completion for a specific day
    func toggleChoreCompletion(_ chore: Chore, forDay dayOfWeek: Int) async -> [Achievement] {
        #if canImport(Supabase)
        guard let client = client else { return [] }
        
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
            
            // Save to database
            do {
                let completion = ChoreCompletionRow(
                    id: UUID(),
                    chore_id: chore.id,
                    day_of_week: dayOfWeek,
                    week_start: weekStartString,
                    completed_at: ISO8601DateFormatter().string(from: now)
                )
                
                try await client
                    .from("chore_completions")
                    .insert(completion)
                    .execute()
                
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
    
    // Check if ALL chores for a child are completed today (perfect day)
    func isTodayPerfectDay(for childId: UUID) -> Bool {
        let childChores = chores.filter { $0.childId == childId }
        guard !childChores.isEmpty else { return false }
        
        // Check if all chores are completed
        let allCompleted = childChores.allSatisfy { chore in
            isChoreCompleted(chore)
        }
        
        return allCompleted
    }
    
    // Check if ALL chores for a child are completed for a specific day (perfect day)
    func isPerfectDay(for childId: UUID, dayOfWeek: Int) -> Bool {
        let childChores = chores.filter { $0.childId == childId }
        guard !childChores.isEmpty else { return false }
        
        // Check if all chores are completed for this specific day
        let allCompleted = childChores.allSatisfy { chore in
            isChoreCompleted(chore, forDay: dayOfWeek)
        }
        
        return allCompleted
    }
    
    // Calculate earnings for a child for a specific day
    func calculateDayEarnings(for childId: UUID, dayOfWeek: Int) -> Double {
        let childChores = chores.filter { $0.childId == childId }
        guard !childChores.isEmpty else { return 0.0 }
        
        if familySettings?.isPerChoreMode == true {
            // Per-chore mode: sum reward_cents for each completed chore
            let completedChores = childChores.filter { isChoreCompleted($0, forDay: dayOfWeek) }
            let totalCents = completedChores.reduce(0) { $0 + Int(round($1.reward * 100)) }
            return Double(totalCents) / 100.0
        } else {
            // Daily mode: flat daily reward when ALL chores are completed
            if isPerfectDay(for: childId, dayOfWeek: dayOfWeek) {
                let dailyRewardCents = familySettings?.dailyRewardCents ?? 7
                return Double(dailyRewardCents) / 100.0
            }
            return 0.0
        }
    }
    
    // Calculate earnings for a child based on today's completions
    // Money is only earned when ALL chores for the day are completed
    func calculateTodayEarnings(for childId: UUID) -> Double {
        let currentDay = Calendar.current.component(.weekday, from: Date()) - 1
        return calculateDayEarnings(for: childId, dayOfWeek: currentDay)
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
    
    func createChore(name: String, childId: UUID, rewardCents: Int, description: String?, category: String?, icon: String?, color: String?, notes: String?) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        struct NewChoreRow: Encodable {
            let name: String
            let child_id: String
            let reward_cents: Int
            let description: String?
            let category: String?
            let icon: String?
            let color: String?
            let notes: String?
        }
        
        let newChore = NewChoreRow(
            name: name,
            child_id: childId.uuidString,
            reward_cents: rewardCents,
            description: description,
            category: category,
            icon: icon,
            color: color,
            notes: notes
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
    
    func updateChore(choreId: UUID, name: String?, childId: UUID?, rewardCents: Int?, description: String?, category: String?, icon: String?, color: String?, notes: String?) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        struct ChoreUpdate: Encodable {
            let name: String?
            let child_id: String?
            let reward_cents: Int?
            let description: String?
            let category: String?
            let icon: String?
            let color: String?
            let notes: String?
            let updated_at: String
        }
        
        let update = ChoreUpdate(
            name: name,
            child_id: childId?.uuidString,
            reward_cents: rewardCents,
            description: description,
            category: category,
            icon: icon,
            color: color,
            notes: notes,
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
        let childProgress = children.map { child -> WidgetSnapshot.ChildProgress in
            let childChores = chores.filter { $0.childId == child.id }
            let done = childChores.filter { isChoreCompleted($0) }.count
            return WidgetSnapshot.ChildProgress(
                id: child.id,
                name: child.name,
                colorName: child.avatarColor,
                done: done,
                total: childChores.count
            )
        }

        let earned = children.reduce(0.0) { $0 + calculateTodayEarnings(for: $1.id) }

        WidgetSnapshot(
            completedToday: chores.filter { isChoreCompleted($0) }.count,
            totalToday: chores.count,
            earnedTodayFormatted: formatMoney(earned),
            children: childProgress,
            generatedAt: Date()
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
        
        for day in 0..<7 {
            let dayCompletions = weekCompletions.filter { completion in
                completion.dayOfWeek == day && childChores.contains(where: { $0.id == completion.choreId })
            }
            totalCompletions += dayCompletions.count
            
            let allDone = childChores.allSatisfy { chore in
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
        
        if perfectDayCount == 7 {
            earningsCents += weeklyBonusCents
        }
        
        let completionRate = Double(perfectDayCount) / 7.0
        
        // Streak: consecutive days with at least one completion, counting backwards from today
        let currentDay = calendar.component(.weekday, from: Date()) - 1
        var streak = 0
        for offset in 0..<7 {
            let day = (currentDay - offset + 7) % 7
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
    
    // Demo data for testing
    @MainActor
    func loadSampleData() {
        children = [
            Child(
                id: UUID(),
                name: "Emma",
                age: 8,
                avatarColor: "pink",
                avatarUrl: nil,
                avatarFile: nil,
                userId: UUID(),
                createdAt: Date(),
                updatedAt: Date()
            ),
            Child(
                id: UUID(),
                name: "Liam",
                age: 6,
                avatarColor: "blue",
                avatarUrl: nil,
                avatarFile: nil,
                userId: UUID(),
                createdAt: Date(),
                updatedAt: Date()
            )
        ]
        
        chores = [
            Chore(
                id: UUID(),
                name: "Make bed",
                childId: children[0].id,
                reward: 1.0,
                description: "Make your bed neatly",
                category: "Bedroom",
                icon: "bed.double",
                color: "blue",
                notes: nil,
                createdAt: Date(),
                updatedAt: Date()
            ),
            Chore(
                id: UUID(),
                name: "Feed the dog",
                childId: children[1].id,
                reward: 2.0,
                description: "Give the dog food and water",
                category: "Pets",
                icon: "pawprint",
                color: "green",
                notes: nil,
                createdAt: Date(),
                updatedAt: Date()
            )
        ]
        
        debugLastError = "Loaded demo data: \(children.count) children, \(chores.count) chores"
    }
}
