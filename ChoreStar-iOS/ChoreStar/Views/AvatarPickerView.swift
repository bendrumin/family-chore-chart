import SwiftUI

struct AvatarPickerView: View {
    @Environment(\.dismiss) var dismiss
    let onSelect: (String, String) -> Void // (avatarUrl, avatarFile)
    
    @State private var selectedTab: AvatarStyle = .robots
    @State private var selectedSeed: String?
    
    enum AvatarStyle: String, CaseIterable {
        case robots = "Robots"
        case adventurers = "Adventurers"
        case funEmojis = "Fun Emojis"
    }
    
    // Seeds for DiceBear avatars
    private let robotSeeds = ["Felix", "Aneka", "Coco", "Dusty", "Midnight", "Patches", "Boo", "Simba", "Lucky", "Missy", "Snickers", "Pumpkin", "Charlie", "Bella", "Max", "Luna", "Cooper", "Daisy", "Buddy", "Sadie"]
    
    private let adventurerSeeds = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Mason", "Sophia", "Lucas", "Mia", "Ethan", "Isabella", "James", "Charlotte", "Benjamin", "Amelia", "Elijah", "Harper", "William", "Evelyn", "Alexander"]
    
    private let emojiAvatars = ["😀", "😎", "🤓", "🥳", "😇", "🤩", "😊", "🙂", "😁", "😆", "🤗", "🥰", "😍", "🤪", "😋", "😛", "🧐", "🤠", "👽", "🤖", "🎃", "👻", "🦄", "🐶", "🐱", "🐼", "🐨", "🦁", "🐯", "🐸"]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab selector
                HStack(spacing: 0) {
                    ForEach(AvatarStyle.allCases, id: \.self) { style in
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                selectedTab = style
                            }
                        }) {
                            Text(style.rawValue)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(selectedTab == style ? .white : .choreStarTextSecondary)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(selectedTab == style ? Color.choreStarPrimary : Color.clear)
                                )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    Spacer()
                }
                .padding(6)
                .background(Color.choreStarSecondary.opacity(0.15))
                .cornerRadius(12)
                .padding()
                
                // Avatar grid
                ScrollView {
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 70), spacing: 16)
                    ], spacing: 16) {
                        switch selectedTab {
                        case .robots:
                            ForEach(robotSeeds, id: \.self) { seed in
                                DiceBearAvatarOption(
                                    seed: seed,
                                    style: "bottts",
                                    isSelected: selectedSeed == "bottts-\(seed)",
                                    onTap: {
                                        selectedSeed = "bottts-\(seed)"
                                    }
                                )
                            }
                            
                        case .adventurers:
                            ForEach(adventurerSeeds, id: \.self) { seed in
                                DiceBearAvatarOption(
                                    seed: seed,
                                    style: "adventurer",
                                    isSelected: selectedSeed == "adventurer-\(seed)",
                                    onTap: {
                                        selectedSeed = "adventurer-\(seed)"
                                    }
                                )
                            }
                            
                        case .funEmojis:
                            ForEach(emojiAvatars, id: \.self) { emoji in
                                EmojiAvatarOption(
                                    emoji: emoji,
                                    isSelected: selectedSeed == "emoji-\(emoji)",
                                    onTap: {
                                        selectedSeed = "emoji-\(emoji)"
                                    }
                                )
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Choose Avatar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Select") {
                        if let seed = selectedSeed {
                            // Parse the seed format: "style-seed" or "emoji-emoji"
                            let components = seed.split(separator: "-", maxSplits: 1)
                            if components.count == 2 {
                                let type = String(components[0])
                                let value = String(components[1])
                                
                                if type == "emoji" {
                                    onSelect("", value) // emoji goes in avatarFile
                                } else {
                                    // Use PNG format for iOS compatibility
                                    let url = "https://api.dicebear.com/7.x/\(type)/png?seed=\(value)&size=200"
                                    onSelect(url, value)
                                }
                            }
                        }
                        dismiss()
                    }
                    .disabled(selectedSeed == nil)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

struct DiceBearAvatarOption: View {
    let seed: String
    let style: String
    let isSelected: Bool
    let onTap: () -> Void
    
    private var avatarUrl: String {
        "https://api.dicebear.com/7.x/\(style)/png?seed=\(seed)&size=140"
    }
    
    var body: some View {
        Button(action: onTap) {
            ZStack {
                // Avatar preview using AsyncImage
                AsyncImage(url: URL(string: avatarUrl)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 70, height: 70)
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .strokeBorder(Color.choreStarBackground, lineWidth: 2)
                            )
                    case .failure(_), .empty:
                        // Show subtle placeholder while loading
                        Circle()
                            .fill(Color.choreStarSecondary.opacity(0.2))
                            .frame(width: 70, height: 70)
                            .overlay(
                                Circle()
                                    .strokeBorder(Color.choreStarBackground, lineWidth: 2)
                            )
                    @unknown default:
                        EmptyView()
                    }
                }
                
                if isSelected {
                    Circle()
                        .strokeBorder(Color.choreStarPrimary, lineWidth: 4)
                        .frame(width: 76, height: 76)
                    
                    Circle()
                        .fill(Color.choreStarPrimary.opacity(0.2))
                        .frame(width: 70, height: 70)
                }
            }
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct EmojiAvatarOption: View {
    let emoji: String
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.choreStarSecondary.opacity(0.3), Color.choreStarPrimary.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 70, height: 70)
                
                Text(emoji)
                    .font(.system(size: 40))
                
                if isSelected {
                    Circle()
                        .strokeBorder(Color.choreStarPrimary, lineWidth: 4)
                        .frame(width: 76, height: 76)
                }
            }
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    AvatarPickerView { url, file in
        print("Selected: \(url), \(file)")
    }
}

