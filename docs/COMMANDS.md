## 🛠️ Common Commands

### Development

```bash
npm run dev              # Start both backend (8787) and frontend (3000)
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run stop             # Kill all dev servers
```

### Testing & Quality

```bash
npm run test             # All tests (backend + frontend)
npm run test:backend     # Backend tests only
npm run test:frontend    # Frontend tests only
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run check            # typecheck + lint + test
npm run clean-check      # Clean install + build + check
```

### Database

```bash
npm run db:migrate:local           # Apply migrations locally
cd backend && npm run db:generate  # Generate migration from schema
cd backend && npm run db:studio    # Open Drizzle Studio
```

### Local Telegram Integration

```bash
npm run tunnel:start     # Start ngrok tunnel
npm run tunnel:status    # Check tunnel status
npm run tunnel:stop      # Stop tunnel
npm run webhook:set      # Set Telegram webhook to tunnel
npm run webhook:status   # Check webhook
npm run webhook:clear    # Clear webhook
```
