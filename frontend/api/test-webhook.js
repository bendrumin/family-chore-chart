// Test endpoint to debug webhook body parsing
export const config = {
    api: {
        bodyParser: false,
    },
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get raw body
        const rawBody = await getRawBody(req);
        
        // Get parsed body
        const parsedBody = req.body;
        
        // Get headers
        const headers = req.headers;
        
        const debug = {
            method: req.method,
            headers: {
                'content-type': headers['content-type'],
                'stripe-signature': headers['stripe-signature'] ? 'present' : 'missing',
                'content-length': headers['content-length']
            },
            rawBody: {
                type: typeof rawBody,
                isBuffer: Buffer.isBuffer(rawBody),
                length: rawBody.length,
                firstChars: rawBody.toString('utf8').substring(0, 100)
            },
            parsedBody: {
                type: typeof parsedBody,
                isObject: typeof parsedBody === 'object',
                keys: parsedBody ? Object.keys(parsedBody) : null
            },
            hasRawBody: !!req.rawBody,
            readable: req.readable
        };

        res.status(200).json(debug);
    } catch (error) {
        res.status(500).json({ 
            error: 'Test failed', 
            details: error.message 
        });
    }
}

// Same function as in stripe-webhook.js
async function getRawBody(req) {
    // Vercel may provide rawBody
    if (req.rawBody) {
        return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
    }

    // If body parser has already consumed the stream, we need to reconstruct from req.body
    if (req.body && !req.readable) {
        const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        return Buffer.from(bodyString, 'utf8');
    }

    // Read from the request stream
    return await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}
