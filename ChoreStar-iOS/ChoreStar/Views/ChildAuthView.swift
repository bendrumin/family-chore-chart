import SwiftUI

struct ChildAuthView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    @State private var selectedChild: Child?
    @State private var enteredPin: String = ""
    @State private var errorMessage: String?
    @State private var isAuthenticating = false
    
    private var childrenWithAccess: [Child] {
        manager.children.filter { $0.hasChildAccess }
    }
    
    var body: some View {
        ZStack {
            // Fun gradient background
            LinearGradient(
                colors: [
                    Color.choreStarSuccess.opacity(0.3),
                    Color.choreStarSecondary.opacity(0.3),
                    Color.choreStarPrimary.opacity(0.3)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 32) {
                Spacer()
                
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "figure.child")
                        .font(.system(size: 70))
                        .foregroundStyle(Color.choreStarGradient)
                        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                    
                    Text("Kids Login")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.choreStarTextPrimary)
                    
                    Text("Tap your name to continue")
                        .font(.headline)
                        .foregroundColor(.choreStarTextSecondary)
                }
                .padding(.bottom, 20)
                
                if selectedChild == nil {
                    // Child selection
                    ScrollView {
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 20) {
                            ForEach(childrenWithAccess) { child in
                                ChildSelectButton(child: child) {
                                    selectedChild = child
                                    errorMessage = nil
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                    }
                    .frame(maxHeight: 400)
                    
                    // Back to parent login
                    Button(action: {
                        dismiss()
                    }) {
                        HStack {
                            Image(systemName: "arrow.left.circle")
                            Text("Parent Login")
                        }
                        .font(.subheadline)
                        .foregroundColor(.choreStarPrimary)
                        .padding()
                    }
                } else {
                    // PIN entry for selected child
                    VStack(spacing: 24) {
                        // Selected child display
                        VStack(spacing: 12) {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.fromString(selectedChild!.avatarColor), Color.fromString(selectedChild!.avatarColor).opacity(0.7)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 80, height: 80)
                                .overlay(
                                    Text(selectedChild!.initials)
                                        .font(.largeTitle)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                )
                                .shadow(color: Color.fromString(selectedChild!.avatarColor).opacity(0.4), radius: 12, x: 0, y: 6)
                            
                            Text(selectedChild!.name)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarTextPrimary)
                        }
                        
                        // PIN pad
                        VStack(spacing: 16) {
                            Text("Enter Your PIN")
                                .font(.headline)
                                .foregroundColor(.choreStarTextSecondary)
                            
                            // PIN dots
                            HStack(spacing: 12) {
                                ForEach(0..<4) { index in
                                    Circle()
                                        .fill(index < enteredPin.count ? Color.choreStarPrimary : Color.choreStarBackground)
                                        .frame(width: 16, height: 16)
                                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: enteredPin.count)
                                }
                            }
                            .padding()
                            
                            // Number pad
                            VStack(spacing: 16) {
                                ForEach(0..<3) { row in
                                    HStack(spacing: 20) {
                                        ForEach(1..<4) { col in
                                            let number = row * 3 + col
                                            NumberButton(number: "\(number)") {
                                                addDigit("\(number)")
                                            }
                                        }
                                    }
                                }
                                
                                HStack(spacing: 20) {
                                    NumberButton(number: "", icon: "arrow.left.circle.fill") {
                                        selectedChild = nil
                                        enteredPin = ""
                                        errorMessage = nil
                                    }
                                    NumberButton(number: "0") {
                                        addDigit("0")
                                    }
                                    NumberButton(number: "", icon: "delete.left.fill") {
                                        if !enteredPin.isEmpty {
                                            enteredPin.removeLast()
                                            errorMessage = nil
                                        }
                                    }
                                }
                            }
                        }
                        .padding(24)
                        .background(Color.choreStarCardBackground)
                        .cornerRadius(24)
                        .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: 8)
                        .padding(.horizontal, 24)
                        
                        if let errorMessage = errorMessage {
                            Text(errorMessage)
                                .font(.subheadline)
                                .foregroundColor(.red)
                                .padding()
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(12)
                                .padding(.horizontal, 24)
                        }
                    }
                }
                
                Spacer()
            }
        }
    }
    
    private func addDigit(_ digit: String) {
        guard enteredPin.count < 4 else { return }
        
        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
        
        enteredPin += digit
        
        // Auto-submit when 4 digits entered
        if enteredPin.count == 4 {
            authenticateChild()
        }
    }
    
    private func authenticateChild() {
        guard let child = selectedChild else { return }
        
        isAuthenticating = true
        
        Task {
            do {
                let success = await manager.authenticateChild(childId: child.id, pin: enteredPin)
                
                await MainActor.run {
                    if !success {
                        errorMessage = "Incorrect PIN. Try again!"
                        enteredPin = ""
                        
                        let notification = UINotificationFeedbackGenerator()
                        notification.notificationOccurred(.error)
                    }
                    isAuthenticating = false
                }
            }
        }
    }
}

struct ChildSelectButton: View {
    let child: Child
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 70, height: 70)
                    .overlay(
                        Text(child.initials)
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    )
                    .shadow(color: Color.fromString(child.avatarColor).opacity(0.4), radius: 10, x: 0, y: 5)
                
                Text(child.name)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(20)
            .background(Color.choreStarCardBackground)
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct NumberButton: View {
    let number: String
    var icon: String?
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(Color.choreStarCardBackground)
                    .frame(width: 65, height: 65)
                    .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
                
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundColor(.choreStarPrimary)
                } else {
                    Text(number)
                        .font(.title)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextPrimary)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    ChildAuthView()
        .environmentObject(SupabaseManager.shared)
}

