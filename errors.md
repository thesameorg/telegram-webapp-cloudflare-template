# BACKEND

Run cd backend
  cd backend
  echo "***" | npx wrangler secret put TELEGRAM_BOT_TOKEN
  shell: /usr/bin/bash -e {0}
  env:
    NODE_VERSION: 20
    CLOUDFLARE_API_TOKEN: ***
    CLOUDFLARE_ACCOUNT_ID: ***

 ⛅️ wrangler 4.39.0
───────────────────
▲ [WARNING] Multiple environments are defined in the Wrangler configuration file, but no target environment was specified for the secret put command.

  To avoid unintentional changes to the wrong environment, it is recommended to explicitly specify the target environment using the `-e|--env` flag.
  If your intention is to use the top-level environment of your configuration simply pass an empty string to the flag to target such environment. For example `--env=""`.


🌀 Creating the secret for the Worker "twa-cf-tpl" 

✘ [ERROR] A request to the Cloudflare API (/accounts/***/workers/scripts/twa-cf-tpl/secrets) failed.

  Binding name 'TELEGRAM_BOT_TOKEN' already in use. Please use a different name and try again. [code: 10053]
  
  If you think this is a bug, please open an issue at: https://github.com/cloudflare/workers-sdk/issues/new/choose


Error: Process completed with exit code 1.