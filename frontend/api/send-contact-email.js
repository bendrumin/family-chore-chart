import nodemailer from 'nodemailer';

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

    // For now, we'll log the email content since we need to set up email credentials
    console.log('Email notification would be sent to bsiegel13@gmail.com:');
    console.log(emailContent);

    // TODO: Set up Zoho Mail credentials
    // You'll need to add these environment variables to your Vercel project:
    // ZOHO_HOST=smtp.zoho.com
    // ZOHO_PORT=587
    // ZOHO_USER=your-zoho-email@yourdomain.com
    // ZOHO_PASS=your-zoho-app-password
    // ADMIN_EMAIL=bsiegel13@gmail.com

    // Example with Zoho Mail:
    /*
    const transporter = nodemailer.createTransporter({
      host: process.env.ZOHO_HOST || 'smtp.zoho.com',
      port: process.env.ZOHO_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.ZOHO_USER,
      to: process.env.ADMIN_EMAIL || 'bsiegel13@gmail.com',
      subject: `New Contact Form: ${subject}`,
      text: emailContent
    });
    */

    return res.status(200).json({ 
      success: true, 
      message: 'Email notification logged (configure Zoho Mail credentials to send actual emails)' 
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ error: 'Failed to send email notification' });
  }
} 