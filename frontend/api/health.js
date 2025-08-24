// Health check endpoint for monitoring API status
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    const envCheck = {
      stripe: {
        configured: !!process.env.STRIPE_SECRET_KEY,
        status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing'
      },
      email: {
        service: process.env.EMAIL_SERVICE || 'not_set',
        user: process.env.EMAIL_USER ? 'configured' : 'missing',
        pass: process.env.EMAIL_PASS ? 'configured' : 'missing',
        admin: process.env.ADMIN_EMAIL || 'not_set'
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
      const Stripe = require('stripe');
      dependencies.stripe = 'available';
    } catch (error) {
      dependencies.stripe = 'missing';
    }

    try {
      const nodemailer = require('nodemailer');
      dependencies.nodemailer = 'available';
    } catch (error) {
      dependencies.nodemailer = 'missing';
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
    const hasCriticalIssues = !envCheck.stripe.configured || 
                             !envCheck.email.user || 
                             !envCheck.email.pass;

    if (hasCriticalIssues) {
      healthStatus.status = 'degraded';
      healthStatus.warnings = [];
      
      if (!envCheck.stripe.configured) {
        healthStatus.warnings.push('Stripe not configured - payments will fail');
      }
      if (!envCheck.email.user || !envCheck.email.pass) {
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
