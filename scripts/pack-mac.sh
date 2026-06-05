#!/usr/bin/env bash
# macOS 打包脚本（需在 Mac 上运行）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

ARCH="${1:-arm64}"
echo ">>> 打包 macOS (${ARCH}) ..."

npm run make -- --platform=darwin --arch="${ARCH}"

echo ""
echo ">>> 产物目录: ${ROOT}/out/make"
echo ""
echo "推荐分发 zip（用户解压后运行 WubiDictEditor.app）"
echo "若用户无法打开，告知执行:"
echo "  xattr -cr \"/path/to/WubiDictEditor.app\""
