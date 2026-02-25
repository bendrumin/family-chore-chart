import SwiftUI

struct UpgradePromptView: View {
    @Environment(\.dismiss) var dismiss
    let limitType: LimitType
    let currentCount: Int
    let limit: Int
    
    enum LimitType {
        case children
        case chores
        
        var title: String {
            switch self {
            case .children: return "Child Limit Reached"
            case .chores: return "Chore Limit Reached"
            }
        }
        
        var icon: String {
            switch self {
            case .children: return "figure.2.and.child.holdinghands"
            case .chores: return "list.bullet.clipboard"
            }
        }
        
        var itemName: String {
            switch self {
            case .children: return "children"
            case .chores: return "chores"
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: limitType.icon)
                .font(.system(size: 60))
                .foregroundStyle(Color.choreStarGradient)
            
            VStack(spacing: 8) {
                Text(limitType.title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.choreStarTextPrimary)
                
                Text("You've reached the free plan limit of \(limit) \(limitType.itemName).")
                    .font(.body)
                    .foregroundColor(.choreStarTextSecondary)
                    .multilineTextAlignment(.center)
                
                Text("You currently have \(currentCount) \(limitType.itemName).")
                    .font(.subheadline)
                    .foregroundColor(.choreStarTextSecondary)
            }
            .padding(.horizontal, 32)
            
            VStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    upgradeFeature(icon: "infinity", text: "Unlimited \(limitType.itemName)")
                    upgradeFeature(icon: "paintbrush.fill", text: "Custom icons & categories")
                    upgradeFeature(icon: "chart.bar.fill", text: "Export reports")
                }
                .padding(20)
                .background(Color.choreStarPrimary.opacity(0.08))
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(Color.choreStarPrimary.opacity(0.2), lineWidth: 1)
                )
            }
            .padding(.horizontal, 32)
            
            Text("Upgrade to Premium on chorestar.app\nfor unlimited access.")
                .font(.subheadline)
                .foregroundColor(.choreStarPrimary)
                .multilineTextAlignment(.center)
                .fontWeight(.semibold)
            
            Spacer()
            
            Button(action: { dismiss() }) {
                Text("Got It")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.choreStarGradient)
                    .cornerRadius(14)
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 32)
        }
        .background(Color.choreStarBackground)
    }
    
    private func upgradeFeature(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(.choreStarPrimary)
                .frame(width: 24)
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.choreStarTextPrimary)
        }
    }
}

#Preview {
    UpgradePromptView(limitType: .children, currentCount: 3, limit: 3)
}
