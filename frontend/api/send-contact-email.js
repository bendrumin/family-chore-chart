// Contact form email API endpoint
let supabase;
let Resend;

// Initialize Resend for email sending
try {
    const resendModule = require('resend');
    Resend = resendModule.Resend;
} catch (error) {
    console.warn('Resend not available:', error.message);
}

try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
} catch (error) {
    console.warn('Supabase initialization error:', error.message);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, subject, message, submissionId } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // STEP 1: Save to Supabase first (this always works)
    let supabaseSuccess = false;
    if (supabase) {
      try {
        const { error } = await supabase
          .from('contact_submissions')
          .insert([{
            name,
            email,
            subject,
            message,
            status: 'new'
          }]);
        
        if (error) {
          console.error('Supabase insert error:', error);
        } else {
          supabaseSuccess = true;
        }
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
      }
    }

    // Create email content
    const emailContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}
Message: ${message}

Submission ID: ${submissionId}
Timestamp: ${new Date().toISOString()}

---
This message was sent from your ChoreStar contact form.
    `;

    // Create HTML email content
    const htmlEmailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .field { margin-bottom: 20px; }
        .field-label { font-weight: 600; color: #495057; margin-bottom: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .field-value { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; font-size: 16px; line-height: 1.5; }
        .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin-top: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 14px; }
        .badge { display: inline-block; background: #17a2b8; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .timestamp { color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 New Contact Form Submission</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">ChoreStar Contact Form</p>
        </div>
        
        <div class="content">
            <div class="field">
                <div class="field-label">👤 Contact Name</div>
                <div class="field-value">${name}</div>
            </div>
            
            <div class="field">
                <div class="field-label">📧 Email Address</div>
                <div class="field-value">
                    <a href="mailto:${email}" style="color: #667eea; text-decoration: none;">${email}</a>
                </div>
            </div>
            
            <div class="field">
                <div class="field-label">📝 Subject</div>
                <div class="field-value">${subject}</div>
            </div>
            
            <div class="field">
                <div class="field-label">💬 Message</div>
                <div class="message-box">
                    ${message.replace(/\n/g, '<br>')}
                </div>
            </div>
            
            <div style="margin-top: 25px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
                <div style="font-weight: 600; color: #1976d2; margin-bottom: 8px;">📋 Submission Details</div>
                <div style="font-size: 14px; color: #424242;">
                    <strong>Submission ID:</strong> <span class="badge">${submissionId}</span><br>
                    <strong>Timestamp:</strong> <span class="timestamp">${new Date().toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZoneName: 'short'
                    })}</span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>This message was sent from your ChoreStar contact form at <a href="https://chorestar.app" style="color: #667eea;">chorestar.app</a></p>
            <p style="margin-top: 10px; font-size: 12px; color: #9e9e9e;">
                💡 Quick Actions: 
                <a href="mailto:${email}?subject=Re: ${subject}" style="color: #667eea; text-decoration: none;">Reply to ${name}</a> | 
                <a href="https://chorestar.app" style="color: #667eea; text-decoration: none;">Visit Website</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;

    // STEP 2: Try to send email via Resend (optional - won't fail if it doesn't work)
    let emailSent = false;
    let emailError = null;
    
    const adminEmail = process.env.ADMIN_EMAIL || 'hi@chorestar.app';
    
    // Use Resend (easiest modern email service)
    if (Resend && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const result = await resend.emails.send({
          from: 'ChoreStar <noreply@chorestar.app>',
          to: adminEmail,
          reply_to: email,
          subject: `📧 ChoreStar Contact: ${subject} - From ${name}`,
          html: htmlEmailContent
        });
        
        emailSent = true;
        
      } catch (emailErr) {
        console.error('Email sending error:', emailErr.message);
        emailError = emailErr.message;
        // Continue anyway - we saved to Supabase
      }
    } else {
      emailError = !Resend ? 'Resend module not loaded' : 'RESEND_API_KEY not configured';
    }

    // FINAL RESPONSE: Success if Supabase worked, email is optional
    const response = {
      success: supabaseSuccess,
      savedToDatabase: supabaseSuccess,
      emailSent: emailSent,
      message: supabaseSuccess 
        ? 'Contact form submitted successfully! We\'ll review it in Supabase.' 
        : 'Contact form received but could not save to database.',
      details: {
        supabase: supabaseSuccess ? '✅ Saved' : '❌ Failed',
        email: emailSent ? '✅ Sent' : emailError ? `❌ ${emailError}` : '⚠️ Not configured'
      }
    };

    return res.status(supabaseSuccess ? 200 : 500).json(response);

  } catch (error) {
    console.error('❌ Contact form processing error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to process contact form',
      details: error.message
    });
  }
} 