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
        // For now, just set to false
        // This will be implemented when we add child account features
        await MainActor.run {
            isChildSession = false
            currentChild = nil
            childSession = nil
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
            let response = try await client.auth.signIn(email: email, password: password)
            await MainActor.run {
                debugLastError = "Sign-in response: \(response)"
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
            }
        }
        #else
        debugLastError = "Supabase not available for sign out"
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
            let today = Calendar.current.startOfDay(for: Date())
            let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
            
            let formatter = ISO8601DateFormatter()
            let todayString = formatter.string(from: today)
            let tomorrowString = formatter.string(from: tomorrow)
            
            let completions: [ChoreCompletionRow] = try await client.database
                .from("chore_completions")
                .select()
                .gte("completed_at", value: todayString)
                .lt("completed_at", value: tomorrowString)
                .execute()
                .value
            
            var newCompletions: [UUID: Date] = [:]
            for completion in completions {
                if let date = ISO8601DateFormatter().date(from: completion.completed_at) {
                    newCompletions[completion.chore_id] = date
                }
            }
            
            await MainActor.run {
                self.choreCompletions = newCompletions
            }
        } catch {
            await MainActor.run {
                debugLastError = "Completions error: \(error.localizedDescription)"
            }
        }
        #endif
    }
    
    func toggleChoreCompletion(_ chore: Chore) async {
        #if canImport(Supabase)
        guard let client = client else { return }
        
        let isCompleted = await MainActor.run { isChoreCompleted(chore) }
        
        if isCompleted {
            // Remove completion
            await MainActor.run {
                choreCompletions.removeValue(forKey: chore.id)
                debugLastError = "Removed completion for chore: \(chore.name)"
            }
        } else {
            // Add completion
            let now = Date()
            await MainActor.run {
                choreCompletions[chore.id] = now
            }
            
            // Save to database
            do {
                let completion = ChoreCompletionRow(
                    id: UUID(),
                    chore_id: chore.id,
                    child_id: chore.childId,
                    completed_at: ISO8601DateFormatter().string(from: now),
                    reward_earned: chore.reward
                )
                
                try await client.database
                    .from("chore_completions")
                    .insert(completion)
                    .execute()
                
                await MainActor.run {
                    debugLastError = "Saved completion for chore: \(chore.name)"
                }
            } catch {
                await MainActor.run {
                    debugLastError = "Failed to save completion: \(error.localizedDescription)"
                    // Remove from local state if save failed
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
    }
    
    func isChoreCompleted(_ chore: Chore) -> Bool {
        guard let completionDate = choreCompletions[chore.id] else { return false }
        return Calendar.current.isDate(completionDate, inSameDayAs: Date())
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
    
    func createChild(name: String, age: Int, avatarColor: String) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        guard let uid = await MainActor.run({ debugUserId }) else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No user ID"])
        }
        
        struct NewChildRow: Encodable {
            let name: String
            let age: Int
            let avatar_color: String
            let user_id: String
            let child_access_enabled: Bool
        }
        
        let newChild = NewChildRow(
            name: name,
            age: age,
            avatar_color: avatarColor,
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
    
    func updateChild(childId: UUID, name: String?, age: Int?, avatarColor: String?, childPin: String?, childAccessEnabled: Bool?) async throws {
        #if canImport(Supabase)
        guard let client = client else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No Supabase client"])
        }
        
        var updates: [String: Any] = [:]
        if let name = name { updates["name"] = name }
        if let age = age { updates["age"] = age }
        if let avatarColor = avatarColor { updates["avatar_color"] = avatarColor }
        if let childPin = childPin { updates["child_pin"] = childPin }
        if let childAccessEnabled = childAccessEnabled { updates["child_access_enabled"] = childAccessEnabled }
        updates["updated_at"] = ISO8601DateFormatter().string(from: Date())
        
        try await client.database
            .from("children")
            .update(updates)
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
        
        try await client.database
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
        
        guard let uid = await MainActor.run({ debugUserId }) else {
            throw NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No user ID"])
        }
        
        struct NewChoreRow: Encodable {
            let name: String
            let child_id: String
            let user_id: String
            let reward_cents: Int
            let description: String?
            let category: String?
            let icon: String?
            let color: String?
            let notes: String?
            let is_active: Bool
        }
        
        let newChore = NewChoreRow(
            name: name,
            child_id: childId.uuidString,
            user_id: uid,
            reward_cents: rewardCents,
            description: description,
            category: category,
            icon: icon,
            color: color,
            notes: notes,
            is_active: true
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
        
        var updates: [String: Any] = [:]
        if let name = name { updates["name"] = name }
        if let childId = childId { updates["child_id"] = childId.uuidString }
        if let rewardCents = rewardCents { updates["reward_cents"] = rewardCents }
        if let description = description { updates["description"] = description }
        if let category = category { updates["category"] = category }
        if let icon = icon { updates["icon"] = icon }
        if let color = color { updates["color"] = color }
        if let notes = notes { updates["notes"] = notes }
        updates["updated_at"] = ISO8601DateFormatter().string(from: Date())
        
        try await client.database
            .from("chores")
            .update(updates)
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
        
        try await client.database
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
