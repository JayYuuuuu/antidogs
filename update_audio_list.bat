@echo off
setlocal enabledelayedexpansion

echo 开始更新音频文件列表...

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: 音频文件目录和配置文件
set "MUSIC_DIR=%SCRIPT_DIR%\music"
set "CONFIG_FILE=%MUSIC_DIR%\audiolist.json"

echo 扫描目录: %MUSIC_DIR%

:: 检查music目录是否存在
if not exist "%MUSIC_DIR%" (
  echo 错误: 音乐目录不存在: %MUSIC_DIR%
  exit /b 1
)

:: 准备临时文件
echo { > "%CONFIG_FILE%.tmp"
echo   "audioFiles": [ >> "%CONFIG_FILE%.tmp"

:: 初始化计数器和文件列表
set "FILE_COUNT=0"
set "FILE_LIST="

:: 获取所有MP3文件
for %%F in ("%MUSIC_DIR%\*.mp3") do (
  set /a FILE_COUNT+=1
  set "FILE_NAME=%%~nxF"
  set "FILE_LIST=!FILE_LIST! "%%~nxF""
)

:: 获取所有MP3文件（大写）
for %%F in ("%MUSIC_DIR%\*.MP3") do (
  :: 检查是否已经计数过（避免重复）
  set "FOUND=0"
  for %%G in ("%MUSIC_DIR%\*.mp3") do (
    if /i "%%~nxF"=="%%~nxG" set "FOUND=1"
  )
  if "!FOUND!"=="0" (
    set /a FILE_COUNT+=1
    set "FILE_NAME=%%~nxF"
    set "FILE_LIST=!FILE_LIST! "%%~nxF""
  )
)

:: 检查是否找到文件
if %FILE_COUNT% equ 0 (
  echo 警告: 未找到任何MP3文件
)

echo 找到 %FILE_COUNT% 个音频文件

:: 创建临时变量存储文件列表
set "TEMP_LIST=%FILE_LIST:~1%"
set "CURRENT_COUNT=0"

:: 写入JSON文件
for %%F in (%TEMP_LIST%) do (
  set /a CURRENT_COUNT+=1
  if !CURRENT_COUNT! equ %FILE_COUNT% (
    echo     %%F >> "%CONFIG_FILE%.tmp"
  ) else (
    echo     %%F, >> "%CONFIG_FILE%.tmp"
  )
)

:: 完成JSON文件
echo   ] >> "%CONFIG_FILE%.tmp"
echo } >> "%CONFIG_FILE%.tmp"

:: 移动临时文件到目标位置
move /y "%CONFIG_FILE%.tmp" "%CONFIG_FILE%" > nul

echo 音频列表已更新!
echo 配置文件路径: %CONFIG_FILE%
echo 包含的文件: %FILE_LIST%

echo 完成!
exit /b 0 