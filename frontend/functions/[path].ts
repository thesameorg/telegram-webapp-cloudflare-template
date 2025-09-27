export async function onRequest(context: {
  request: Request
  params: { path: string }
}): Promise<Response> {
  const { request, params } = context
  const path = params.path

  // Skip API routes (handled by api/ subfolder)
  if (path.startsWith('api/')) {
    return new Response('API endpoint not found', { status: 404 })
  }

  // Skip static assets and let them be handled by static file serving
  if (path.includes('.')) {
    // Let static files (including 404.html) be served by Pages
    return new Response(null, { status: 404 })
  }

  // Skip root path (let React app handle it)
  if (path === '') {
    return new Response('', { status: 404 })
  }

  // Redirect unknown routes to 404 page
  const url = new URL(request.url)
  const redirectUrl = new URL('/404.html', url.origin)
  return Response.redirect(redirectUrl.toString(), 302)
}