import Foundation
import SwiftUI

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
    @Published var choreCompletions: [UUID: Date] = [:]
    @Published var achievements: [Achievement] = []
    @Published var isChildSession = false
    @Published var currentChild: Child?
    
    // Child session properties
    @Published var childSession: ChildSession?
    
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
        await checkChildSession()
        
        if isAuthenticated {
            await loadRemoteData()
        }
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
        // Check if there's a saved child session
        guard let savedChildId = UserDefaults.standard.string(forKey: "child_session_id"),
              let childUUID = UUID(uuidString: savedChildId),
              let sessionToken = UserDefaults.standard.string(forKey: "child_session_token") else {
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
    
    func authenticateChild(childId: UUID, pin: String) async -> Bool {
        let child = await MainActor.run { children.first(where: { $0.id == childId }) }
        
        guard let child = child,
              let storedPin = child.childPin,
              storedPin == pin else {
            await MainActor.run {
                debugLastError = "Child auth failed: invalid PIN"
            }
            return false
        }
        
        // Create session
        let sessionToken = UUID().uuidString
        
        await MainActor.run {
            self.currentChild = child
            self.isChildSession = true
            debugLastError = "Child authenticated: \(child.name)"
        }
        
        // Save session
        UserDefaults.standard.set(childId.uuidString, forKey: "child_session_id")
        UserDefaults.standard.set(sessionToken, forKey: "child_session_token")
        
        return true
    }
    
    func signOutChild() {
        UserDefaults.standard.removeObject(forKey: "child_session_id")
        UserDefaults.standard.removeObject(forKey: "child_session_token")
        
        isChildSession = false
        currentChild = nil
        childSession = nil
        
        debugLastError = "Child signed out"
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
            let session = try await client.auth.signIn(
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
            // Don't load data on auth failure
        }
        #else
        await MainActor.run {
            debugLastError = "Supabase not available for sign in"
        }
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
                debugLastError = "Signed out successfully"
                
                // Also clear remember me
                UserDefaults.standard.removeObject(forKey: "saved_email")
                UserDefaults.standard.removeObject(forKey: "saved_password")
                UserDefaults.standard.set(false, forKey: "remember_me")
            }
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
            
            // Update saved password if remember me is enabled
            if UserDefaults.standard.bool(forKey: "remember_me") {
                UserDefaults.standard.set(newPassword, forKey: "saved_password")
            }
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
        
        // Load children
        do {
            let remoteChildren: [ChildRow]
            let uid = await MainActor.run { debugUserId }
            
            if let uid = uid {
                remoteChildren = try await client.database
                    .from("children")
                    .select()
                    .eq("user_id", value: uid)
                    .limit(100)
                    .execute()
                    .value
                await MainActor.run {
                    debugLastError = "Querying children for user_id: \(uid)"
                }
            } else {
                remoteChildren = try await client.database
                    .from("children")
                    .select()
                    .limit(100)
                    .execute()
                    .value
                await MainActor.run {
                    debugLastError = "No user_id, querying all children"
                }
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
                    childPin: row.child_pin,
                    childAccessEnabled: row.child_access_enabled ?? false,
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
                    choresFetched = try await client.database
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
        
        // If no data loaded, fall back to demo data
        let currentChildren = await MainActor.run { children }
        let currentChores = await MainActor.run { chores }
        let uid = await MainActor.run { debugUserId }
        
        if currentChildren.isEmpty && currentChores.isEmpty {
            await MainActor.run {
                debugLastError = "No remote data found for user \(uid ?? "unknown"), loading demo data"
                loadSampleData()
            }
        } else {
            await MainActor.run {
                debugLastError = "Successfully loaded \(currentChildren.count) children and \(currentChores.count) chores"
            }
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
            
            let completions: [ChoreCompletionRow] = try await client.database
                .from("chore_completions")
                .select()
                .eq("day_of_week", value: dayOfWeek)
                .eq("week_start", value: weekStartString)
                .execute()
                .value
            
            var newCompletions: [UUID: Date] = [:]
            for completion in completions {
                // Use current time as the completion date for display
                newCompletions[completion.chore_id] = now
            }
            
            await MainActor.run {
                self.choreCompletions = newCompletions
                debugLastError = "Loaded \(completions.count) completions for today"
            }
        } catch {
            await MainActor.run {
                debugLastError = "Completions error: \(error.localizedDescription)"
            }
        }
        #endif
    }
    
    func toggleChoreCompletion(_ chore: Chore) async -> [Achievement] {
        let isCompleted = await MainActor.run { isChoreCompleted(chore) }
        var newAchievements: [Achievement] = []
        
        #if canImport(Supabase)
        guard let client = client else {
            await MainActor.run {
                if isCompleted {
                    choreCompletions.removeValue(forKey: chore.id)
                } else {
                    choreCompletions[chore.id] = Date()
                }
                debugLastError = "Toggled locally: \(chore.name)"
            }
            return newAchievements
        }
        
        if isCompleted {
            // Remove completion - delete from database
            await MainActor.run {
                self.objectWillChange.send()
                choreCompletions.removeValue(forKey: chore.id)
            }
            
            // Delete from database
            do {
                let calendar = Calendar.current
                let now = Date()
                let dayOfWeek = calendar.component(.weekday, from: now) - 1
                let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now))!
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                let weekStartString = formatter.string(from: weekStart)
                
                let _ = try await client.database
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
            let now = Date()
            let calendar = Calendar.current
            
            // Calculate day_of_week (0=Sunday, 1=Monday, etc.)
            let dayOfWeek = calendar.component(.weekday, from: now) - 1
            
            // Calculate week_start (Sunday of current week)
            let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now))!
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            let weekStartString = formatter.string(from: weekStart)
            
            await MainActor.run {
                self.objectWillChange.send()
                choreCompletions[chore.id] = now
            }
            
            // Save to database (upsert behavior - insert or ignore if exists)
            do {
                let completion = ChoreCompletionRow(
                    id: UUID(),
                    chore_id: chore.id,
                    day_of_week: dayOfWeek,
                    week_start: weekStartString,
                    completed_at: ISO8601DateFormatter().string(from: now)
                )
                
                try await client.database
                    .from("chore_completions")
                    .insert(completion)
                    .execute()
                
                // Check for achievements after successful completion
                newAchievements = await checkAndAwardAchievements(for: chore.childId)
            } catch let error as PostgrestError {
                // If it's a duplicate key error, that's okay - it means it's already completed
                if error.code != "23505" {
                    // Remove from local state if save failed (but not for duplicate key)
                    await MainActor.run {
                        choreCompletions.removeValue(forKey: chore.id)
                    }
                }
            } catch {
                // Remove from local state if save failed
                await MainActor.run {
                    choreCompletions.removeValue(forKey: chore.id)
                }
            }
        }
        #else
        // Demo mode - just toggle locally
        await MainActor.run {
            if isChoreCompleted(chore) {
                choreCompletions.removeValue(forKey: chore.id)
            } else {
                choreCompletions[chore.id] = Date()
            }
        }
        #endif
        
        return newAchievements
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
    
    // Calculate earnings for a child based on today's completions
    // Money is only earned when ALL chores for the day are completed
    func calculateTodayEarnings(for childId: UUID) -> Double {
        let childChores = chores.filter { $0.childId == childId }
        guard !childChores.isEmpty else { return 0.0 }
        
        // Check if today is a perfect day (all chores completed)
        if isTodayPerfectDay(for: childId) {
            // Calculate the daily reward as the sum of all chore rewards
            let totalReward = childChores.reduce(0.0) { $0 + $1.reward }
            return totalReward
        }
        
        return 0.0
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
            let child_access_enabled: Bool
        }
        
        let newChild = NewChildRow(
            name: name,
            age: age,
            avatar_color: avatarColor,
            avatar_url: avatarUrl,
            avatar_file: avatarFile,
            user_id: uid,
            child_access_enabled: false
        )
        
        try await client.database
            .from("children")
            .insert(newChild)
            .execute()
        
        await MainActor.run {
            debugLastError = "Child created: \(name)"
        }
        
        await loadRemoteData()
        #endif
    }
    
    func updateChild(childId: UUID, name: String?, age: Int?, avatarColor: String?, avatarUrl: String?, avatarFile: String?, childPin: String?, childAccessEnabled: Bool?) async throws {
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
            let child_pin: String?
            let child_access_enabled: Bool?
            let updated_at: String
        }
        
        let update = ChildUpdate(
            name: name,
            age: age,
            avatar_color: avatarColor,
            avatar_url: avatarUrl,
            avatar_file: avatarFile,
            child_pin: childPin,
            child_access_enabled: childAccessEnabled,
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        try await client.database
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
        
        let _ = try await client.database
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
        
        try await client.database
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
        
        try await client.database
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
        
        let _ = try await client.database
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
            
            let achievementRows: [AchievementBadgeRow] = try await client.database
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
    
    func awardAchievement(childId: UUID, badgeType: BadgeType) async -> Bool {
        #if canImport(Supabase)
        guard let client = client else { return false }
        
        // Check if badge already earned
        let existingBadge = await MainActor.run {
            achievements.first(where: { $0.childId == childId && $0.badgeType == badgeType.rawValue })
        }
        
        if existingBadge != nil {
            return false // Already earned
        }
        
        struct NewAchievement: Encodable {
            let child_id: String
            let badge_type: String
            let badge_name: String
            let badge_description: String
            let badge_icon: String
        }
        
        let newAchievement = NewAchievement(
            child_id: childId.uuidString,
            badge_type: badgeType.rawValue,
            badge_name: badgeType.name,
            badge_description: badgeType.description,
            badge_icon: badgeType.icon
        )
        
        do {
            try await client.database
                .from("achievement_badges")
                .insert(newAchievement)
                .execute()
            
            await loadAchievements()
            
            await MainActor.run {
                debugLastError = "✅ Achievement awarded: \(badgeType.name)"
            }
            
            return true
        } catch {
            await MainActor.run {
                debugLastError = "❌ Achievement error: \(error.localizedDescription)"
            }
            return false
        }
        #else
        return false
        #endif
    }
    
    func checkAndAwardAchievements(for childId: UUID) async -> [Achievement] {
        var newAchievements: [Achievement] = []
        
        let childChores = await MainActor.run {
            chores.filter { $0.childId == childId }
        }
        
        guard !childChores.isEmpty else { return newAchievements }
        
        // Count total completions for this child (simple count of completed today)
        let completedToday = await MainActor.run {
            childChores.filter { isChoreCompleted($0) }.count
        }
        
        // Check for First Chore achievement
        if completedToday == 1 {
            let awarded = await awardAchievement(childId: childId, badgeType: .firstChore)
            if awarded {
                let foundAchievement = await MainActor.run {
                    achievements.first(where: { $0.childId == childId && $0.badgeType == BadgeType.firstChore.rawValue })
                }
                if let achievement = foundAchievement {
                    newAchievements.append(achievement)
                }
            }
        }
        
        // Check for Perfect Week achievement (all chores completed today)
        if completedToday == childChores.count && completedToday > 0 {
            let awarded = await awardAchievement(childId: childId, badgeType: .perfectWeek)
            if awarded {
                let foundAchievement = await MainActor.run {
                    achievements.first(where: { $0.childId == childId && $0.badgeType == BadgeType.perfectWeek.rawValue })
                }
                if let achievement = foundAchievement {
                    newAchievements.append(achievement)
                }
            }
        }
        
        // TODO: Add more achievement checks (dedicated, etc.) when we have historical completion data
        
        return newAchievements
    }
    
    func getAchievements(for childId: UUID) -> [Achievement] {
        return achievements.filter { $0.childId == childId }
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
                childPin: nil,
                childAccessEnabled: false,
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
                childPin: nil,
                childAccessEnabled: false,
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
