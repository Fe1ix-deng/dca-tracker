#!/bin/bash
# 快速推送脚本 - 在本地 macOS 终端运行
# 使用方法：chmod +x QUICK_PUSH.sh && ./QUICK_PUSH.sh

set -e

echo "🚀 DCA Tracker SEO 优化 - 快速推送"
echo "===================================="
echo ""

cd "$(dirname "$0")"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：未找到 package.json，请确保在项目根目录"
    exit 1
fi

echo "📍 当前目录：$(pwd)"
echo ""

# 检查 git 状态
echo "📊 检查 Git 状态..."
git status --short
echo ""

# 添加文件
echo "📦 添加 SEO 优化文件..."
git add -A
echo "✓ 文件已添加"
echo ""

# 显示将要提交的内容
echo "📝 将要提交的更改："
git diff --cached --stat
echo ""

# 创建提交
echo "💾 创建提交..."
git commit -m "feat: add comprehensive SEO optimization

- Add complete meta tags (title, description, keywords, OG tags)
- Add Open Graph preview image (1200x630 PNG)
- Create robots.txt for search engine crawlers
- Create sitemap.xml for better indexing
- Update package.json with keywords and metadata
- Add SEO promotion guide with 30-day action plan
- Add OG image generator tool for future updates
- Preserve Google Search Console verification meta tag" || {
    echo "⚠️  提交失败或无更改"
    echo "检查是否已经提交过这些更改"
    exit 0
}

echo "✓ 提交成功"
echo ""

# 推送
echo "🚀 推送到 GitHub main 分支..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "📋 下一步验证："
    echo "  1. 等待 Vercel 自动部署（约 1-2 分钟）"
    echo "  2. 验证文件："
    echo "     • https://dca.020023.xyz/og-image.png"
    echo "     • https://dca.020023.xyz/robots.txt"
    echo "     • https://dca.020023.xyz/sitemap.xml"
    echo ""
    echo "  3. 测试社交媒体预览："
    echo "     • Facebook: https://developers.facebook.com/tools/debug/"
    echo "     • Twitter: https://cards-dev.twitter.com/validator"
    echo ""
    echo "  4. 在 Google Search Console 提交 sitemap："
    echo "     • https://search.google.com/search-console"
    echo ""
    echo "📖 详细说明："
    echo "  • SEO_CHANGES_SUMMARY.md - 本次优化总结"
    echo "  • SEO_PROMOTION_GUIDE.md - 完整推广指南"
    echo ""
    echo "🎉 SEO 优化部署完成！"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "可能的原因："
    echo "  1. 网络连接问题"
    echo "  2. 需要 GitHub 认证（使用 gh auth login）"
    echo "  3. 权限问题"
    echo ""
    echo "请手动运行："
    echo "  git push origin main"
    exit 1
fi
