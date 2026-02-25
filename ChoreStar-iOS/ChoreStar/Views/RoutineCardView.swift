import SwiftUI

struct RoutineCardView: View {
    let routine: Routine
    let child: Child?
    var showChild = true
    var onTap: (() -> Void)?
    
    private var routineColor: Color {
        Color.fromHex(routine.color)
    }
    
    var body: some View {
        Button(action: { onTap?() }) {
            VStack(spacing: 0) {
                HStack(spacing: 14) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(routineColor.opacity(0.15))
                            .frame(width: 52, height: 52)
                        
                        Image(systemName: routine.icon)
                            .font(.title2)
                            .foregroundColor(routineColor)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(routine.name)
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarTextPrimary)
                        
                        HStack(spacing: 8) {
                            Label(routine.typeDisplayName, systemImage: RoutineType(rawValue: routine.type)?.systemImage ?? "star.fill")
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                            
                            Text("·")
                                .foregroundColor(.choreStarTextSecondary)
                            
                            Text("\(routine.steps.count) steps")
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.caption)
                                .foregroundColor(.choreStarAccent)
                            Text(String(format: "$%.2f", Double(routine.rewardCents) / 100.0))
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarAccent)
                        }
                        
                        if showChild, let child = child {
                            Text(child.name)
                                .font(.caption2)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                    }
                }
                .padding(16)
                
                if !routine.steps.isEmpty {
                    Divider()
                        .padding(.horizontal, 16)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(Array(routine.steps.prefix(5).enumerated()), id: \.element.id) { index, step in
                                HStack(spacing: 4) {
                                    Text("\(index + 1)")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                        .frame(width: 18, height: 18)
                                        .background(routineColor)
                                        .clipShape(Circle())
                                    
                                    Text(step.title)
                                        .font(.caption)
                                        .foregroundColor(.choreStarTextSecondary)
                                        .lineLimit(1)
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(routineColor.opacity(0.08))
                                .cornerRadius(8)
                            }
                            
                            if routine.steps.count > 5 {
                                Text("+\(routine.steps.count - 5) more")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                                    .padding(.horizontal, 8)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                    }
                }
            }
            .background(Color.choreStarCardBackground)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(routineColor.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct KidRoutineCard: View {
    let routine: Routine
    var onStart: () -> Void
    
    private var routineColor: Color {
        Color.fromHex(routine.color)
    }
    
    var body: some View {
        Button(action: onStart) {
            VStack(spacing: 16) {
                HStack {
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(routineColor.opacity(0.15))
                            .frame(width: 60, height: 60)
                        
                        Image(systemName: routine.icon)
                            .font(.title)
                            .foregroundColor(routineColor)
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text(routine.name)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarTextPrimary)
                        
                        Text("\(routine.steps.count) steps · \(routine.typeDisplayName)")
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(routineColor)
                }
                
                HStack(spacing: 6) {
                    Image(systemName: "star.fill")
                        .foregroundColor(.choreStarAccent)
                    Text("Earn \(String(format: "$%.2f", Double(routine.rewardCents) / 100.0))")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.choreStarAccent)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.choreStarAccent.opacity(0.15))
                .cornerRadius(12)
            }
            .padding(20)
            .background(Color.choreStarCardBackground)
            .cornerRadius(20)
            .shadow(color: routineColor.opacity(0.15), radius: 12, x: 0, y: 4)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .strokeBorder(routineColor.opacity(0.3), lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(1.0)
    }
}

extension Color {
    static func fromHex(_ hex: String) -> Color {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var rgb: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&rgb)
        return Color(
            red: Double((rgb >> 16) & 0xFF) / 255.0,
            green: Double((rgb >> 8) & 0xFF) / 255.0,
            blue: Double(rgb & 0xFF) / 255.0
        )
    }
}

#Preview {
    VStack(spacing: 16) {
        RoutineCardView(
            routine: Routine(
                id: UUID(), childId: UUID(), name: "Morning Routine",
                type: "morning", icon: "sunrise.fill", color: "#f59e0b",
                rewardCents: 7, isActive: true, createdAt: Date(), updatedAt: Date(),
                steps: [
                    RoutineStep(id: UUID(), routineId: UUID(), title: "Brush Teeth", description: nil, icon: "mouth.fill", orderIndex: 0, durationSeconds: 120, createdAt: Date()),
                    RoutineStep(id: UUID(), routineId: UUID(), title: "Get Dressed", description: nil, icon: "tshirt.fill", orderIndex: 1, durationSeconds: nil, createdAt: Date()),
                ]
            ),
            child: nil,
            showChild: false
        )
    }
    .padding()
    .background(Color.choreStarBackground)
}
