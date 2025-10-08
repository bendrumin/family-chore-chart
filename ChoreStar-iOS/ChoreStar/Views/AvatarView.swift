import SwiftUI

struct AvatarView: View {
    let child: Child
    let size: CGFloat
    
    var body: some View {
        Group {
            if let avatarUrl = child.avatarUrl, !avatarUrl.isEmpty {
                // DiceBear avatar from URL
                AsyncImage(url: URL(string: avatarUrl)) { phase in
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
                userId: UUID(),
                childPin: nil,
                childAccessEnabled: false,
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
                userId: UUID(),
                childPin: nil,
                childAccessEnabled: false,
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
                userId: UUID(),
                childPin: nil,
                childAccessEnabled: false,
                createdAt: Date(),
                updatedAt: Date()
            ),
            size: 80
        )
    }
    .padding()
}

