#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm ci
npm run lint:check
npx tsc --noEmit
npm run test
npm run test:integration
