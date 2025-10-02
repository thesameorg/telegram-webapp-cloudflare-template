# prerequisites

- make sure you have installed software:
    - node (link to installation & check, v>=20)
    - wrangler
    - ngrok (install & register & auth manual)

- copy .env.example to .env
    


- install root, front, back
    - `npm install` - for root dependencies
    - `npm run install`  - for backend & frontend dependencies
    - `npm run check` - for lint, typechek & tests

- make local DB: `npm run db:migrate:local`


## local "clean" run 
- change `DEV_AUTH_BYPASS_ENABLED=true` in .env
- `npm run clean-check` - should be no errors
- `npm run dev`
    - go to http://localhost:3000 - it should load
    - go to **profile** section, there should be a "DEV Developer" user
    - try adding a post or changing user - it all should work!


## Local telegram + ngrok run
- setup ngrok tunnel: 
    - `npm run tunnel:start`
    - go to the URL you got like `https://1cd4689c783a.ngrok-free.app/`
- create a telegram bot with botfather
    - you will need bot token
    - setup menu button URL to this ngrok url
- get your own telegram_id:
    - ask bot @username_to_id_bot
    - set .env `TELEGRAM_ADMIN_ID=` to your digits of TG ID
- edit .env:
    - add bot token to `TELEGRAM_BOT_TOKEN`
    - set `DEV_AUTH_BYPASS_ENABLED=false`, so you will login with your account
- restart worker:
    - `npm run stop && npm run dev`

- open the bot, open app - et voila! 
- play around!

> [!] Warning! 
> Do not do too much requests, as ngrok's free limits are 120 per minute, not too much. just cooldown a minute




## Production deployment
- Go to Cloudflare dash and get:
    - API token for workers & pages
    - Account ID `wrangler whoami`
    - i recoment you add `CF_API_TOKEN` and `CF_ACCOUNT_ID` to .env file


- Create Cloudflare instaces (yes, all of them):
    - D1 Database:
    `wrangler d1 create <your-database-name>`
    - copy database_name and database_id to wrangler.toml
    - KV Namespace:
    `wrangler kv namespace create <your-kv-namespace-name>`
    - copy binding and id to wrangler.toml to kv section
    -  R2 Bucket:
    `wrangler r2 bucket create <bucket-name>
    - copy binding and bucket_name to wrangler.toml to R2 section
    - Enable R2 bucket public access:
        - go to cloudflare dashboard
        - R2 -> your new R2 instance -> Settings -> Public Development URL (for custom domain visit [[DOMAIN]])


- make another TG-bot for production
- go to github secrets & vars, and setup:
    - **SECRETS**:
        - `CLOUDFLARE_ACCOUNT_ID` - you can get it with `wrangler whoami`
        - `CLOUDFLARE_API_TOKEN` - !! **NEED URL to manual**
        - `TELEGRAM_ADMIN_ID` - your TG-ID
        - `TELEGRAM_BOT_TOKEN` - for production bot
    - **Variables**:
        - PAGES_URL:
            - set your project name in `wrangler.toml` (on 1st row)
            - `wrangler deploy` - will create a new deployment, use its URL
        - WORKER_URL:
            `wrangler pages project create <my-project>`
        - R2_URL:
            - from above
        - PAGES_PROJECT_NAME same as you used in WORKER_URL

- Create a new commit in copied repo & push
- watch it in github actions, gotta be green



## Custom domain

Congrats if you have one! 
1. Setup custom domain in coudflare worker
2. Setup custom domain in coudflare pages
3. Change Github envs to these new urls



- create telegram bot for local dev & test purposes
- get your telegram ID

