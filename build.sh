#!/bin/bash

# FreeJumper 扩展打包脚本
# 用于创建 Chrome Web Store 发布包

VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
ZIP_NAME="freejumper-v${VERSION}.zip"

echo "🚀 开始打包 FreeJumper v${VERSION}..."

# 清理旧的打包文件
if [ -f "$ZIP_NAME" ]; then
    echo "删除旧的打包文件: $ZIP_NAME"
    rm "$ZIP_NAME"
fi

# 保存当前目录路径
ORIGINAL_DIR=$(pwd)

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "创建临时目录: $TEMP_DIR"

# 复制文件（排除不需要的文件）
echo "复制文件..."
rsync -av \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='.DS_Store' \
    --exclude='README.md' \
    --exclude='PUBLISHING.md' \
    --exclude='.zipignore' \
    --exclude='build.sh' \
    --exclude='icons/generate-icons.html' \
    --exclude='icons/README.md' \
    --exclude='*.log' \
    --exclude='*.tmp' \
    --exclude='node_modules' \
    . "$TEMP_DIR/"

# 创建 ZIP 文件
echo "创建 ZIP 文件: $ZIP_NAME"
cd "$TEMP_DIR"
zip -r "$ORIGINAL_DIR/$ZIP_NAME" . -q
cd "$ORIGINAL_DIR"

# 清理临时目录
rm -rf "$TEMP_DIR"

# 显示文件信息
FILE_SIZE=$(du -h "$ZIP_NAME" | cut -f1)
echo "✅ 打包完成！"
echo "📦 文件: $ZIP_NAME"
echo "📊 大小: $FILE_SIZE"

# 检查文件大小（Chrome Web Store 限制 10MB）
FILE_SIZE_BYTES=$(stat -f%z "$ZIP_NAME" 2>/dev/null || stat -c%s "$ZIP_NAME" 2>/dev/null || echo "0")
MAX_SIZE=$((10 * 1024 * 1024)) # 10MB

if [ -n "$FILE_SIZE_BYTES" ] && [ "$FILE_SIZE_BYTES" -gt 0 ] && [ "$FILE_SIZE_BYTES" -gt "$MAX_SIZE" ]; then
    echo "⚠️  警告: 文件大小超过 10MB，可能需要优化"
elif [ -n "$FILE_SIZE_BYTES" ] && [ "$FILE_SIZE_BYTES" -gt 0 ]; then
    echo "✓ 文件大小符合要求（< 10MB）"
fi

echo ""
echo "下一步："
echo "1. 检查 ZIP 文件内容是否正确"
echo "2. 在开发者模式下测试扩展"
echo "3. 上传到 Chrome Web Store 开发者控制台"
echo ""
echo "上传地址: https://chrome.google.com/webstore/devconsole"
