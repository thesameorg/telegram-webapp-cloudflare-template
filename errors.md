
Run cd frontend
  cd frontend
  # Capture deployment output to get actual URL
  deployment_output=$(npx wrangler pages deploy dist --project-name=twa-cf-tpl 2>&1)
  echo "Deployment output:"
  echo "$deployment_output"
  
  # Extract deployment URL if available
  if echo "$deployment_output" | grep -q "https://"; then
    deployment_url=$(echo "$deployment_output" | grep -o "https://[^[:space:]]*" | head -1)
    echo "deployment_url=$deployment_url" >> $GITHUB_OUTPUT
  else
    echo "deployment_url=https://twa-cf-tpl.pages.dev" >> $GITHUB_OUTPUT
  fi
  shell: /usr/bin/bash -e {0}
  env:
    NODE_VERSION: 20
    CLOUDFLARE_API_TOKEN: ***
    CLOUDFLARE_ACCOUNT_ID: ***
Error: Process completed with exit code 1.