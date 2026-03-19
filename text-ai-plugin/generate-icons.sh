#!/bin/bash

# 图标生成脚本
# 使用方法: ./generate-icons.sh source-icon.png

if [ -z "$1" ]; then
    echo "用法: ./generate-icons.sh <源图片路径>"
    echo "例如: ./generate-icons.sh ~/Downloads/icon.png"
    exit 1
fi

SOURCE_IMAGE="$1"
ICONS_DIR="src-tauri/icons"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "错误: 找不到源图片 $SOURCE_IMAGE"
    exit 1
fi

echo "📦 开始生成图标..."
echo "源图片: $SOURCE_IMAGE"
echo "目标目录: $ICONS_DIR"
echo ""

# 创建 icons 目录（如果不存在）
mkdir -p "$ICONS_DIR"

# 生成 32x32
echo "生成 32x32.png..."
sips -z 32 32 "$SOURCE_IMAGE" --out "$ICONS_DIR/32x32.png" > /dev/null

# 生成 128x128
echo "生成 128x128.png..."
sips -z 128 128 "$SOURCE_IMAGE" --out "$ICONS_DIR/128x128.png" > /dev/null

# 生成 128x128@2x (256x256)
echo "生成 128x128@2x.png (256x256)..."
sips -z 256 256 "$SOURCE_IMAGE" --out "$ICONS_DIR/128x128@2x.png" > /dev/null

# 生成 icon.png (512x512)
echo "生成 icon.png (512x512)..."
sips -z 512 512 "$SOURCE_IMAGE" --out "$ICONS_DIR/icon.png" > /dev/null

echo ""
echo "✅ 所有图标生成完成！"
echo ""
echo "生成的文件:"
ls -lh "$ICONS_DIR"/*.png
