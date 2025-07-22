// Vercel serverless function to send contact form emails via Zoho SMTP
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, subject, message, family_name, user_id } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Zoho SMTP transporter
    const transporter = nodemailer.createTransporter({
      host: 'smtp.zoho.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.ZOHO_EMAIL || 'support@chorestar.app',
        pass: process.env.ZOHO_PASSWORD
      }
    });

    // Email content
    const emailSubject = `[Contact Form] ${subject}`;
    const emailText = `
Name: ${name}
Email: ${email}
Subject: ${subject}
Message: ${message}
Family: ${family_name || 'Unknown'}
User ID: ${user_id || 'Anonymous'}
Timestamp: ${new Date().toISOString()}
    `.trim();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
          📧 New Contact Form Submission
        </h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Contact Details</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Family:</strong> ${family_name || 'Unknown'}</p>
          <p><strong>User ID:</strong> ${user_id || 'Anonymous'}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #333;">Message</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 8px; font-size: 12px; color: #666;">
          <p style="margin: 0;">
            <strong>From:</strong> ChoreStar Contact Form<br>
            <strong>Sent:</strong> ${new Date().toLocaleString()}<br>
            <strong>URL:</strong> ${req.headers.referer || 'Unknown'}
          </p>
        </div>
      </div>
    `;

    // Send email
    const mailOptions = {
      from: process.env.ZOHO_EMAIL || 'support@chorestar.app',
      to: 'support@chorestar.app',
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      replyTo: email // So you can reply directly to the user
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    return res.status(200).json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Contact email error:', error);
    return res.status(500).json({ 
      error: 'Failed to send contact form email',
      details: error.message
    });
  }
} 