#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_DIR="$ROOT_DIR/.runtime/node-v22.22.3-darwin-arm64"

export PATH="$NODE_DIR/bin:$PATH"

cd "$ROOT_DIR"
npm run dev

