// Health check endpoint for monitoring API status
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    const envCheck = {
      paypal: {
        configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
        status: (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) ? 'configured' : 'missing'
      },
      email: {
        service: process.env.EMAIL_SERVICE || 'not_set',
        user: process.env.EMAIL_USER ? 'configured' : 'missing',
        pass: process.env.EMAIL_PASS ? 'configured' : 'missing',
        admin: process.env.ADMIN_EMAIL || 'not_set',
        resend: process.env.RESEND_API_KEY ? 'configured' : 'missing'
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    // Check dependencies
    let dependencies = {};
    try {
      const { PayPalApi } = require('@paypal/paypal-server-sdk');
      dependencies.paypal = 'available';
    } catch (error) {
      dependencies.paypal = 'missing';
    }

    try {
      const nodemailer = require('nodemailer');
      dependencies.nodemailer = 'available';
    } catch (error) {
      dependencies.nodemailer = 'missing';
    }

    try {
      const { Resend } = require('resend');
      dependencies.resend = 'available';
    } catch (error) {
      dependencies.resend = 'missing';
    }

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      dependencies,
      environment_variables: envCheck,
      endpoints: {
        health: '/api/health',
        payment: '/api/create-checkout-session',
        contact: '/api/send-contact-email'
      }
    };

    // Determine overall health status
    const hasCriticalIssues = !envCheck.paypal.configured || 
                             (!envCheck.email.resend && !envCheck.email.user || !envCheck.email.pass);

    if (hasCriticalIssues) {
      healthStatus.status = 'degraded';
      healthStatus.warnings = [];
      
      if (!envCheck.paypal.configured) {
        healthStatus.warnings.push('PayPal not configured - payments will fail');
      }
      if (!envCheck.email.resend && (!envCheck.email.user || !envCheck.email.pass)) {
        healthStatus.warnings.push('Email not configured - contact form emails will not be sent');
      }
    }

    res.status(200).json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
