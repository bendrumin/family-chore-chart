// Local API endpoint for testing contact form
// This simulates the Vercel serverless function locally

class LocalAPI {
    constructor() {
        this.baseURL = 'http://localhost:3000';
    }

    async sendContactEmail(data) {
        try {
            // Simulate the email sending process locally
            console.log('📧 Local Contact Form Submission:', {
                to: 'support@chorestar.app',
                from: data.email,
                subject: `[Contact Form] ${data.subject}`,
                text: `
Name: ${data.name}
Email: ${data.email}
Subject: ${data.subject}
Message: ${data.message}
Family: ${data.family_name || 'Unknown'}
User ID: ${data.user_id || 'Anonymous'}
Timestamp: ${new Date().toISOString()}
                `.trim()
            });

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Return success response
            return {
                success: true,
                message: 'Contact form submitted successfully (LOCAL TEST)',
                messageId: `local-${Date.now()}`
            };

        } catch (error) {
            console.error('Local email error:', error);
            return {
                success: false,
                error: 'Failed to send contact form email (LOCAL TEST)',
                details: error.message
            };
        }
    }
}

// Create global instance for local testing
window.localAPI = new LocalAPI(); 