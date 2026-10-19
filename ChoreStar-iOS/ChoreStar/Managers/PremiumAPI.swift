import Foundation
import UIKit

#if canImport(Supabase)
import Supabase
#endif

/// The 2.5.3 Premium features talk to the same web API the web app uses
/// (docs/PREMIUM.md): the server checks the plan, the family and the money
/// rules, so iOS never re-implements them. Parents send their Supabase access
/// token as `Authorization: Bearer` (lib/utils/parent-auth.ts); kid mode sends
/// the kid token through `kidAPI`.
extension SupabaseManager {
    // MARK: - Plumbing

    /// One parent request to the web API. Returns (data, status), or nil when
    /// there is no session or the network failed.
    func parentAPI(
        _ path: String,
        method: String = "GET",
        query: [String: String] = [:],
        json: [String: Any]? = nil
    ) async -> (Data, Int)? {
        guard let token = await parentBearerToken(),
              var components = URLComponents(string: "\(SupabaseManager.appBaseURL)\(path)") else { return nil }
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.cachePolicy = .reloadIgnoringLocalCacheData
        if let json {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: json)
        }
        guard let (data, response) = try? await URLSession.shared.data(for: request) else { return nil }
        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }

    /// `message` or `error` from a failed API answer.
    func apiMessage(_ data: Data, fallback: String) -> String {
        struct Failure: Decodable { let message: String?; let error: String? }
        let failure = try? JSONDecoder().decode(Failure.self, from: data)
        return failure?.message ?? failure?.error ?? fallback
    }

    private var familyIdParam: String {
        (effectiveUserId ?? "").lowercased()
    }

    // MARK: - Money (/api/money)

    func loadMoney() async -> MoneyLogic.Response? {
        guard let (data, status) = await parentAPI("/api/money", query: ["familyId": familyIdParam]),
              status == 200 else { return nil }
        return try? JSONDecoder().decode(MoneyLogic.Response.self, from: data)
    }

    /// One change to a kid's money. Returns the kid's fresh state, or why not.
    func postMoney(
        action: String,
        childId: String,
        payload: [String: Any],
        feature: MoneyLogic.Feature
    ) async -> Result<MoneyLogic.Kid, MoneyLogicFailure> {
        var body = payload
        body["action"] = action
        body["childId"] = childId
        guard let (data, status) = await parentAPI("/api/money", method: "POST", json: body) else {
            return .failure(MoneyLogicFailure(error: .message(String(localized: "Couldn't reach ChoreStar. Check your connection and try again."))))
        }
        if status == 200, let decoded = try? JSONDecoder().decode(MoneyLogic.PostResponse.self, from: data), let kid = decoded.kid {
            // The wallet the parent and kid screens read moved too.
            if let id = UUID(uuidString: childId) { Task { await loadWallet(for: id) } }
            return .success(kid)
        }
        return .failure(MoneyLogicFailure(error: MoneyLogic.postError(status: status, body: data, fallbackFeature: feature)))
    }

    // MARK: - Family challenges

    /// The parent's list, read the way the web dashboard reads it: rows via
    /// RLS, progress derived on the device from the completions. Nil when the
    /// table isn't there yet (migration 031 not applied).
    func loadFamilyChallenges() async -> [ChallengeProgress.WithProgress]? {
        #if canImport(Supabase)
        guard let client, let familyId = effectiveUserId?.lowercased() else { return nil }
        do {
            let rows: [ChallengeProgress.Row] = try await client
                .from("family_challenges")
                .select(ChallengeProgress.columns)
                .eq("user_id", value: familyId)
                .in("status", values: ["active", "delivered"])
                .order("created_at", ascending: false)
                .limit(30)
                .execute()
                .value
            let tz = await MainActor.run { familySettings?.timezone }
            let inputs = await challengeInputs(rows, timeZone: tz)
            return ChallengeProgress.parentList(rows, inputs: inputs)
        } catch {
            await MainActor.run { debugLastError = "Challenges: \(error.localizedDescription)" }
            return nil
        }
        #else
        return nil
        #endif
    }

    /// The completions every challenge needs (lib/challenges/data.ts).
    private func challengeInputs(_ rows: [ChallengeProgress.Row], timeZone: String?) async -> ChallengeProgress.Inputs {
        var inputs = ChallengeProgress.Inputs(timeZone: timeZone)
        #if canImport(Supabase)
        guard let client, let range = ChallengeProgress.fetchRange(rows) else { return inputs }
        var choreKids = Set<String>()
        var routineKids = Set<String>()
        for row in rows {
            for id in row.child_ids {
                if row.metric == "chores" { choreKids.insert(id.uuidString.lowercased()) } else { routineKids.insert(id.uuidString.lowercased()) }
            }
        }
        if !choreKids.isEmpty {
            // Every chore the kids have, archived or not; rotation_mode (025) when it exists.
            var chores: [ChallengeProgress.ChoreLite] = (try? await client.from("chores")
                .select("id, child_id, rotation_mode").in("child_id", values: Array(choreKids)).execute().value) ?? []
            if chores.isEmpty {
                chores = (try? await client.from("chores")
                    .select("id, child_id").in("child_id", values: Array(choreKids)).execute().value) ?? []
            }
            inputs.chores = chores
            if !chores.isEmpty {
                inputs.choreCompletions = (try? await client.from("chore_completions")
                    .select("chore_id, week_start, day_of_week, status")
                    .in("chore_id", values: chores.map { $0.id.uuidString.lowercased() })
                    .gte("week_start", value: range.weekFrom)
                    .lte("week_start", value: range.weekTo)
                    .execute().value) ?? []
            }
        }
        if !routineKids.isEmpty {
            inputs.routines = (try? await client.from("routines")
                .select("id, child_id, type").in("child_id", values: Array(routineKids)).execute().value) ?? []
            inputs.routineCompletions = (try? await client.from("routine_completions")
                .select("routine_id, child_id, date, completed_at")
                .in("child_id", values: Array(routineKids))
                .gte("date", value: range.dateFrom)
                .lte("date", value: range.dateTo)
                .execute().value) ?? []
        }
        #endif
        return inputs
    }

    /// POST /api/challenges (Premium). Nil on success, else a message;
    /// `premiumRequired` when the server says the plan doesn't cover it.
    func createChallenge(_ body: [String: Any]) async -> (error: String?, premiumRequired: Bool) {
        guard let (data, status) = await parentAPI("/api/challenges", method: "POST", json: body) else {
            return (String(localized: "Couldn't reach ChoreStar. Check your connection and try again."), false)
        }
        if status == 200 { return (nil, false) }
        if status == 403 { return (String(localized: "Family challenges are part of Premium."), true) }
        return (apiMessage(data, fallback: String(localized: "Could not save the challenge")), false)
    }

    /// The parent handed over the reward. The server re-checks the target and
    /// credits any money to each kid. Nil on success, else a message.
    func deliverChallenge(id: UUID) async -> String? {
        guard let (data, status) = await parentAPI("/api/challenges/\(id.uuidString.lowercased())/deliver", method: "POST", json: [:]) else {
            return String(localized: "Couldn't reach ChoreStar. Check your connection and try again.")
        }
        guard status == 200 else { return apiMessage(data, fallback: String(localized: "Could not mark the reward delivered")) }
        await loadAllWallets()
        return nil
    }

    /// End early (or clear a missed one): status 'cancelled' through RLS, never gated.
    func cancelChallenge(id: UUID) async -> Bool {
        #if canImport(Supabase)
        guard let client else { return false }
        struct Cancel: Encodable { let status = "cancelled" }
        do {
            try await client.from("family_challenges").update(Cancel()).eq("id", value: id.uuidString.lowercased()).execute()
            return true
        } catch {
            return false
        }
        #else
        return false
        #endif
    }

    /// Kid mode: the challenges this kid is part of (GET /api/kid/challenges).
    func loadKidChallenges(childId: UUID) async -> ChallengeProgress.KidResponse? {
        guard let (data, status) = await kidAPI(path: "/api/kid/challenges", method: "GET", childId: childId),
              status == 200 else { return nil }
        return try? JSONDecoder().decode(ChallengeProgress.KidResponse.self, from: data)
    }

    // MARK: - Routine upgrades

    /// Signed URLs for step pictures (owner and co-parents can read the
    /// family folder under 032's storage policy). Path -> URL; never throws.
    func signStepPhotos(_ paths: [String]) async -> [String: URL] {
        #if canImport(Supabase)
        let unique = Array(Set(paths))
        guard let client, !unique.isEmpty else { return [:] }
        var out: [String: URL] = [:]
        for path in unique {
            if let url = try? await client.storage.from(RoutineUpgrades.photoBucket).createSignedURL(path: path, expiresIn: 2 * 60 * 60) {
                out[path] = url
            }
        }
        return out
        #else
        return [:]
        #endif
    }

    /// The player's view of a routine in a standalone kid session: fresh
    /// signed pictures, the family's plan (finish-by) and language (read-aloud).
    func loadKidRoutineDetail(routineId: UUID) async -> SupabaseManager.KidRoutineRow? {
        guard let session = await MainActor.run(body: { kidModeSession }),
              let url = URL(string: "\(SupabaseManager.appBaseURL)/api/routines/\(routineId.uuidString.lowercased())") else { return nil }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(session.kidToken)", forHTTPHeaderField: "Authorization")
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return try? JSONDecoder().decode(SupabaseManager.KidRoutineRow.self, from: data)
    }

    /// Where a kid is in a routine, for the parent's live view. Best-effort:
    /// failures are ignored and never block the routine.
    func reportRoutineProgress(routineId: UUID, childId: UUID, stepIndex: Int = 0, stepsTotal: Int = 1, stepTitle: String? = nil, clear: Bool = false) async {
        var body: [String: Any] = ["childId": childId.uuidString.lowercased()]
        if clear {
            body["clear"] = true
        } else {
            body["stepIndex"] = max(0, min(stepIndex, 199))
            body["stepsTotal"] = max(1, min(stepsTotal, 200))
            if let stepTitle { body["stepTitle"] = String(stepTitle.prefix(200)) }
        }
        _ = await kidAPI(path: "/api/routines/\(routineId.uuidString.lowercased())/progress", method: "POST", childId: childId, body: body)
    }

    /// GET /api/routines/live: who is mid-routine now. Free families get
    /// `locked` rows without the step.
    func loadLiveRoutines() async -> [RoutineUpgrades.LiveRoutine] {
        guard let (data, status) = await parentAPI("/api/routines/live"), status == 200,
              let decoded = try? JSONDecoder().decode(RoutineUpgrades.LiveResponse.self, from: data) else { return [] }
        return decoded.items.filter { RoutineUpgrades.isFresh(updatedAt: $0.updatedAt) }
    }

    enum StepPhotoUpload {
        case success(path: String, url: URL?)
        case premiumRequired
        case failure(String)
    }

    /// POST /api/routines/step-photo (Premium): a 1280px JPEG for a step.
    func uploadStepPhoto(_ image: UIImage, childId: UUID) async -> StepPhotoUpload {
        guard let token = await parentBearerToken(),
              let url = URL(string: "\(SupabaseManager.appBaseURL)/api/routines/step-photo") else {
            return .failure(String(localized: "Not signed in."))
        }
        guard let jpeg = SupabaseManager.prepareProofJPEG(image) else {
            return .failure(String(localized: "That photo could not be read."))
        }
        let boundary = "chorestar-\(UUID().uuidString)"
        var body = Data()
        body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"childId\"\r\n\r\n\(childId.uuidString.lowercased())\r\n".utf8))
        body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"step.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8))
        body.append(jpeg)
        body.append(Data("\r\n--\(boundary)--\r\n".utf8))

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = body
        guard let (data, response) = try? await URLSession.shared.data(for: request) else {
            return .failure(String(localized: "Couldn't reach ChoreStar. Check your connection and try again."))
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 403 { return .premiumRequired }
        struct Uploaded: Decodable { let path: String; let url: String? }
        guard status == 200, let uploaded = try? JSONDecoder().decode(Uploaded.self, from: data) else {
            return .failure(apiMessage(data, fallback: String(localized: "Could not save the photo")))
        }
        return .success(path: uploaded.path, url: uploaded.url.flatMap(URL.init(string:)))
    }

    enum AIRoutineResult {
        case success(RoutineUpgrades.DraftResponse)
        case premiumRequired
        case failure(String)
    }

    /// POST /api/ai/build-routine (Premium). Nothing is saved; the builder fills in.
    func buildRoutineWithAI(goal: String, childId: UUID?, routineType: String?) async -> AIRoutineResult {
        var body: [String: Any] = ["goal": goal]
        if let childId { body["childId"] = childId.uuidString.lowercased() }
        if let routineType { body["routineType"] = routineType }
        guard let (data, status) = await parentAPI("/api/ai/build-routine", method: "POST", json: body) else {
            return .failure(String(localized: "Couldn't reach ChoreStar. Check your connection and try again."))
        }
        if status == 403 { return .premiumRequired }
        guard status == 200, let decoded = try? JSONDecoder().decode(RoutineUpgrades.DraftResponse.self, from: data) else {
            return .failure(apiMessage(data, fallback: String(localized: "Could not build a routine. Try again.")))
        }
        return .success(decoded)
    }

    // MARK: - Calendar feed (/api/calendar/feeds)

    func loadCalendarFeeds() async -> CalendarFeed.ListResponse? {
        guard let (data, status) = await parentAPI("/api/calendar/feeds"), status == 200 else { return nil }
        return try? JSONDecoder().decode(CalendarFeed.ListResponse.self, from: data)
    }

    enum CalendarFeedResult {
        case success(CalendarFeed.Feed)
        case premiumRequired
        case failure(String)
    }

    /// Turn a feed on, or regenerate it (a new link; the old one stops working).
    func enableCalendarFeed(childId: UUID?) async -> CalendarFeedResult {
        let body: [String: Any] = [
            "childId": childId.map { $0.uuidString.lowercased() as Any } ?? NSNull(),
            "timeZone": TimeZone.current.identifier,
        ]
        guard let (data, status) = await parentAPI("/api/calendar/feeds", method: "POST", json: body) else {
            return .failure(String(localized: "Couldn't reach ChoreStar. Check your connection and try again."))
        }
        if status == 403 { return .premiumRequired }
        guard status == 200, let decoded = try? JSONDecoder().decode(CalendarFeed.PostResponse.self, from: data) else {
            return .failure(apiMessage(data, fallback: String(localized: "Could not save the calendar feed")))
        }
        return .success(decoded.feed)
    }

    /// Turn a feed off. Never gated.
    func disableCalendarFeed(childId: UUID?) async -> Bool {
        guard let (_, status) = await parentAPI("/api/calendar/feeds", method: "DELETE",
                                                 query: ["childId": CalendarFeed.scopeParam(childId)]) else { return false }
        return status == 200
    }
}

/// Wraps MoneyLogic.PostError for Result.
struct MoneyLogicFailure: Error {
    let error: MoneyLogic.PostError
}
