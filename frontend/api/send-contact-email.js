// Contact form email API endpoint
let nodemailer;

// Initialize nodemailer only if available
try {
    nodemailer = require('nodemailer');
} catch (error) {
    console.warn('Nodemailer not available:', error.message);
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

    // Check if nodemailer is available
    if (!nodemailer) {
      console.log('Email notification would be sent to admin:');
      console.log(emailContent);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Email notification logged (nodemailer dependency not available)',
        debug: {
          nodemailerAvailable: false,
          message: 'Dependency not loaded'
        }
      });
    }

    // Check if email credentials are configured
    const emailService = process.env.EMAIL_SERVICE;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || 'bsiegel13@gmail.com';

    console.log('Email configuration check:');
    console.log('- EMAIL_SERVICE:', emailService ? 'SET' : 'NOT SET');
    console.log('- EMAIL_USER:', emailUser ? 'SET' : 'NOT SET');
    console.log('- EMAIL_PASS:', emailPass ? 'SET' : 'NOT SET');
    console.log('- ADMIN_EMAIL:', adminEmail);

    if (!emailService || !emailUser || !emailPass) {
      // Log the email content for now
      console.log('Email notification would be sent to', adminEmail + ':');
      console.log(emailContent);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Email notification logged (configure Gmail credentials to send actual emails)',
        debug: {
          emailService: emailService ? 'SET' : 'NOT SET',
          emailUser: emailUser ? 'SET' : 'NOT SET',
          emailPass: emailPass ? 'SET' : 'NOT SET',
          adminEmail
        }
      });
    }

    // Create transporter based on email service
    let transporter;
    
    try {
      if (emailService === 'gmail') {
        console.log('Creating Gmail transporter...');
        console.log('Using email user:', emailUser);
        console.log('Email pass configured:', emailPass ? 'YES' : 'NO');
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass
          }
        });
      } else {
        // Fallback to Zoho Mail if configured
        console.log('Creating Zoho transporter...');
        transporter = nodemailer.createTransport({
          host: process.env.ZOHO_HOST || 'smtp.zoho.com',
          port: process.env.ZOHO_PORT || 587,
          secure: false,
          auth: {
            user: process.env.ZOHO_USER || emailUser,
            pass: process.env.ZOHO_PASS || emailPass
          }
        });
      }

      console.log('Sending email to:', adminEmail);
      
      // Send the email
      const result = await transporter.sendMail({
        from: emailUser,
        to: adminEmail,
        subject: `📧 ChoreStar Contact: ${subject} - From ${name}`,
        text: emailContent,
        html: htmlEmailContent
      });

      console.log('Email sent successfully:', result.messageId);

      return res.status(200).json({ 
        success: true, 
        message: 'Email notification sent successfully',
        messageId: result.messageId
      });

    } catch (transporterError) {
      console.error('Transporter creation or email sending error:', transporterError);
      return res.status(500).json({ 
        error: 'Failed to send email notification',
        details: transporterError.message,
        fallback: 'Email content logged to console'
      });
    }

  } catch (error) {
    console.error('Contact form processing error:', error);
    return res.status(500).json({ 
      error: 'Failed to process contact form',
      details: error.message
    });
  }
} 