#!/bin/bash
# deploy.sh — 一键部署网站到 GitHub Pages
# 用法：cd ~/.hermes/profiles/wuming/site && bash deploy.sh

set -euo pipefail

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_TREE="/tmp/wuming-site-deploy"
REPO_URL="https://github.com/aaroncloupor95/wuming-stock.git"

echo "🚀 部署无名网站到 GitHub Pages..."

# 检查是否在 git 仓库中
if [ ! -d .git ]; then
  echo "❌ 当前目录不是 git 仓库"
  echo "   请先运行: git init && git remote add origin <repo-url>"
  exit 1
fi

# 获取当前日期
TODAY=$(date +%Y-%m-%d)

# 确保所有文件已提交
git add -A
git diff --staged --quiet || git commit -m "Auto update: ${TODAY}"

# 推送到 GitHub
echo "📤 推送中..."
git push origin main 2>&1 || {
  echo "❌ 推送失败，检查 GitHub 认证"
  exit 1
}

echo "✅ 已部署！等待 30 秒后刷新 GitHub Pages..."

echo "🌐 访问: https://<username>.github.io/<repo-name>/"
