interface Env {
  WORKER_URL: string
}

export async function onRequest(context: {
  request: Request
  env: Env
  params: { path: string[] }
}): Promise<Response> {
  const { request, env, params } = context

  try {
    // Get the dynamically set Worker URL from deployment
    const workerUrl = env.WORKER_URL
    if (!workerUrl) {
      return new Response('Worker URL not configured', { status: 500 })
    }

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

    // Add CORS headers for browser compatibility
    clonedResponse.headers.set('Access-Control-Allow-Origin', '*')
    clonedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    clonedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return clonedResponse

  } catch (error) {
    console.error('Proxy error:', error)
    return new Response('Internal proxy error', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain'
      }
    })
  }
}

// Handle OPTIONS requests for CORS preflight
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}