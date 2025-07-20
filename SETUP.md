# Family Chore Chart - Setup Guide

This guide will walk you through setting up the Family Chore Chart application from scratch.

## Prerequisites

- Node.js 16+ (for development server)
- A Supabase account (free tier works great)
- Git (for version control)

## Step 1: Clone and Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd family-chore-chart
   ```

2. **Install dependencies** (optional, for development server)
   ```bash
   cd frontend
   npm install
   ```

## Step 2: Set up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `family-chore-chart`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

### 2.2 Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. You'll need these for the next step

### 2.3 Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `backend/supabase/schema.sql`
3. Paste it into the SQL editor
4. Click **Run** to execute the schema

This will create:
- All necessary tables (profiles, children, chores, etc.)
- Row Level Security policies
- Helper functions for progress calculations
- Indexes for performance

### 2.4 Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your site URL:
   - For development: `http://localhost:8000`
   - For production: `https://your-domain.com`
3. Add redirect URLs:
   - `http://localhost:8000`
   - `https://your-domain.com`
4. Save the settings

## Step 3: Configure the Application

### 3.1 Update Supabase Credentials

1. Open `frontend/supabase-config.js`
2. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_ACTUAL_SUPABASE_PROJECT_URL';
   const SUPABASE_ANON_KEY = 'YOUR_ACTUAL_SUPABASE_ANON_KEY';
   ```

### 3.2 Test the Setup

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   # or
   python -m http.server 8000
   ```

2. Open your browser to `http://localhost:8000`
3. You should see the Family Chore Chart login page
4. Create a new account to test the setup

## Step 4: Deployment (Optional)

### Option A: Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key

### Option B: Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Set build settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `frontend`
4. Set environment variables in Netlify dashboard

### Option C: Deploy with Docker

1. Build the Docker image:
   ```bash
   cd deployment/docker
   docker-compose up --build
   ```

2. Access the app at `http://localhost:8080`

## Step 5: Production Checklist

Before going live, ensure you have:

- [ ] Updated Supabase credentials in production
- [ ] Set up proper domain and SSL
- [ ] Configured email templates in Supabase
- [ ] Tested all features thoroughly
- [ ] Set up monitoring and error tracking
- [ ] Created backup strategy for your database

## Troubleshooting

### Common Issues

1. **"Configuration Required" toast appears**
   - Make sure you've updated the Supabase credentials in `supabase-config.js`

2. **Authentication errors**
   - Check that your Supabase project URL and anon key are correct
   - Verify that authentication is enabled in your Supabase project

3. **Database errors**
   - Ensure you've run the complete schema from `backend/supabase/schema.sql`
   - Check that Row Level Security is properly configured

4. **Real-time updates not working**
   - Verify that real-time is enabled in your Supabase project
   - Check browser console for WebSocket connection errors

### Getting Help

- Check the browser console for error messages
- Review the Supabase logs in your dashboard
- Ensure all environment variables are set correctly
- Verify that your Supabase project is active and not paused

## Development

### Local Development

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Make changes to the code
3. Refresh the browser to see changes
4. Use browser dev tools for debugging

### File Structure

```
family-chore-chart/
├── frontend/           # Main application files
│   ├── index.html     # Main HTML file
│   ├── style.css      # Styles
│   ├── script.js      # Main JavaScript
│   ├── api-client.js  # API wrapper
│   └── supabase-config.js # Supabase config
├── backend/           # Database schema
│   └── supabase/
│       └── schema.sql
└── deployment/        # Deployment configs
    ├── vercel.json
    ├── netlify.toml
    └── docker/
```

### Making Changes

- **HTML**: Edit `frontend/index.html`
- **CSS**: Edit `frontend/style.css`
- **JavaScript**: Edit `frontend/script.js` or `frontend/api-client.js`
- **Database**: Edit `backend/supabase/schema.sql` and re-run in Supabase

## Security Considerations

1. **Environment Variables**: Never commit real Supabase credentials to version control
2. **Row Level Security**: The schema includes RLS policies to protect user data
3. **CORS**: Configure allowed origins in your Supabase project
4. **Rate Limiting**: Consider implementing rate limiting for production
5. **HTTPS**: Always use HTTPS in production

## Performance Tips

1. **Database Indexes**: The schema includes optimized indexes
2. **Caching**: Consider implementing client-side caching for frequently accessed data
3. **Compression**: Enable gzip compression on your web server
4. **CDN**: Use a CDN for static assets in production
5. **Monitoring**: Set up performance monitoring for production deployments

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the browser console for errors
3. Check the Supabase dashboard for database issues
4. Create an issue in the project repository

Happy coding! 🏠✨ 