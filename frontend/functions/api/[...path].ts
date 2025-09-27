export async function onRequest(context: {
  request: Request
  params: { path: string[] }
}): Promise<Response> {
  const { request, params } = context

  try {
    // Worker URL is written during deployment
    const workerUrl = env.WORKER_URL

    // Reconstruct the full path from the catch-all parameter
    const fullPath = params.path.join('/')

    // Get URL and query parameters from original request
    const url = new URL(request.url)
    const targetUrl = new URL(`${workerUrl}/${fullPath}${url.search}`)

    // Clone the request to forward to worker
    const forwardedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
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
    const allowedOrigins = [
      'https://twa-cf-tpl.pages.dev', // Static Pages URL
      'https://t.me' // Telegram WebApp
    ]

    const origin = request.headers.get('Origin')
    if (allowedOrigins.some(allowed => origin?.includes(allowed))) {
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
    return new Response('Internal proxy error', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://twa-cf-tpl.pages.dev',
        'Content-Type': 'text/plain'
      }
    })
  }
}

// Handle OPTIONS requests for CORS preflight
export async function onRequestOptions(context: { request: Request }): Promise<Response> {
  const { request } = context

  const allowedOrigins = [
    'https://twa-cf-tpl.pages.dev', // Static Pages URL
    'https://t.me' // Telegram WebApp
  ]

  const origin = request.headers.get('Origin')
  const allowOrigin = allowedOrigins.some(allowed => origin?.includes(allowed))
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