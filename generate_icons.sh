#!/bin/bash

# 确保icons目录存在
mkdir -p icons

# 复制主图标（已有）到各种尺寸
cp icons/icon-512x512.png icons/icon-72x72.png
cp icons/icon-512x512.png icons/icon-96x96.png
cp icons/icon-512x512.png icons/icon-128x128.png
cp icons/icon-512x512.png icons/icon-144x144.png
cp icons/icon-512x512.png icons/icon-152x152.png
cp icons/icon-512x512.png icons/icon-192x192.png
cp icons/icon-512x512.png icons/icon-384x384.png

# 复制主图标到favicon
cp icons/icon-512x512.png favicon.ico

# 创建iOS启动屏幕图像
cp icons/icon-512x512.png icons/splash-640x1136.png
cp icons/icon-512x512.png icons/splash-750x1334.png
cp icons/icon-512x512.png icons/splash-1242x2208.png
cp icons/icon-512x512.png icons/splash-1125x2436.png
cp icons/icon-512x512.png icons/splash-1242x2688.png

echo "所有图标已生成" 