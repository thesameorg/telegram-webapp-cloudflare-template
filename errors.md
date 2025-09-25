Run cd backend
  cd backend
  npm run typecheck
  shell: /usr/bin/bash -e {0}
  env:
    NODE_VERSION: 20

> twa-cf-tpl-backend@1.0.0 typecheck
> tsc --noEmit

Error: src/index.ts(51,9): error TS18046: 'result' is of type 'unknown'.
Error: src/index.ts(57,55): error TS18046: 'error' is of type 'unknown'.
Error: src/webhook.ts(2,38): error TS2307: Cannot find module 'grammy' or its corresponding type declarations.
Error: src/webhook.ts(20,33): error TS7006: Parameter 'ctx' implicitly has an 'any' type.
Error: src/webhook.ts(39,30): error TS7006: Parameter 'ctx' implicitly has an 'any' type.
Error: Process completed