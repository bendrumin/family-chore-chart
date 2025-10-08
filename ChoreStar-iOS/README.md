# ChoreStar iOS App

Native iOS application for ChoreStar built with SwiftUI.

## 🚀 Setup

### Prerequisites
- Xcode 15.0 or later
- iOS 17.0+ deployment target
- Swift 5.9+

### Configuration

1. **Copy the Info.plist template:**
   ```bash
   cd ChoreStar-iOS/ChoreStar
   cp Info.plist.template Info.plist
   ```

2. **Add your Supabase credentials to `Info.plist`:**
   - Replace `YOUR_SUPABASE_URL_HERE` with your Supabase project URL
   - Replace `YOUR_SUPABASE_ANON_KEY_HERE` with your Supabase anon key
   
   You can find these values in `frontend/config.js` or your Supabase dashboard.

3. **Open the project in Xcode:**
   ```bash
   open ChoreStar.xcodeproj
   ```

4. **Wait for Swift Package dependencies to resolve** (Supabase SDK)

5. **Build and run** (Cmd+R)

## 📦 Dependencies

The project uses Swift Package Manager for dependencies:
- [Supabase Swift](https://github.com/supabase/supabase-swift) - Supabase client for iOS

## 🏗️ Project Structure

```
ChoreStar/
├── ChoreStarApp.swift          # App entry point
├── ContentView.swift            # Main routing view
├── Models/
│   └── Models.swift            # Data models (Child, Chore, etc.)
├── Managers/
│   └── SupabaseManager.swift  # Supabase integration & data management
├── Views/
│   ├── AuthView.swift          # Sign in screen
│   ├── DashboardView.swift     # Main dashboard with progress
│   ├── ChildrenView.swift      # Family members view
│   ├── ChoresView.swift        # Chores list with filters
│   └── SettingsView.swift      # Settings & debug panel
├── Theme/
│   └── Colors.swift            # App color scheme
├── Assets.xcassets/            # Images and icons
└── Info.plist                  # Configuration (not in git)
```

## 🎨 Features

- ✅ Beautiful SwiftUI interface matching web version
- ✅ Real-time Supabase integration
- ✅ User authentication with "Remember Me"
- ✅ Child and chore management
- ✅ Progress tracking with animations
- ✅ Earnings calculation
- ✅ Chore completion with persistence
- ✅ Dark mode support
- ✅ Debug panel for troubleshooting

## 🔒 Security Notes

- `Info.plist` is gitignored to keep Supabase credentials private
- Always use `Info.plist.template` as the base for new setups
- Never commit actual Supabase credentials to version control

## 🐛 Debugging

The Settings tab includes a comprehensive debug panel showing:
- Supabase URL and key presence
- Current user ID
- Authentication status
- Data counts (children, chores)
- Last error messages

## 📝 TODO

- [ ] Child account PIN authentication
- [ ] Child-focused simplified UI
- [ ] Push notifications for chore reminders
- [ ] Offline support with local caching
- [ ] Family sharing / multi-parent accounts
- [ ] Custom app icon and splash screen

## 🤝 Contributing

This is part of the ChoreStar project. See main README for contribution guidelines.

