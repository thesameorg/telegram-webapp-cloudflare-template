function getAllowedOrigin(request: Request, corsOrigins: string[]): string {
  const origin = request.headers.get('Origin')
  return (origin && corsOrigins.some(allowed => origin.includes(allowed))) ? origin : corsOrigins[0]
}

function setCorsHeaders(response: Response, origin: string): void {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
}

export async function onRequest(context: {
  request: Request
  params: { path: string[] }
}): Promise<Response> {
  const { request, params } = context

  try {
    const { WORKER_URL, CORS_ORIGINS } = await import('../config')
    const url = new URL(request.url)
    const targetUrl = `${WORKER_URL}/api/${params.path.join('/')}${url.search}`

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    })

    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })

    setCorsHeaders(newResponse, getAllowedOrigin(request, CORS_ORIGINS))

    newResponse.headers.set('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://telegram.org; " +
      "connect-src 'self' https://twa-cf-tpl-prod.workers.dev https://api.telegram.org; " +
      "img-src 'self' data: https:; " +
      "style-src 'self' 'unsafe-inline';"
    )

    return newResponse

  } catch (error) {
    console.error('Proxy error:', error)
    const { CORS_ORIGINS } = await import('../config')
    const response = new Response('Internal proxy error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
    setCorsHeaders(response, CORS_ORIGINS[0])
    return response
  }
}

export async function onRequestOptions(context: { request: Request }): Promise<Response> {
  const { CORS_ORIGINS } = await import('../config')
  const response = new Response(null, {
    status: 204,
    headers: { 'Access-Control-Max-Age': '86400' }
  })
  setCorsHeaders(response, getAllowedOrigin(context.request, CORS_ORIGINS))
  return response
}