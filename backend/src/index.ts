import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import { handleWebhook } from './webhook'
import { healthHandler } from './api/health'
import { authHandler } from './api/auth'
import { getAllPosts, getUserPosts, createPost, updatePost, deletePost, uploadPostImages, deletePostImage } from './api/posts'
import type { Env } from './types/env'

const app = new Hono<{ Bindings: Env }>()


// Simple middleware
app.use('*', prettyJSON())

// API endpoints
app.get('/api/health', healthHandler)
app.post('/webhook', handleWebhook)

// Authentication endpoints
app.get('/api/auth', authHandler)
app.post('/api/auth', authHandler)

// Post endpoints
app.get('/api/posts', getAllPosts)
app.get('/api/posts/user/:userId', getUserPosts)
app.post('/api/posts', createPost)
app.put('/api/posts/:postId', updatePost)
app.delete('/api/posts/:postId', deletePost)

// Image endpoints
app.post('/api/posts/:postId/images', uploadPostImages)
app.delete('/api/posts/:postId/images/:imageId', deletePostImage)


app.get('/', async (c) => {
  const env = c.env.ENVIRONMENT || 'local'

  let kvStatus = 'unknown'
  try {
    const kv = c.env.SESSIONS
    if (kv) {
      await kv.get('ping')
      kvStatus = 'healthy'
    } else {
      kvStatus = 'unavailable'
    }
  } catch {
    kvStatus = 'error'
  }

  return c.json({
    message: 'Telegram Web App + Bot Template',
    environment: env,
    timestamp: new Date().toISOString(),
    services: { kv: kvStatus },
    endpoints: {
      health: '/api/health',
      webhook: '/webhook',
      auth: '/api/auth',
      posts: '/api/posts',
      userPosts: '/api/posts/user/:userId',
      updatePost: '/api/posts/:postId',
      deletePost: '/api/posts/:postId',
      uploadImages: '/api/posts/:postId/images',
      deleteImage: '/api/posts/:postId/images/:imageId',
    }
  })
})

app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    timestamp: new Date().toISOString()
  }, 404)
})

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong'
  }, 500);
})

export default app