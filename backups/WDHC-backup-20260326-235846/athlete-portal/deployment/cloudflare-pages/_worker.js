// Cloudflare Pages Worker
// Handles routing and API proxy for WDHC Athlete Portal

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // API Proxy - Forward to Google Apps Script
        if (url.pathname.startsWith('/api/')) {
            return handleApiProxy(request);
        }
        
        // Static file serving
        return handleStaticRequest(request);
    }
};

async function handleApiProxy(request) {
    const url = new URL(request.url);
    const apiUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
    
    // Remove /api prefix and add to Google Apps Script URL
    const path = url.pathname.replace('/api', '');
    const targetUrl = `${apiUrl}${path}${url.search}`;
    
    // Forward the request
    const headers = new Headers(request.headers);
    
    // Remove Origin header to avoid CORS issues
    headers.delete('Origin');
    
    // Add CORS headers to response
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
    };
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }
    
    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
        });
        
        // Create response with CORS headers
        const responseHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
            responseHeaders.set(key, value);
        });
        
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
        
    } catch (error) {
        console.error('API proxy error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'API proxy error',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}

async function handleStaticRequest(request) {
    const url = new URL(request.url);
    
    // Default to index.html for SPA routing
    if (!url.pathname.includes('.') && url.pathname !== '/') {
        return new Response(null, {
            status: 302,
            headers: {
                'Location': '/'
            }
        });
    }
    
    // Let Pages handle static assets
    return env.ASSETS.fetch(request);
}