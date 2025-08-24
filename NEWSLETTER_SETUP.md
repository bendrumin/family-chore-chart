# 📧 ChoreStar Newsletter System Setup Guide

Congratulations! You now have a complete newsletter system for ChoreStar. Here's how to use it:

## 🎯 **What You Have:**

1. **Beautiful Newsletter Template** (`email-templates/newsletter-update.html`)
2. **Newsletter Sender Script** (`send-newsletter.js`)
3. **User Export Tool** (`export-users.js`)
4. **SendGrid Integration** (already working!)

## 🚀 **Step 1: Install Dependencies**

```bash
npm install @sendgrid/mail
```

## 🔑 **Step 2: Set Your SendGrid API Key**

```bash
export SENDGRID_API_KEY="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"
```

## 👥 **Step 3: Get Your User List**

### **Option A: Use the Export Script (Recommended)**

1. **Set your Supabase credentials:**
   ```bash
   export SUPABASE_URL="https://kyzgmhcismrnjlnddyyl.supabase.co"
   export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emdtaGNpc21ybmpsbmRkeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDUxOTMsImV4cCI6MjA2ODYyMTE5M30.WejJ7dZjVeHP4wN990woeld4GBqT8GAHB1HDvJjv_K4"
   ```

2. **Run the export script:**
   ```bash
   node export-users.js
   ```

3. **Copy the email list** that gets copied to your clipboard

### **Option B: Manual Export from Supabase**

1. Go to your Supabase dashboard
2. Navigate to **Table Editor** → **auth.users**
3. Filter by `email_confirmed_at IS NOT NULL`
4. Export the results
5. Copy the email addresses

## 📝 **Step 4: Update the Newsletter Script**

Edit `send-newsletter.js` and replace the `ACTIVE_USERS` array:

```javascript
const ACTIVE_USERS = [
    'user1@example.com',
    'user2@example.com',
    'user3@example.com',
    // ... add all your user emails
];
```

## 📤 **Step 5: Send Your Newsletter!**

```bash
node send-newsletter.js
```

## 🎨 **Customizing Your Newsletter**

### **Update the Template**

The newsletter template is in `email-templates/newsletter-update.html`. You can:

- **Change colors** - Update the CSS variables
- **Add your logo** - Replace the 🏠 emoji with your actual logo
- **Modify content** - Update the text and features
- **Add personalization** - Use variables like `{{userName}}`

### **Update the Subject Line**

In `send-newsletter.js`, change:

```javascript
subject: 'ChoreStar Just Got a Major Upgrade! 🚀'
```

### **Update the From Address**

Make sure `noreply@chorestar.app` is verified in SendGrid, or change it to your verified sender.

## 📊 **Tracking & Analytics**

The newsletter includes:

- **Open tracking** - See who opened your emails
- **Click tracking** - Track which links were clicked
- **SendGrid analytics** - View detailed reports in your SendGrid dashboard

## 🔄 **Sending Regular Newsletters**

### **Create a Newsletter Schedule**

1. **Weekly updates** - New features, bug fixes
2. **Monthly highlights** - User achievements, app improvements
3. **Seasonal content** - Holiday themes, special events

### **Automate with Cron Jobs**

```bash
# Send newsletter every Monday at 9 AM
0 9 * * 1 cd /path/to/chorestar && node send-newsletter.js
```

## 📱 **Mobile Optimization**

The newsletter template is already mobile-responsive and will look great on all devices!

## 🎯 **Best Practices**

### **Before Sending:**

1. **Test with yourself first** - Send to your own email
2. **Check all links** - Make sure they work
3. **Preview on mobile** - Test the responsive design
4. **Verify sender domain** - Ensure `noreply@chorestar.app` is verified

### **Content Tips:**

1. **Keep it personal** - Thank users for their support
2. **Highlight improvements** - Show what you've fixed
3. **Include CTAs** - Encourage users to try new features
4. **Show progress** - Let users know what's coming next

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"API Key Invalid"** - Check your SendGrid API key
2. **"Sender not verified"** - Verify your domain in SendGrid
3. **"Rate limit exceeded"** - SendGrid allows 100 emails/second
4. **"Template not found"** - Check the file path in the script

### **Get Help:**

- **SendGrid Support** - For email delivery issues
- **Check the health endpoint** - `/api/health` shows your email status
- **Review logs** - The script shows detailed error messages

## 🎉 **You're Ready!**

Your newsletter system is fully set up and ready to go! Here's what you can do now:

1. **Send your first newsletter** announcing all the improvements
2. **Keep users engaged** with regular updates
3. **Grow your community** by sharing progress and new features
4. **Get feedback** from users about what they'd like to see next

## 📈 **Next Steps Ideas:**

- **User spotlights** - Feature families using ChoreStar
- **Feature announcements** - Preview upcoming improvements
- **Tips & tricks** - Help users get the most out of ChoreStar
- **Community updates** - Share user feedback and suggestions

---

**Happy emailing! 🚀📧**

Your ChoreStar users are going to love hearing about all the improvements you've made!
