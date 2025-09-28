export async function onRequest(context: {
  request: Request
  params: { path: string[] }
}): Promise<Response> {
  const { request, params } = context

  try {
    // Import Worker URL from functions config
    const { WORKER_URL } = await import('../config')
    const workerUrl = WORKER_URL

    // Reconstruct the full path from the catch-all parameter
    const fullPath = params.path.join('/')

    // Get URL and query parameters from original request
    const url = new URL(request.url)
    const targetUrl = new URL(`${workerUrl}/api/${fullPath}${url.search}`)

    // Clone the original request to ensure the body can be read multiple times if needed
    const clonedRequest = request.clone();

    // Create a new request to forward to the worker, using the cloned request's body
    const forwardedRequest = new Request(targetUrl.toString(), {
      method: clonedRequest.method,
      headers: clonedRequest.headers,
      body: clonedRequest.body,
      redirect: 'follow'
    })

    // No authentication needed - direct proxy to public Worker endpoints

    // Forward request to worker
    const response = await fetch(forwardedRequest)

    // Clone response to avoid body being consumed
    const clonedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })

    // Enhanced CORS and security headers
    const { CORS_ORIGINS } = await import('../config')
    const allowedOrigins = CORS_ORIGINS

    const origin = request.headers.get('Origin')
    if (origin && allowedOrigins.some(allowed => origin.includes(allowed))) {
      clonedResponse.headers.set('Access-Control-Allow-Origin', origin)
    } else {
      clonedResponse.headers.set('Access-Control-Allow-Origin', allowedOrigins[0])
    }

    clonedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    clonedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    clonedResponse.headers.set('Access-Control-Allow-Credentials', 'true')

    // Add Content Security Policy
    clonedResponse.headers.set('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://telegram.org; " +
      "connect-src 'self' https://twa-cf-tpl-prod.workers.dev https://api.telegram.org; " +
      "img-src 'self' data: https:; " +
      "style-src 'self' 'unsafe-inline';"
    )

    return clonedResponse

  } catch (error) {
    console.error('Proxy error:', error)
    const { CORS_ORIGINS } = await import('../config')
    return new Response('Internal proxy error', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': CORS_ORIGINS[0],
        'Content-Type': 'text/plain'
      }
    })
  }
}

// Handle OPTIONS requests for CORS preflight
export async function onRequestOptions(context: { request: Request }): Promise<Response> {
  const { request } = context

  const { CORS_ORIGINS } = await import('../config')
  const allowedOrigins = CORS_ORIGINS

  const origin = request.headers.get('Origin')
  const allowOrigin = (origin && allowedOrigins.some(allowed => origin.includes(allowed)))
    ? origin
    : allowedOrigins[0]

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}