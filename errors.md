
2s
Run cd backend

> twa-cf-tpl-backend@1.0.0 test
> vitest --run

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

 RUN  v2.1.9 /home/runner/work/template-twa-cf/template-twa-cf/backend

stdout | tests/contract/hello.test.ts > GET /api/hello > should return Hello World message
<-- GET /api/hello
--> GET /api/hello 200 5ms

stdout | tests/contract/hello.test.ts > GET /api/hello > should return valid timestamp
<-- GET /api/hello
--> GET /api/hello 200 1ms

stdout | tests/contract/hello.test.ts > GET /api/hello > should include correct environment information
<-- GET /api/hello
--> GET /api/hello 200 1ms

stdout | tests/contract/hello.test.ts > GET /api/hello > should handle CORS preflight requests
<-- OPTIONS /api/hello
--> OPTIONS /api/hello 204 1ms

stdout | tests/contract/hello.test.ts > GET /api/hello > should respond with proper cache headers for development
<-- GET /api/hello
--> GET /api/hello 200 1ms

stdout | tests/contract/health.test.ts > GET /health > should return service health status
<-- GET /health
--> GET /health 200 5ms

stdout | tests/contract/health.test.ts > GET /health > should return valid timestamp format
<-- GET /health
--> GET /health 200 0ms

stdout | tests/contract/health.test.ts > GET /health > should return environment from configuration
<-- GET /health
--> GET /health 200 1ms

stdout | tests/contract/health.test.ts > GET /health > should respond quickly (performance test)
<-- GET /health
--> GET /health 200 1ms
Run cd backend

> twa-cf-tpl-backend@1.0.0 test
> vitest --run

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

 RUN  v2.1.9 /home/runner/work/template-twa-cf/template-twa-cf/backend

stdout | tests/contract/hello.test.ts > GET /api/hello > should return Hello World message
<-- GET /api/hello
--> GET /api/hello 200 5ms

stdout | tests/contract/hello.test.ts > GET /api/hello > should return valid timestamp
<-- GET /api/hello
--> GET /api/hello 200 1ms

stdout | tests/contract/hello.test.ts > GET /api/hello > should include correct environment information
<-- GET /api/hello
--> GET /api/hello 200 1ms

stdout | tests/contract/hello.test.ts > GET /api/hello > should handle CORS preflight requests
<-- OPTIONS /api/hello
--> OPTIONS /api/hello 204 1ms

stdout | tests/contract/hello.test.ts > GET /api/hello > should respond with proper cache headers for development
<-- GET /api/hello
--> GET /api/hello 200 1ms

stdout | tests/contract/health.test.ts > GET /health > should return service health status
<-- GET /health
--> GET /health 200 5ms

stdout | tests/contract/health.test.ts > GET /health > should return valid timestamp format
<-- GET /health
--> GET /health 200 0ms

stdout | tests/contract/health.test.ts > GET /health > should return environment from configuration
<-- GET /health
--> GET /health 200 1ms

stdout | tests/contract/health.test.ts > GET /health > should respond quickly (performance test)
<-- GET /health
--> GET /health 200 1ms
