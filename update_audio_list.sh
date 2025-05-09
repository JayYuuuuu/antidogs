#!/bin/bash

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 当前脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 音频文件目录和配置文件
MUSIC_DIR="$SCRIPT_DIR/music"
CONFIG_FILE="$MUSIC_DIR/audiolist.json"

echo -e "${YELLOW}开始更新音频文件列表...${NC}"

# 检查music目录是否存在
if [ ! -d "$MUSIC_DIR" ]; then
  echo -e "${RED}错误: 音乐目录不存在: $MUSIC_DIR${NC}"
  exit 1
fi

# 获取所有mp3文件（不区分大小写）
echo -e "${GREEN}扫描目录: $MUSIC_DIR${NC}"
FILES=()

# 查找.mp3和.MP3文件（适用于macOS和Linux）
for ext in "mp3" "MP3"; do
  for file in "$MUSIC_DIR"/*.$ext; do
    # 检查文件是否存在（避免通配符未匹配时的默认行为）
    if [ -f "$file" ] && [ "$file" != "$CONFIG_FILE" ]; then
      # 只获取文件名，不包括路径
      filename=$(basename "$file")
      FILES+=("$filename")
    fi
  done
done

# 检查是否找到文件
if [ ${#FILES[@]} -eq 0 ]; then
  echo -e "${RED}警告: 未找到任何MP3文件${NC}"
fi

echo -e "${GREEN}找到 ${#FILES[@]} 个音频文件${NC}"

# 创建JSON文件
echo -e "${GREEN}生成配置文件: $CONFIG_FILE${NC}"
echo "{" > "$CONFIG_FILE"
echo "  \"audioFiles\": [" >> "$CONFIG_FILE"

# 添加文件名到JSON
for ((i=0; i<${#FILES[@]}; i++)); do
  if [ $i -eq $(( ${#FILES[@]} - 1 )) ]; then
    # 最后一项不需要逗号
    echo "    \"${FILES[$i]}\"" >> "$CONFIG_FILE"
  else
    echo "    \"${FILES[$i]}\"," >> "$CONFIG_FILE"
  fi
done

# 完成JSON文件
echo "  ]" >> "$CONFIG_FILE"
echo "}" >> "$CONFIG_FILE"

echo -e "${GREEN}音频列表已更新!${NC}"
echo -e "${YELLOW}配置文件路径: $CONFIG_FILE${NC}"
echo -e "${GREEN}包含的文件: ${FILES[*]}${NC}"

# 设置执行权限
chmod 644 "$CONFIG_FILE"

echo -e "${GREEN}完成!${NC}"
exit 0 