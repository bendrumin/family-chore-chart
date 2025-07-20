# Family Chore Chart Application

A modern, kid-friendly web application that helps parents manage their children's chores and track rewards. Built with vanilla HTML/CSS/JavaScript and Supabase for the backend.

## Features

- **Family Management**: Create family accounts and manage multiple children
- **Chore Tracking**: 7-day grid layout for tracking daily chore completion
- **Reward System**: Daily rewards (7¢) and weekly bonuses (+1¢) for 100% completion
- **Real-time Updates**: Live progress tracking and earnings calculations
- **Kid-Friendly Design**: Bright colors, large buttons, emoji icons, and smooth animations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Deployment**: Vercel/Netlify ready
- **Styling**: Modern CSS with custom properties and glass morphism

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd family-chore-chart
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Run the database schema from `backend/supabase/schema.sql`
   - Configure authentication settings
   - Update `frontend/supabase-config.js` with your project credentials

3. **Start the application**
   ```bash
   cd frontend
   # Serve with any static file server
   python -m http.server 8000
   # or
   npx serve .
   ```

4. **Open in browser**
   - Navigate to `http://localhost:8000`
   - Register a new family account
   - Add children and start tracking chores!

## Project Structure

```
family-chore-chart/
├── README.md                 # This file
├── .gitignore               # Git ignore rules
├── frontend/                # Frontend application
│   ├── index.html          # Main HTML file
│   ├── style.css           # Main stylesheet
│   ├── script.js           # Main JavaScript
│   ├── supabase-config.js  # Supabase configuration
│   ├── api-client.js       # API wrapper
│   └── components/         # Reusable components
├── backend/                # Backend configuration
│   └── supabase/          # Database schema and functions
└── deployment/             # Deployment configurations
```

## Features in Detail

### Authentication
- Secure family account registration
- Email/password login with Supabase Auth
- Password reset functionality
- User profile management

### Child Management
- Add multiple children per family
- Customize child name, age, and avatar color
- Age-appropriate chore suggestions

### Chore System
- Create custom chores for each child
- Set reward amounts (in cents)
- 7-day completion tracking grid
- Visual completion status with checkmarks
- Bulk operations (reset week, etc.)

### Progress Tracking
- Real-time progress bars
- Star ratings based on completion percentage
- Daily reward calculations
- Weekly bonus system
- Total earnings tracking

### User Interface
- Modern gradient backgrounds
- Glass morphism effects
- Smooth animations and transitions
- Kid-friendly color palette
- Responsive design for all devices

## Database Schema

The application uses the following Supabase tables:

- `profiles`: User family information
- `children`: Child records with names and colors
- `chores`: Individual chores with reward amounts
- `chore_completions`: Daily completion tracking
- `family_settings`: Configurable reward amounts

## Deployment

The application is ready for deployment on:
- **Vercel**: Use the included `vercel.json`
- **Netlify**: Use the included `netlify.toml`
- **Any static hosting**: The frontend is completely static

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or support, please open an issue on GitHub. 