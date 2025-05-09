#!/bin/bash

# 创建微信分享专用图片
# 这个脚本将使用现有的图标创建一个适合在微信分享时使用的图片

# 检查是否有ImageMagick
if ! command -v convert &> /dev/null; then
    echo "错误: 未找到ImageMagick。请先安装ImageMagick。"
    echo "您可以使用 'brew install imagemagick' (Mac) 或 'apt-get install imagemagick' (Linux)来安装。"
    exit 1
fi

# 创建分享用的图片（1200x630是社交媒体分享的推荐尺寸）
echo "正在创建微信分享专用图片..."

# 使用现有的512x512图标
SOURCE_ICON="icons/icon-512x512.png"

# 输出文件
OUTPUT="icons/share-image.png"

# 检查源图标是否存在
if [ ! -f "$SOURCE_ICON" ]; then
    echo "错误: 找不到源图标文件: $SOURCE_ICON"
    exit 1
fi

# 创建分享图片
convert -size 1200x630 xc:"#2196f3" \
    "$SOURCE_ICON" -gravity center -composite \
    -fill white -pointsize 60 -gravity north -annotate +0+50 "反击噪音狗" \
    -fill white -pointsize 30 -gravity south -annotate +0+50 "对抗噪音干扰的利器" \
    "$OUTPUT"

# 检查是否成功
if [ -f "$OUTPUT" ]; then
    echo "成功创建分享图片: $OUTPUT"
else
    echo "错误: 创建分享图片失败"
    exit 1
fi

echo "完成!" 