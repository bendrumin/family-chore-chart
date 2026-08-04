import SwiftUI

extension String {
    /// Converts DiceBear SVG URLs to PNG format for iOS compatibility
    func convertDiceBearToPNG(size: Int = 200) -> String {
        // If it's already a DiceBear URL, convert SVG to PNG
        if self.contains("dicebear.com") && self.contains("/svg?") {
            var url = self.replacingOccurrences(of: "/svg?", with: "/png?")
            // Add size parameter if not present
            if !url.contains("size=") {
                url += url.contains("?") ? "&size=\(size)" : "?size=\(size)"
            }
            return url
        }
        // If it's already PNG or not a DiceBear URL, return as-is
        return self
    }
}

/**
 An uploaded photo, resolved from a private Storage path to a signed URL.

 The path cannot be rendered directly — the bucket is private, so a URL has to be
 minted per session. SupabaseManager caches them, so this does not re-sign on
 every redraw of a scrolling list.
 */
struct PhotoAvatarImage: View {
    @EnvironmentObject var manager: SupabaseManager
    let path: String
    let child: Child
    let size: CGFloat

    @State private var url: URL?

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: size, height: size)
                            .clipShape(Circle())
                    } else {
                        InitialsAvatar(child: child, size: size)
                    }
                }
            } else {
                // Initials while the URL is being signed — never a spinner, which
                // would flash on every cell of a list.
                InitialsAvatar(child: child, size: size)
            }
        }
        .task(id: path) {
            url = await manager.signedAvatarURL(for: path)
        }
    }
}

/// The colour-plus-initials fallback, shared by every avatar path.
struct InitialsAvatar: View {
    let child: Child
    let size: CGFloat

    var body: some View {
        Circle()
            .fill(
                LinearGradient(
                    colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.8)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: size, height: size)
            .overlay(
                Text(child.initials)
                    .font(.system(size: size * 0.4, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            )
    }
}

struct AvatarView: View {
    let child: Child
    let size: CGFloat
    
    var body: some View {
        Group {
            // Resolution order: uploaded photo -> preset URL -> emoji -> initials.
            if let photoPath = child.avatarPhotoPath, !photoPath.isEmpty {
                PhotoAvatarImage(path: photoPath, child: child, size: size)

            } else if let avatarUrl = child.avatarUrl, !avatarUrl.isEmpty {
                // DiceBear avatar from URL (convert SVG to PNG for iOS)
                let pngUrl = avatarUrl.convertDiceBearToPNG(size: Int(size * 2))
                AsyncImage(url: URL(string: pngUrl)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: size, height: size)
                            .clipShape(Circle())
                    case .failure(_):
                        // Fallback to initials if image fails to load
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.8)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: size, height: size)
                            .overlay(
                                Text(child.initials)
                                    .font(.system(size: size * 0.4, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                            )
                    case .empty:
                        // Show initials while loading (no spinner)
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.8)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: size, height: size)
                            .overlay(
                                Text(child.initials)
                                    .font(.system(size: size * 0.4, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                            )
                    @unknown default:
                        EmptyView()
                    }
                }
                
            } else if let avatarFile = child.avatarFile, !avatarFile.isEmpty {
                // Emoji avatar
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: size, height: size)
                    .overlay(
                        Text(avatarFile)
                            .font(.system(size: size * 0.5))
                    )
                
            } else {
                // Default initials avatar
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: size, height: size)
                    .overlay(
                        Text(child.initials)
                            .font(.system(size: size * 0.4, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    )
            }
        }
    }
}

#Preview {
    HStack(spacing: 20) {
        // Default color avatar
        AvatarView(
            child: Child(
                id: UUID(),
                name: "Emma",
                age: 8,
                avatarColor: "pink",
                avatarUrl: nil,
                avatarFile: nil,
                avatarPhotoPath: nil,
                userId: UUID(),
                createdAt: Date(),
                updatedAt: Date()
            ),
            size: 80
        )
        
        // Emoji avatar
        AvatarView(
            child: Child(
                id: UUID(),
                name: "Liam",
                age: 6,
                avatarColor: "blue",
                avatarUrl: nil,
                avatarFile: "🤖",
                avatarPhotoPath: nil,
                userId: UUID(),
                createdAt: Date(),
                updatedAt: Date()
            ),
            size: 80
        )
        
        // DiceBear avatar
        AvatarView(
            child: Child(
                id: UUID(),
                name: "Olivia",
                age: 10,
                avatarColor: "purple",
                avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
                avatarFile: "Felix",
                avatarPhotoPath: nil,
                userId: UUID(),
                createdAt: Date(),
                updatedAt: Date()
            ),
            size: 80
        )
    }
    .padding()
}

