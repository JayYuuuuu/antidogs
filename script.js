/**
 * 反击噪音狗 - 主要脚本
 * 实现音频文件的加载、播放控制、文件管理等功能
 */

// 全局变量
let audioFiles = []; // 存储所有音频文件信息
let playSequence = []; // 存储播放顺序
let currentAudioIndex = 0; // 当前播放的音频索引
let playCount = 1; // 播放次数
let currentPlayCount = 0; // 当前已播放次数
let playDuration = 0; // 播放时间（分钟）
let isPlaying = false; // 是否正在播放
let isPaused = false; // 是否暂停状态
let playTimer = null; // 播放时间定时器
let sequenceMode = false; // 是否为顺序播放模式
let progressUpdateInterval = null; // 进度更新定时器
let isTimeLimited = false; // 是否设置了时间限制
let pausedTimestamp = 0; // 暂停时的时间戳
let remainingTimerTime = 0; // 暂停时剩余的计时器时间
let wakeLock = null; // 用于保持屏幕唤醒的锁
let audioDurations = {}; // 存储音频文件时长的对象
let playStartTime = null; // 播放开始时间，用于备用计时

// AirPlay相关变量
let isAirPlayConnected = false; // 是否连接到AirPlay设备
let airPlayDevice = null; // 当前连接的AirPlay设备
let useWebAudio = false; // 是否使用WebAudio API
let audioContext = null; // WebAudio上下文
let audioSource = null; // WebAudio音频源

// 离线状态跟踪
let isOffline = !navigator.onLine;

// DOM元素
const audioPlayer = document.getElementById('audioPlayer');
const audioList = document.getElementById('audioList');
const playModeSelect = document.getElementById('playMode');
const sequenceControlGroup = document.getElementById('sequenceControlGroup');
const availableAudioList = document.getElementById('availableAudioList');
const sequencePreview = document.getElementById('sequencePreview');
const clearSequenceBtn = document.getElementById('clearSequence');
const saveSequenceBtn = document.getElementById('saveSequence');
const loadSequenceBtn = document.getElementById('loadSequence');
const playCountInput = document.getElementById('playCount');
const playDurationInput = document.getElementById('playDuration');
const volumeControl = document.getElementById('volumeControl');
const volumeValue = document.getElementById('volumeValue');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const nowPlayingSection = document.getElementById('nowPlaying');
const currentAudioNameEl = document.getElementById('currentAudioName');
const playStatusEl = document.getElementById('playStatus');
const remainingTimeEl = document.getElementById('remainingTime');
const uploadAudio = document.getElementById('uploadAudio');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');

// 播放列表对话框元素
const savePlaylistDialog = document.getElementById('savePlaylistDialog');
const loadPlaylistDialog = document.getElementById('loadPlaylistDialog');
const playlistNameInput = document.getElementById('playlistName');
const playlistList = document.getElementById('playlistList');
const cancelSavePlaylistBtn = document.getElementById('cancelSavePlaylist');
const confirmSavePlaylistBtn = document.getElementById('confirmSavePlaylist');
const cancelLoadPlaylistBtn = document.getElementById('cancelLoadPlaylist');

// 分享功能相关元素
const shareButton = document.getElementById('shareButton');
const shareDialog = document.getElementById('shareDialog');
const closeShareDialogBtn = document.getElementById('closeShareDialog');
const shareUrlInput = document.getElementById('shareUrl');
const copyShareUrlBtn = document.getElementById('copyShareUrl');
const qrCodeContainer = document.getElementById('qrCode');

// AirPlay输出控制相关元素
const audioOutputGroup = document.getElementById('audioOutputGroup');
const currentAudioOutput = document.getElementById('currentAudioOutput');
const airplayStatus = document.getElementById('airplayStatus');
const audioOutputBtn = document.getElementById('audioOutputBtn');

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 加载音频文件
    loadAudioFiles();
    
    // 从本地存储恢复音量设置
    const savedVolume = localStorage.getItem('preferredVolume');
    if (savedVolume !== null) {
        volumeControl.value = savedVolume;
        updateVolume();
    }
    
    // 设置事件监听器
    setupEventListeners();
    
    // 初始化媒体会话控制
    setupMediaSession();
    
    // 设置页面可见性变化监听
    setupVisibilityChangeListener();
    
    // 设置离线状态监听
    setupOfflineListener();
    
    // 检查是否从"添加到主屏幕"启动
    checkStandalone();
    
    // 初始化分享功能
    initShareFeature();
    
    // 初始化音频输出检测和WebAudio
    initAudioOutput();
});

/**
 * 加载音频文件
 * 从配置文件加载所有MP3文件
 */
function loadAudioFiles() {
    // 从音源配置文件加载音频列表
    fetch('music/audiolist.json')
        .then(response => {
            // 检查响应状态
            if (!response.ok) {
                throw new Error('无法加载音频列表配置文件');
            }
            return response.json();
        })
        .then(data => {
            // 将文件转换为对象格式并存储
            audioFiles = data.audioFiles.map((filename, index) => {
                return {
                    id: index + 1,
                    filename: filename,
                    path: `music/${filename}`,
                    isDefault: true,  // 标记为默认音源
                    duration: 0       // 初始时长为0，后续加载
                };
            });
            
            // 加载音频时长
            loadAudioDurations();
            
            // 渲染音频列表
            renderAudioList();
            
            // 渲染可选音频列表
            renderAvailableAudioList();
        })
        .catch(error => {
            console.error('加载音频列表失败:', error);
            
            // 加载失败时使用硬编码的默认列表作为备份
            const defaultFileList = [
                '脚步加说话声.MP3',
                '轻微噪音.MP3',
                '连续脚步声.MP3',
                '摔门加脚步声.MP3',
                '拉门加脚步声.MP3',
                '低音增强脚步声.MP3',
                '静音.MP3'
            ];
            
            // 将默认文件转换为对象格式并存储
            audioFiles = defaultFileList.map((filename, index) => {
                return {
                    id: index + 1,
                    filename: filename,
                    path: `music/${filename}`,
                    isDefault: true,  // 标记为默认音源
                    duration: 0       // 初始时长为0，后续加载
                };
            });
            
            // 加载音频时长
            loadAudioDurations();
            
            // 渲染音频列表
            renderAudioList();
            
            // 渲染可选音频列表
            renderAvailableAudioList();
        });
}

/**
 * 检测是否在微信环境中
 * @returns {boolean} 是否在微信环境中
 */
function isInWechat() {
    return /MicroMessenger/i.test(navigator.userAgent);
}

/**
 * 加载音频文件的时长
 */
function loadAudioDurations() {
    // 使用临时audio元素来获取音频时长
    audioFiles.forEach(audio => {
        const tempAudio = new Audio();
        
        // 在微信环境中增加错误处理和超时机制
        const isWechat = isInWechat();
        let timeoutId = null;
        
        // 设置音频源
        tempAudio.src = audio.path;
        
        // 监听元数据加载完成事件
        tempAudio.addEventListener('loadedmetadata', () => {
            // 如果有超时定时器，清除它
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            
            // 更新音频对象的时长
            audio.duration = tempAudio.duration;
            // 存储时长到缓存对象中
            audioDurations[audio.id] = tempAudio.duration;
            
            // 更新显示（仅在加载完时长后更新显示）
            updateAudioDurationDisplay(audio.id);
            
            // 如果在顺序播放模式下，更新总时长显示
            if (sequenceMode) {
                updateTotalSequenceDuration();
            }
        });
        
        // 处理加载错误
        tempAudio.addEventListener('error', () => {
            console.warn(`无法加载音频时长: ${audio.filename}`);
            // 在微信中为音频设置一个估计时长
            if (isWechat) {
                setEstimatedDuration(audio);
            }
        });
        
        // 在微信环境中设置超时处理
        if (isWechat) {
            timeoutId = setTimeout(() => {
                console.warn(`加载音频时长超时: ${audio.filename}`);
                setEstimatedDuration(audio);
            }, 3000); // 3秒超时
        }
        
        // 如果之前已经缓存了时长，直接使用
        if (audioDurations[audio.id]) {
            audio.duration = audioDurations[audio.id];
            
            // 立即更新显示
            setTimeout(() => {
                updateAudioDurationDisplay(audio.id);
            }, 0);
            
            // 清除可能设置的超时
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        }
    });
}

/**
 * 为音频设置估计时长（用于微信环境）
 * @param {Object} audio - 音频对象
 */
function setEstimatedDuration(audio) {
    // 根据文件名设置一个默认时长
    // 可以根据已知的音频文件特点来估计
    // 这里简单地设置默认时长，可以根据实际情况调整
    const defaultDurations = {
        '脚步加说话声.MP3': 20,
        '轻微噪音.MP3': 30,
        '连续脚步声.MP3': 25,
        '摔门加脚步声.MP3': 15,
        '拉门加脚步声.MP3': 12,
        '低音增强脚步声.MP3': 18,
        '静音.MP3': 1
    };
    
    // 获取预设时长或默认为15秒
    let estimatedDuration = defaultDurations[audio.filename] || 15;
    
    // 更新音频对象时长
    audio.duration = estimatedDuration;
    audioDurations[audio.id] = estimatedDuration;
    
    // 更新显示
    updateAudioDurationDisplay(audio.id);
}

/**
 * 更新特定音频的时长显示
 * @param {number} audioId - 音频ID
 */
function updateAudioDurationDisplay(audioId) {
    // 更新音频列表中的时长显示
    const audioItem = document.querySelector(`.audio-item[data-id="${audioId}"]`);
    if (audioItem) {
        const durationEl = audioItem.querySelector('.audio-duration');
        const audio = audioFiles.find(a => a.id === audioId);
        
        if (durationEl && audio) {
            if (audio.duration) {
                durationEl.textContent = formatDuration(audio.duration);
            } else {
                // 在微信环境中，如果仍无法获取时长，显示预估时长
                if (isInWechat()) {
                    setEstimatedDuration(audio);
                } else {
                    durationEl.textContent = '(加载中...)';
                }
            }
        }
    }
    
    // 更新可选音频列表中的时长显示
    const selectItem = document.querySelector(`.audio-select-item[data-id="${audioId}"]`);
    if (selectItem) {
        const durationEl = selectItem.querySelector('.audio-duration');
        const audio = audioFiles.find(a => a.id === audioId);
        
        if (durationEl && audio) {
            if (audio.duration) {
                durationEl.textContent = formatDuration(audio.duration);
            } else {
                // 在微信环境中，如果仍无法获取时长，显示预估时长
                if (isInWechat()) {
                    setEstimatedDuration(audio);
                } else {
                    durationEl.textContent = '(加载中...)';
                }
            }
        }
    }
    
    // 更新序列预览中的时长显示
    updateSequenceItemsDuration();
}

/**
 * 更新播放序列中所有项目的时长显示
 */
function updateSequenceItemsDuration() {
    const sequenceItems = document.querySelectorAll('.sequence-item');
    const isWechat = isInWechat();
    
    sequenceItems.forEach(item => {
        const audioId = parseInt(item.dataset.id);
        const durationEl = item.querySelector('.audio-duration');
        const audio = audioFiles.find(a => a.id === audioId);
        
        if (durationEl && audio) {
            if (audio.duration) {
                durationEl.textContent = formatDuration(audio.duration);
            } else if (isWechat) {
                // 在微信环境中，为音频设置估计时长
                setEstimatedDuration(audio);
                durationEl.textContent = formatDuration(audio.duration);
            } else {
                durationEl.textContent = '(加载中...)';
            }
        }
    });
    
    // 更新总时长显示
    updateTotalSequenceDuration();
}

/**
 * 计算并更新播放序列的总时长
 */
function updateTotalSequenceDuration() {
    if (!sequencePreview) return;
    
    // 移除可能已存在的总时长显示
    let totalDurationEl = document.getElementById('totalSequenceDuration');
    if (!totalDurationEl) {
        totalDurationEl = document.createElement('div');
        totalDurationEl.id = 'totalSequenceDuration';
        totalDurationEl.className = 'total-duration';
        sequencePreview.appendChild(totalDurationEl);
    }
    
    // 计算总时长
    let totalDuration = 0;
    let hasInvalidDuration = false;
    
    playSequence.forEach(audioId => {
        const audio = audioFiles.find(a => a.id === audioId);
        if (audio) {
            if (audio.duration) {
                totalDuration += audio.duration;
            } else {
                hasInvalidDuration = true;
                
                // 在微信环境中，为缺失时长的音频设置估计时长
                if (isInWechat()) {
                    setEstimatedDuration(audio);
                    totalDuration += audio.duration; // 现在应该有估计时长了
                }
            }
        }
    });
    
    // 更新显示
    if (playSequence.length > 0) {
        if (hasInvalidDuration && !isInWechat()) {
            // 仍有无法获取时长的音频且不在微信中
            totalDurationEl.textContent = `总时长: ${formatDuration(totalDuration)} (部分音频加载中)`;
        } else {
            totalDurationEl.textContent = `总时长: ${formatDuration(totalDuration)}`;
        }
        totalDurationEl.style.display = 'block';
    } else {
        totalDurationEl.style.display = 'none';
    }
}

/**
 * 将秒数格式化为时分秒
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '(0秒)';
    
    const totalSeconds = Math.round(seconds);
    
    if (totalSeconds < 60) {
        return `(${totalSeconds}秒)`;
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    
    if (minutes < 60) {
        return `(${minutes}分${remainingSeconds > 0 ? remainingSeconds + '秒' : ''})`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `(${hours}时${remainingMinutes > 0 ? remainingMinutes + '分' : ''}${remainingSeconds > 0 ? remainingSeconds + '秒' : ''})`;
}

/**
 * 渲染音频列表
 * 将音频文件显示到界面上
 */
function renderAudioList() {
    audioList.innerHTML = '';
    
    // 如果没有音频文件，显示提示信息
    if (audioFiles.length === 0) {
        audioList.innerHTML = '<p class="no-audio">无可用音源，请添加音频文件</p>';
        return;
    }
    
    // 渲染每个音频文件
    audioFiles.forEach(audio => {
        const audioItem = document.createElement('div');
        audioItem.className = 'audio-item';
        audioItem.dataset.id = audio.id;
        
        // 显示文件名（不含扩展名）
        const displayName = audio.filename.replace(/\.[^.]+$/, '');
        
        // 根据是否为默认音源决定是否显示删除按钮
        const deleteButton = !audio.isDefault 
            ? `<button class="delete-btn" data-id="${audio.id}" title="删除">×</button>` 
            : '';
        
        // 添加时长显示
        const durationText = audio.duration ? formatDuration(audio.duration) : '(加载中...)';
        
        audioItem.innerHTML = `
            <span class="audio-num">${audio.id}.</span>
            <span class="audio-name">${displayName}</span>
            <span class="audio-duration">${durationText}</span>
            <div class="audio-actions">
                ${deleteButton}
            </div>
        `;
        
        // 点击播放单个音频
        audioItem.addEventListener('click', (e) => {
            // 如果点击的是删除按钮，不触发播放
            if (e.target.classList.contains('delete-btn')) return;
            
            // 设置为单个播放模式
            playModeSelect.value = 'single';
            updatePlayMode();
            
            // 播放该音频
            playSingleAudio(audio.id);
        });
        
        audioList.appendChild(audioItem);
    });
    
    // 为删除按钮添加事件监听
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止冒泡，避免触发父元素的点击事件
            const audioId = parseInt(btn.dataset.id);
            deleteAudio(audioId);
        });
    });
    
    // 更新可选音频列表
    renderAvailableAudioList();
}

/**
 * 渲染可用于选择的音频列表
 * 用于自定义播放顺序
 */
function renderAvailableAudioList() {
    // 如果availableAudioList元素不存在，直接返回
    if (!availableAudioList) return;
    
    availableAudioList.innerHTML = '';
    
    // 渲染每个可选音频项
    audioFiles.forEach(audio => {
        const audioSelectItem = document.createElement('div');
        audioSelectItem.className = 'audio-select-item';
        audioSelectItem.dataset.id = audio.id;
        
        // 显示文件名（不含扩展名）
        const displayName = audio.filename.replace(/\.[^.]+$/, '');
        
        // 添加时长显示
        const durationText = audio.duration ? formatDuration(audio.duration) : '(加载中...)';
        
        // 设置音频项内容
        audioSelectItem.innerHTML = `
            <span class="audio-name">${audio.id}号: ${displayName}</span>
            <span class="audio-duration">${durationText}</span>
        `;
        
        // 点击添加到播放序列
        audioSelectItem.addEventListener('click', () => {
            addToPlaySequence(audio.id);
        });
        
        availableAudioList.appendChild(audioSelectItem);
    });
}

/**
 * 渲染播放序列预览
 */
function renderSequencePreview() {
    // 如果sequencePreview元素不存在，直接返回
    if (!sequencePreview) return;
    
    sequencePreview.innerHTML = '';
    
    // 如果没有播放序列，显示提示信息
    if (playSequence.length === 0) {
        const emptyHint = document.createElement('p');
        emptyHint.className = 'empty-hint';
        emptyHint.textContent = '请从上方选择音频添加到播放序列';
        sequencePreview.appendChild(emptyHint);
        return;
    }
    
    // 渲染每个序列项
    playSequence.forEach((audioId, index) => {
        const audio = audioFiles.find(a => a.id === audioId);
        if (!audio) return;
        
        const sequenceItem = document.createElement('div');
        sequenceItem.className = 'sequence-item';
        sequenceItem.dataset.id = audio.id;
        sequenceItem.dataset.index = index;
        
        // 显示文件名（不含扩展名）
        const displayName = audio.filename.replace(/\.[^.]+$/, '');
        
        // 添加时长显示
        const durationText = audio.duration ? formatDuration(audio.duration) : '(加载中...)';
        
        // 设置序列项内容
        sequenceItem.innerHTML = `
            <span class="audio-num">${index + 1}.</span>
            <span class="audio-name">${audio.id}号: ${displayName}</span>
            <span class="audio-duration">${durationText}</span>
            <span class="remove-btn" title="从序列中移除">×</span>
        `;
        
        // 为移除按钮添加事件监听
        const removeBtn = sequenceItem.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromPlaySequence(index);
        });
        
        sequencePreview.appendChild(sequenceItem);
    });
    
    // 添加总时长显示
    updateTotalSequenceDuration();
}

/**
 * 添加音频到播放序列
 * @param {number} audioId - 音频ID
 */
function addToPlaySequence(audioId) {
    // 找到对应的音频
    const audio = audioFiles.find(a => a.id === audioId);
    if (!audio) return;
    
    // 添加到播放序列
    playSequence.push(audioId);
    
    // 更新序列预览
    renderSequencePreview();
    
    // 更新总时长
    updateTotalSequenceDuration();
}

/**
 * 从播放序列中移除指定位置的音频
 * @param {number} index - 序列中的索引位置
 */
function removeFromPlaySequence(index) {
    // 检查索引是否有效
    if (index < 0 || index >= playSequence.length) return;
    
    // 从播放序列中移除
    playSequence.splice(index, 1);
    
    // 更新序列预览
    renderSequencePreview();
    
    // 更新总时长
    updateTotalSequenceDuration();
}

/**
 * 清空播放序列
 */
function clearPlaySequence() {
    playSequence = [];
    renderSequencePreview();
    
    // 更新总时长（清空）
    updateTotalSequenceDuration();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 播放模式改变
    playModeSelect.addEventListener('change', updatePlayMode);
    
    // 清空序列按钮
    if (clearSequenceBtn) {
        clearSequenceBtn.addEventListener('click', clearPlaySequence);
    }
    
    // 保存播放列表按钮
    if (saveSequenceBtn) {
        saveSequenceBtn.addEventListener('click', showSavePlaylistDialog);
    }
    
    // 加载播放列表按钮
    if (loadSequenceBtn) {
        loadSequenceBtn.addEventListener('click', showLoadPlaylistDialog);
    }
    
    // 播放次数输入
    const playCountBtns = playCountInput.parentElement.querySelectorAll('button');
    playCountBtns[0].addEventListener('click', () => updateNumberInput(playCountInput, -1, 1));
    playCountBtns[1].addEventListener('click', () => updateNumberInput(playCountInput, 1, 1));
    playCountInput.addEventListener('change', () => {
        if (parseInt(playCountInput.value) < 1) {
            playCountInput.value = 1;
        }
    });
    
    // 播放时间输入
    const durationBtns = playDurationInput.parentElement.querySelectorAll('button');
    durationBtns[0].addEventListener('click', () => updateNumberInput(playDurationInput, -1, 0));
    durationBtns[1].addEventListener('click', () => updateNumberInput(playDurationInput, 1, 0));
    playDurationInput.addEventListener('change', () => {
        if (parseInt(playDurationInput.value) < 0) {
            playDurationInput.value = 0;
        }
        // 当播放时间改变时，更新UI提示
        updateTimeLimitedState();
    });
    
    // 音量控制
    volumeControl.addEventListener('input', updateVolume);
    // 初始化音量
    updateVolume();
    
    // 播放按钮
    playButton.addEventListener('click', startPlayback);
    
    // 暂停按钮
    pauseButton.addEventListener('click', togglePause);
    
    // 停止按钮
    stopButton.addEventListener('click', stopPlayback);
    
    // 音频播放结束事件
    audioPlayer.addEventListener('ended', handleAudioEnded);
    
    // 文件上传
    uploadAudio.addEventListener('change', handleFileUpload);
    
    // 音频元数据加载完成事件（获取音频时长）
    audioPlayer.addEventListener('loadedmetadata', updateAudioDuration);
    
    // 时间更新事件
    audioPlayer.addEventListener('timeupdate', updateProgressBar);
    
    // 播放列表对话框按钮
    cancelSavePlaylistBtn.addEventListener('click', () => {
        savePlaylistDialog.classList.remove('visible');
    });
    
    confirmSavePlaylistBtn.addEventListener('click', savePlaylist);
    
    cancelLoadPlaylistBtn.addEventListener('click', () => {
        loadPlaylistDialog.classList.remove('visible');
    });
    
    // 分享按钮事件
    if (shareButton) {
        shareButton.addEventListener('click', showShareDialog);
    }
    
    // 关闭分享对话框按钮
    if (closeShareDialogBtn) {
        closeShareDialogBtn.addEventListener('click', () => {
            shareDialog.classList.remove('visible');
        });
    }
    
    // 复制分享链接按钮
    if (copyShareUrlBtn) {
        copyShareUrlBtn.addEventListener('click', copyShareUrl);
    }
    
    // 音频输出切换按钮
    if (audioOutputBtn) {
        audioOutputBtn.addEventListener('click', () => {
            // 检查是否iOS设备
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                // iOS设备显示系统控制
                showIOSAirPlayControl();
            } else {
                // 其他设备重新检测音频输出
                checkAudioOutputDevices();
                
                // 在非iOS设备上切换输出设备（如有）
                if (isAirPlayConnected && airPlayDevice) {
                    switchToAirPlayOutput();
                } else {
                    switchToDefaultOutput();
                }
            }
        });
    }
    
    // 初始化时间限制状态
    updateTimeLimitedState();
}

/**
 * 更新时间限制状态
 * 当播放时间设置大于0时，显示播放次数将被忽略的提示
 */
function updateTimeLimitedState() {
    const durationValue = parseInt(playDurationInput.value);
    isTimeLimited = durationValue > 0;
    
    // 在UI上提供一些视觉反馈，表明播放次数设置可能被忽略
    if (isTimeLimited) {
        playCountInput.parentElement.parentElement.classList.add('disabled-setting');
        // 可以添加一个提示元素，表明在时间限制模式下播放次数被忽略
        const noteEl = playCountInput.parentElement.parentElement.querySelector('.time-priority-note');
        if (!noteEl) {
            const note = document.createElement('p');
            note.className = 'note time-priority-note';
            note.textContent = '设置了播放时间限制，时间到将优先停止播放';
            playCountInput.parentElement.parentElement.appendChild(note);
        }
    } else {
        playCountInput.parentElement.parentElement.classList.remove('disabled-setting');
        const noteEl = playCountInput.parentElement.parentElement.querySelector('.time-priority-note');
        if (noteEl) {
            noteEl.remove();
        }
    }
}

/**
 * 更新数字输入框的值
 * @param {HTMLElement} input - 输入元素
 * @param {number} change - 变化值
 * @param {number} minValue - 最小值
 */
function updateNumberInput(input, change, minValue) {
    let value = parseInt(input.value) + change;
    if (value < minValue) value = minValue;
    input.value = value;
    
    // 如果是播放时间输入框，更新时间限制状态
    if (input === playDurationInput) {
        updateTimeLimitedState();
    }
}

/**
 * 更新播放模式
 */
function updatePlayMode() {
    const selectedMode = playModeSelect.value;
    sequenceMode = selectedMode === 'sequence';
    const autoNextMode = selectedMode === 'auto-next';
    
    if (sequenceMode) {
        sequenceControlGroup.style.display = 'block';
        renderSequencePreview();
        // 显示总时长
        updateTotalSequenceDuration();
    } else {
        sequenceControlGroup.style.display = 'none';
    }
}

/**
 * 开始播放
 */
function startPlayback() {
    // 如果当前是暂停状态，恢复播放
    if (isPaused) {
        resumePlayback();
        return;
    }
    
    // 获取播放设置
    playCount = parseInt(playCountInput.value);
    playDuration = parseInt(playDurationInput.value);
    
    // 更新时间限制状态
    isTimeLimited = playDuration > 0;
    
    // 重置计数器
    currentPlayCount = 0;
    
    // 记录播放开始时间（用于备用计时）
    playStartTime = new Date();
    
    // 检查播放模式
    if (sequenceMode) {
        // 检查是否有选择音频
        if (playSequence.length === 0) {
            alert('请先添加音频到播放序列');
            return;
        }
        
        // 开始顺序播放
        currentAudioIndex = 0;
        playNextInSequence();
    } else {
        // 单个播放模式下检查是否已选择音频
        if (!audioPlayer.src) {
            // 默认播放第一个音频
            if (audioFiles.length > 0) {
                playSingleAudio(audioFiles[0].id);
            } else {
                alert('没有可用的音频文件');
                return;
            }
        } else {
            // 继续播放当前音频
            audioPlayer.play();
            updatePlayStatus(true);
        }
    }
    
    // 设置播放时间限制（如果有）
    if (isTimeLimited) {
        if (playTimer) clearTimeout(playTimer);
        
        // 确保使用可靠的方式创建定时器
        const durationMs = playDuration * 60 * 1000;
        playTimer = setTimeout(() => {
            stopPlayback();
            alert(`已达到设定的播放时间 ${playDuration} 分钟`);
        }, durationMs);
    }
}

/**
 * 暂停或恢复播放
 */
function togglePause() {
    if (isPaused) {
        resumePlayback();
    } else {
        pausePlayback();
    }
}

/**
 * 暂停播放
 */
function pausePlayback() {
    if (!isPlaying || isPaused) return;
    
    // 暂停音频
    audioPlayer.pause();
    
    // 如果有时间限制，暂停计时器
    if (playTimer) {
        try {
            // 记录剩余时间
            const endTime = playTimer._idleStart + playTimer._idleTimeout;
            remainingTimerTime = endTime - Date.now();
            
            // 剩余时间不能为负
            if (isNaN(remainingTimerTime) || remainingTimerTime < 0) {
                // 尝试使用播放开始时间计算
                if (playStartTime && playDuration > 0) {
                    const elapsedMs = new Date() - playStartTime;
                    const totalMs = playDuration * 60 * 1000;
                    remainingTimerTime = totalMs - elapsedMs;
                    
                    if (remainingTimerTime < 0) remainingTimerTime = 0;
                } else {
                    // 最后备用：使用播放总时长
                    remainingTimerTime = playDuration * 60 * 1000;
                }
            }
        } catch (error) {
            console.error('暂停计时出错:', error);
            // 备用：从播放开始时间计算
            if (playStartTime && playDuration > 0) {
                const elapsedMs = new Date() - playStartTime;
                const totalMs = playDuration * 60 * 1000;
                remainingTimerTime = totalMs - elapsedMs;
                
                if (remainingTimerTime < 0) remainingTimerTime = 0;
            } else {
                // 最后备用：使用播放总时长
                remainingTimerTime = playDuration * 60 * 1000;
            }
        }
        
        // 清除计时器
        clearTimeout(playTimer);
        playTimer = null;
    }
    
    // 更新状态
    isPaused = true;
    
    // 更新按钮状态
    updateButtonStates();
    
    // 更新播放状态显示
    playStatusEl.textContent = '已暂停';
}

/**
 * 恢复播放
 */
function resumePlayback() {
    if (!isPaused) return;
    
    // 恢复音频播放
    audioPlayer.play();
    
    // 如果有时间限制，恢复计时器
    if (isTimeLimited && remainingTimerTime > 0) {
        playTimer = setTimeout(() => {
            stopPlayback();
            alert(`已达到设定的播放时间 ${playDuration} 分钟`);
        }, remainingTimerTime);
        
        // 如果使用备用计时，更新播放开始时间
        if (playStartTime) {
            // 调整播放开始时间，考虑已经过去的时间
            const elapsedBeforePause = (playDuration * 60 * 1000) - remainingTimerTime;
            playStartTime = new Date(new Date().getTime() - elapsedBeforePause);
        }
    }
    
    // 更新状态
    isPaused = false;
    remainingTimerTime = 0;
    
    // 更新按钮状态
    updateButtonStates();
    
    // 更新播放状态显示
    playStatusEl.textContent = '正在播放';
}

/**
 * 更新按钮状态
 */
function updateButtonStates() {
    if (isPlaying) {
        if (isPaused) {
            // 暂停状态
            playButton.textContent = '继续播放';
            pauseButton.textContent = '继续播放';
            playButton.disabled = false;
            pauseButton.disabled = false;
            stopButton.disabled = false;
        } else {
            // 播放状态
            playButton.textContent = '开始播放';
            pauseButton.textContent = '暂停播放';
            playButton.disabled = true;
            pauseButton.disabled = false;
            stopButton.disabled = false;
        }
    } else {
        // 停止状态
        playButton.textContent = '开始播放';
        pauseButton.textContent = '暂停播放';
        playButton.disabled = false;
        pauseButton.disabled = true;
        stopButton.disabled = true;
    }
}

/**
 * 播放单个音频
 * @param {number} audioId - 音频ID
 */
function playSingleAudio(audioId) {
    const audio = audioFiles.find(a => a.id === audioId);
    if (!audio) return;
    
    // 设置音频源
    audioPlayer.src = audio.path;
    
    // 开始播放
    audioPlayer.play()
        .then(() => {
            // 播放成功
            updatePlayStatus(true, audio.filename);
            
            // 更新媒体会话元数据
            updateMediaSessionMetadata(audio);
            
            // 请求唤醒锁
            requestWakeLock();
            
            // 如果检测到AirPlay设备，尝试切换输出
            if (isAirPlayConnected && airPlayDevice) {
                switchToAirPlayOutput();
            }
        })
        .catch(error => {
            // 播放失败
            console.error('播放失败:', error);
            alert(`播放失败: ${error.message}`);
            updatePlayStatus(false);
        });
}

/**
 * 切换到AirPlay输出设备
 */
function switchToAirPlayOutput() {
    // 如果没有连接到AirPlay设备，直接返回
    if (!isAirPlayConnected || !airPlayDevice) {
        console.log('没有可用的AirPlay设备');
        return;
    }
    
    // 检查浏览器是否支持setSinkId
    if (typeof audioPlayer.setSinkId === 'function') {
        try {
            audioPlayer.setSinkId(airPlayDevice.deviceId)
                .then(() => {
                    console.log('成功切换到AirPlay设备');
                    currentAudioOutput.textContent = airPlayDevice.label || 'AirPlay设备';
                })
                .catch(err => {
                    console.error('切换音频输出失败:', err);
                    
                    // 失败时尝试使用WebAudio作为备选方案
                    useWebAudioFallback();
                });
        } catch (err) {
            console.error('切换音频输出失败:', err);
            
            // 失败时尝试使用WebAudio作为备选方案
            useWebAudioFallback();
        }
    } else {
        // 浏览器不支持setSinkId，使用WebAudio作为备选方案
        console.log('浏览器不支持setSinkId，尝试使用WebAudio');
        useWebAudioFallback();
    }
}

/**
 * 切换回默认音频输出
 */
function switchToDefaultOutput() {
    // 如果正在使用WebAudio，先停止WebAudio
    if (useWebAudio && audioSource) {
        try {
            audioSource.disconnect();
            audioSource = null;
        } catch (err) {
            console.error('断开WebAudio连接失败:', err);
        }
    }
    
    // 重置状态
    useWebAudio = false;
    
    // 如果支持setSinkId，切换回默认设备
    if (typeof audioPlayer.setSinkId === 'function') {
        try {
            audioPlayer.setSinkId('default')
                .then(() => {
                    console.log('成功切换回默认音频输出');
                })
                .catch(err => {
                    console.error('切换到默认音频输出失败:', err);
                });
        } catch (err) {
            console.error('切换到默认音频输出失败:', err);
        }
    }
    
    // 更新UI
    currentAudioOutput.textContent = '手机扬声器';
    updateAirplayStatus('未连接', '');
}

/**
 * 使用WebAudio作为备选方案播放音频
 * WebAudio API在iOS设备上更可靠，特别是在AirPlay场景下
 */
function useWebAudioFallback() {
    // 确保AudioContext已初始化
    if (!audioContext && window.AudioContext) {
        try {
            audioContext = new AudioContext();
        } catch (e) {
            console.error('创建AudioContext失败:', e);
            return;
        }
    }
    
    if (!audioContext) {
        console.error('AudioContext不可用');
        return;
    }
    
    // 如果audioContext处于暂停状态，恢复它
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
            console.error('恢复AudioContext失败:', err);
        });
    }
    
    try {
        // 创建媒体元素源
        const source = audioContext.createMediaElementSource(audioPlayer);
        
        // 如果已有之前的source，先断开连接
        if (audioSource) {
            audioSource.disconnect();
        }
        
        // 连接到音频目标
        source.connect(audioContext.destination);
        
        // 保存音频源引用
        audioSource = source;
        
        // 更新状态
        useWebAudio = true;
        
        console.log('成功切换到WebAudio播放');
    } catch (err) {
        console.error('WebAudio设置失败:', err);
    }
}

/**
 * 显示iOS设备的AirPlay控制
 * 针对iOS设备的特殊处理，显示系统原生AirPlay选择界面
 */
function showIOSAirPlayControl() {
    // 检查设备是否为iOS
    if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        console.log('非iOS设备，无法显示系统AirPlay控制');
        return;
    }
    
    try {
        // 尝试使用WebKit特有的API显示AirPlay选择器
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.showAirPlayRoutePickerView) {
            window.webkit.messageHandlers.showAirPlayRoutePickerView.postMessage({});
            console.log('已调用iOS AirPlay选择器');
            return;
        }
        
        // 备选方案：创建视频元素触发AirPlay按钮显示
        // 这是一个hack，利用视频元素触发原生AirPlay控制
        const tempVideo = document.createElement('video');
        tempVideo.setAttribute('playsinline', '');
        tempVideo.setAttribute('controls', '');
        tempVideo.style.position = 'fixed';
        tempVideo.style.bottom = '0';
        tempVideo.style.opacity = '0.01'; // 几乎不可见但仍能交互
        tempVideo.style.pointerEvents = 'none'; // 不阻止用户交互
        tempVideo.style.zIndex = '999999';
        
        // 添加到文档并尝试播放
        document.body.appendChild(tempVideo);
        
        // 短暂显示控制区域，然后移除元素
        setTimeout(() => {
            // 移除临时元素
            tempVideo.remove();
        }, 1000);
        
        console.log('已尝试触发iOS设备原生AirPlay控制');
    } catch (err) {
        console.error('显示iOS AirPlay控制失败:', err);
        alert('无法自动显示AirPlay控制，请使用系统控制中心选择音频输出');
    }
}

/**
 * 播放序列中的下一个音频
 */
function playNextInSequence() {
    // 如果设置了时间限制但时间已到，则不继续播放
    if (isTimeLimited && !playTimer) {
        stopPlayback();
        return;
    }
    
    // 检查是否已播放完指定次数（仅在未设置时间限制时考虑播放次数）
    if (!isTimeLimited && currentPlayCount >= playCount) {
        stopPlayback();
        return;
    }
    
    // 获取当前要播放的音频ID
    const audioId = playSequence[currentAudioIndex];
    
    // 播放当前音频
    playSingleAudio(audioId);
    
    // 更新索引，为下一次播放做准备
    currentAudioIndex++;
    
    // 如果到达序列末尾，重置索引并增加播放次数计数
    if (currentAudioIndex >= playSequence.length) {
        currentAudioIndex = 0;
        currentPlayCount++;
    }
}

/**
 * 处理音频播放结束事件
 */
function handleAudioEnded() {
    // 如果设置了时间限制但时间已到，则不继续播放
    if (isTimeLimited && !playTimer) {
        updatePlayStatus(false);
        return;
    }
    
    const selectedMode = playModeSelect.value;
    
    // 顺序播放模式下，自动播放下一个
    if (selectedMode === 'sequence' && isPlaying) {
        playNextInSequence();
    } 
    // 自动播放下一首模式
    else if (selectedMode === 'auto-next' && isPlaying) {
        playNextAudio();
    }
    // 单个播放模式下，如果设置了重复次数并且没有时间限制
    else if (!isTimeLimited && currentPlayCount < playCount - 1) {
        currentPlayCount++;
        audioPlayer.play();
    } else {
        updatePlayStatus(false);
    }
}

/**
 * 播放下一个音频文件
 * 用于自动播放下一首模式
 */
function playNextAudio() {
    // 查找当前播放的音频在列表中的索引
    const currentSrc = audioPlayer.src;
    const currentAudio = audioFiles.find(a => currentSrc.includes(a.path));
    
    if (!currentAudio) {
        // 如果找不到当前播放的音频，从第一个开始
        if (audioFiles.length > 0) {
            playSingleAudio(audioFiles[0].id);
        }
        return;
    }
    
    // 找到当前音频在列表中的索引位置
    const currentIndex = audioFiles.findIndex(a => a.id === currentAudio.id);
    
    // 计算下一个音频的索引
    const nextIndex = (currentIndex + 1) % audioFiles.length;
    
    // 播放下一个音频
    playSingleAudio(audioFiles[nextIndex].id);
    
    // 重置播放次数计数
    currentPlayCount = 0;
}

/**
 * 停止播放
 */
function stopPlayback() {
    // 停止音频
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    
    // 清除定时器
    if (playTimer) {
        clearTimeout(playTimer);
        playTimer = null;
    }
    
    // 停止进度更新
    if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
        progressUpdateInterval = null;
    }
    
    // 清理WebAudio连接
    if (useWebAudio && audioSource) {
        try {
            audioSource.disconnect();
            audioSource = null;
        } catch (err) {
            console.error('断开WebAudio连接失败:', err);
        }
        useWebAudio = false;
    }
    
    // 重置进度条
    resetProgressBar();
    
    // 重置状态
    isPaused = false;
    remainingTimerTime = 0;
    playStartTime = null; // 重置播放开始时间
    
    // 更新状态
    updatePlayStatus(false);
    
    // 释放唤醒锁
    releaseWakeLock();
}

/**
 * 更新播放状态
 * @param {boolean} playing - 是否正在播放
 * @param {string} audioName - 当前播放的音频名称
 * @param {boolean} skipUIUpdate - 是否跳过UI更新（用于页面可见性变化时）
 */
function updatePlayStatus(playing, audioName = null, skipUIUpdate = false) {
    isPlaying = playing;
    
    // 更新按钮状态
    updateButtonStates();
    
    // 更新播放状态显示
    if (playing) {
        if (!skipUIUpdate) {
            nowPlayingSection.style.display = 'block';
            playStatusEl.textContent = isPaused ? '已暂停' : '正在播放';
            
            if (audioName) {
                currentAudioNameEl.textContent = audioName.replace(/\.[^.]+$/, '');
            }
        }
        
        // 更新媒体会话播放状态
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPaused ? 'paused' : 'playing';
        }
        
        // 更新剩余时间显示（如果设置了时间限制）
        updateRemainingTime();
    } else {
        playStatusEl.textContent = '已停止';
        remainingTimeEl.textContent = '';
        
        // 更新媒体会话播放状态
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
        }
    }
}

/**
 * 更新剩余播放时间显示
 */
function updateRemainingTime() {
    if (!isPlaying || playDuration <= 0) {
        remainingTimeEl.textContent = '';
        return;
    }
    
    try {
        // 首选方法：使用playTimer
        if (playTimer && typeof playTimer._idleStart === 'number' && typeof playTimer._idleTimeout === 'number') {
            // 计算剩余时间
            const endTime = new Date(playTimer._idleStart + playTimer._idleTimeout);
            const remainingMs = endTime - new Date();
            
            if (remainingMs <= 0) {
                remainingTimeEl.textContent = '即将结束';
                return;
            }
            
            // 转换为分:秒格式
            const remainingMinutes = Math.floor(remainingMs / 60000);
            const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
            
            // 检查数字是否有效
            if (isNaN(remainingMinutes) || isNaN(remainingSeconds)) {
                throw new Error('无效的剩余时间');
            } else {
                remainingTimeEl.textContent = `剩余时间: ${remainingMinutes}分${remainingSeconds}秒`;
            }
        } 
        // 备用方法：使用播放开始时间
        else if (playStartTime) {
            // 计算已经播放的时间
            const elapsedMs = new Date() - playStartTime;
            const totalMs = playDuration * 60 * 1000;
            const remainingMs = totalMs - elapsedMs;
            
            if (remainingMs <= 0) {
                remainingTimeEl.textContent = '即将结束';
                return;
            }
            
            // 转换为分:秒格式
            const remainingMinutes = Math.floor(remainingMs / 60000);
            const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
            
            remainingTimeEl.textContent = `剩余时间: ${remainingMinutes}分${remainingSeconds}秒`;
        }
        // 最后备用：直接显示设置的时间
        else {
            remainingTimeEl.textContent = `剩余时间: ${playDuration}分0秒`;
        }
    } catch (error) {
        console.error('更新剩余时间出错:', error);
        
        // 尝试使用播放开始时间计算
        if (playStartTime && playDuration > 0) {
            try {
                // 计算已经播放的时间
                const elapsedMs = new Date() - playStartTime;
                const totalMs = playDuration * 60 * 1000;
                const remainingMs = totalMs - elapsedMs;
                
                if (remainingMs <= 0) {
                    remainingTimeEl.textContent = '即将结束';
                } else {
                    const remainingMinutes = Math.floor(remainingMs / 60000);
                    const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
                    remainingTimeEl.textContent = `剩余时间: ${remainingMinutes}分${remainingSeconds}秒`;
                }
            } catch (e) {
                // 最终备用显示
                remainingTimeEl.textContent = `剩余时间: ${playDuration}分0秒`;
            }
        } else if (playDuration > 0) {
            remainingTimeEl.textContent = `剩余时间: ${playDuration}分0秒`;
        } else {
            remainingTimeEl.textContent = '';
        }
    }
    
    // 每秒更新一次
    setTimeout(updateRemainingTime, 1000);
}

/**
 * 更新音频时长显示
 */
function updateAudioDuration() {
    const duration = audioPlayer.duration;
    totalTimeEl.textContent = formatTime(duration);
    currentTimeEl.textContent = "00:00";
    
    // 重置进度条
    resetProgressBar();
}

/**
 * 更新进度条
 */
function updateProgressBar() {
    if (!isPlaying) return;
    
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    // 更新进度条填充
    if (duration) {
        const progressPercent = (currentTime / duration) * 100;
        progressFill.style.width = `${progressPercent}%`;
    }
    
    // 更新当前时间显示
    currentTimeEl.textContent = formatTime(currentTime);
    
    // 更新媒体会话的播放位置信息
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setPositionState({
            duration: duration || 0,
            position: currentTime || 0,
            playbackRate: audioPlayer.playbackRate || 1
        });
    }
}

/**
 * 重置进度条
 */
function resetProgressBar() {
    progressFill.style.width = '0%';
    currentTimeEl.textContent = '00:00';
}

/**
 * 格式化时间为 MM:SS 格式
 * @param {number} timeInSeconds - 秒数
 * @returns {string} 格式化的时间字符串
 */
function formatTime(timeInSeconds) {
    if (!timeInSeconds || isNaN(timeInSeconds)) return '00:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 处理文件上传
 * @param {Event} event - 上传事件
 */
function handleFileUpload(event) {
    // 检查是否在PWA模式下
    const isInStandaloneMode = 
        window.navigator.standalone || 
        window.matchMedia('(display-mode: standalone)').matches;
    
    // 检查是否在微信环境中
    const isWechat = isInWechat();
    
    // 处理文件上传逻辑
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 检查文件类型
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 只接受MP3文件
        if (!file.type.match('audio/mp3') && !file.name.toLowerCase().endsWith('.mp3')) {
            alert(`文件 "${file.name}" 不是有效的MP3文件`);
            continue;
        }
        
        // 创建新的音频对象
        const newId = audioFiles.length > 0 ? Math.max(...audioFiles.map(a => a.id)) + 1 : 1;
        
        // 创建文件URL
        const fileUrl = URL.createObjectURL(file);
        
        // 估计文件大小对应的时长（作为备用）
        // MP3约为每秒16KB，可以用文件大小粗略估计时长
        const estimatedDuration = Math.round(file.size / 16000);
        
        // 添加到音频列表
        audioFiles.push({
            id: newId,
            filename: file.name,
            path: fileUrl,
            isDefault: false,  // 标记为非默认音源（用户上传）
            duration: isWechat ? estimatedDuration : 0  // 在微信中使用估计时长
        });
        
        // 如果在微信环境中，立即存储估计时长
        if (isWechat) {
            audioDurations[newId] = estimatedDuration;
        }
        
        // 加载音频时长（非微信环境或作为备用）
        const tempAudio = new Audio();
        tempAudio.src = fileUrl;
        
        // 设置超时处理（特别是对微信环境）
        let timeoutId = null;
        if (isWechat) {
            timeoutId = setTimeout(() => {
                console.warn(`加载音频时长超时: ${file.name}`);
                // 已经在上面设置了估计时长，这里只需确保更新显示
                updateAudioDurationDisplay(newId);
            }, 3000);
        }
        
        tempAudio.addEventListener('loadedmetadata', () => {
            // 如果有超时定时器，清除它
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            
            // 更新音频对象的时长
            const audioIndex = audioFiles.findIndex(a => a.id === newId);
            if (audioIndex !== -1) {
                // 在微信环境下，只有当实际时长明显不同于估计时长时才更新
                if (!isWechat || Math.abs(audioFiles[audioIndex].duration - tempAudio.duration) > 5) {
                    audioFiles[audioIndex].duration = tempAudio.duration;
                    audioDurations[newId] = tempAudio.duration;
                }
                
                // 更新时长显示
                updateAudioDurationDisplay(newId);
            }
        });
        
        // 处理加载错误
        tempAudio.addEventListener('error', () => {
            console.warn(`无法加载上传音频时长: ${file.name}`);
            // 确保使用估计时长
            const audioIndex = audioFiles.findIndex(a => a.id === newId);
            if (audioIndex !== -1 && !audioFiles[audioIndex].duration) {
                audioFiles[audioIndex].duration = estimatedDuration;
                audioDurations[newId] = estimatedDuration;
                updateAudioDurationDisplay(newId);
            }
        });
    }
    
    // 重置文件输入
    event.target.value = null;
    
    // 重新渲染音频列表
    renderAudioList();
}

/**
 * 删除音频文件
 * @param {number} audioId - 要删除的音频ID
 */
function deleteAudio(audioId) {
    // 查找要删除的音频索引
    const index = audioFiles.findIndex(audio => audio.id === audioId);
    if (index === -1) return;
    
    // 如果是默认音源，不允许删除
    if (audioFiles[index].isDefault) {
        alert('默认音源不能删除，请从文件夹中管理');
        return;
    }
    
    // 如果正在播放该音频，先停止播放
    if (isPlaying && audioPlayer.src.includes(audioFiles[index].path)) {
        stopPlayback();
    }
    
    // 如果是文件URL，释放资源
    if (audioFiles[index].path.startsWith('blob:')) {
        URL.revokeObjectURL(audioFiles[index].path);
    }
    
    // 从列表中移除
    audioFiles.splice(index, 1);
    
    // 从播放序列中移除所有该ID的实例
    playSequence = playSequence.filter(id => id !== audioId);
    
    // 重新渲染音频列表和播放序列
    renderAudioList();
    renderSequencePreview();
}

/**
 * 更新音频音量
 */
function updateVolume() {
    // 获取滑块值（0-1之间）
    const volume = volumeControl.value;
    
    // 设置音频元素音量
    audioPlayer.volume = volume;
    
    // 更新显示的百分比值
    const percentage = Math.round(volume * 100);
    volumeValue.textContent = `${percentage}%`;
    
    // 存储用户设置的音量到本地存储，下次访问时保持相同音量
    localStorage.setItem('preferredVolume', volume);
}

/**
 * 显示保存播放列表对话框
 */
function showSavePlaylistDialog() {
    // 检查序列是否为空
    if (playSequence.length === 0) {
        alert('播放序列为空，无法保存');
        return;
    }
    
    // 清空输入框
    playlistNameInput.value = '';
    
    // 显示对话框
    savePlaylistDialog.classList.add('visible');
    
    // 聚焦到输入框
    setTimeout(() => {
        playlistNameInput.focus();
    }, 100);
}

/**
 * 保存播放列表
 */
function savePlaylist() {
    const name = playlistNameInput.value.trim();
    
    // 检查名称是否为空
    if (!name) {
        alert('请输入播放列表名称');
        return;
    }
    
    // 获取已保存的播放列表
    const savedPlaylists = getSavedPlaylists();
    
    // 检查是否已存在同名播放列表
    const exists = savedPlaylists.find(p => p.name === name);
    if (exists) {
        const overwrite = confirm(`已存在名为"${name}"的播放列表，是否覆盖？`);
        if (!overwrite) return;
    }
    
    // 创建播放列表对象
    const playlist = {
        name: name,
        date: new Date().toISOString(),
        sequence: [...playSequence]
    };
    
    // 保存到本地存储
    const updatedPlaylists = exists
        ? savedPlaylists.map(p => p.name === name ? playlist : p)
        : [...savedPlaylists, playlist];
    
    localStorage.setItem('savedPlaylists', JSON.stringify(updatedPlaylists));
    
    // 关闭对话框
    savePlaylistDialog.classList.remove('visible');
    
    // 提示成功
    alert(`播放列表"${name}"已保存`);
}

/**
 * 显示加载播放列表对话框
 */
function showLoadPlaylistDialog() {
    // 获取已保存的播放列表
    const savedPlaylists = getSavedPlaylists();
    
    // 检查是否有保存的播放列表
    if (savedPlaylists.length === 0) {
        alert('没有已保存的播放列表');
        return;
    }
    
    // 渲染播放列表
    renderPlaylistList(savedPlaylists);
    
    // 显示对话框
    loadPlaylistDialog.classList.add('visible');
}

/**
 * 渲染播放列表列表
 * @param {Array} playlists - 播放列表数组
 */
function renderPlaylistList(playlists) {
    playlistList.innerHTML = '';
    
    // 按日期排序（最新的在前）
    playlists.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 渲染每个播放列表
    playlists.forEach(playlist => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        
        // 格式化日期
        const date = new Date(playlist.date);
        const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        
        item.innerHTML = `
            <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-date">${dateStr}</div>
            </div>
            <div class="playlist-actions">
                <button class="load-btn" title="加载">加载</button>
                <button class="delete-playlist-btn" title="删除">删除</button>
            </div>
        `;
        
        // 加载按钮点击事件
        const loadBtn = item.querySelector('.load-btn');
        loadBtn.addEventListener('click', () => {
            loadPlaylist(playlist);
        });
        
        // 删除按钮点击事件
        const deleteBtn = item.querySelector('.delete-playlist-btn');
        deleteBtn.addEventListener('click', () => {
            deletePlaylist(playlist.name);
        });
        
        playlistList.appendChild(item);
    });
}

/**
 * 加载播放列表
 * @param {Object} playlist - 播放列表对象
 */
function loadPlaylist(playlist) {
    // 检查播放列表序列的有效性
    const validSequence = [];
    const invalidItems = [];
    
    // 遍历序列中的每一项，检查对应的音频是否存在
    playlist.sequence.forEach(audioId => {
        const audio = audioFiles.find(a => a.id === audioId);
        if (audio) {
            validSequence.push(audioId);
        } else {
            invalidItems.push(audioId);
        }
    });
    
    // 如果有无效项，提示用户
    if (invalidItems.length > 0) {
        alert(`播放列表中的${invalidItems.length}个音频已不存在，将被跳过`);
    }
    
    // 如果没有有效项，提示用户
    if (validSequence.length === 0) {
        alert('播放列表中没有有效音频，无法加载');
        loadPlaylistDialog.classList.remove('visible');
        return;
    }
    
    // 更新播放序列
    playSequence = validSequence;
    
    // 更新播放模式为顺序播放
    playModeSelect.value = 'sequence';
    updatePlayMode();
    
    // 渲染播放序列
    renderSequencePreview();
    
    // 关闭对话框
    loadPlaylistDialog.classList.remove('visible');
    
    // 提示成功
    alert(`播放列表"${playlist.name}"已加载`);
}

/**
 * 删除播放列表
 * @param {string} name - 播放列表名称
 */
function deletePlaylist(name) {
    // 确认删除
    const confirm = window.confirm(`确定要删除播放列表"${name}"吗？`);
    if (!confirm) return;
    
    // 获取已保存的播放列表
    const savedPlaylists = getSavedPlaylists();
    
    // 过滤掉要删除的播放列表
    const updatedPlaylists = savedPlaylists.filter(p => p.name !== name);
    
    // 保存到本地存储
    localStorage.setItem('savedPlaylists', JSON.stringify(updatedPlaylists));
    
    // 重新渲染列表
    renderPlaylistList(updatedPlaylists);
    
    // 如果没有播放列表了，关闭对话框
    if (updatedPlaylists.length === 0) {
        loadPlaylistDialog.classList.remove('visible');
    }
}

/**
 * 获取已保存的播放列表
 * @returns {Array} 播放列表数组
 */
function getSavedPlaylists() {
    const playlistsJson = localStorage.getItem('savedPlaylists');
    return playlistsJson ? JSON.parse(playlistsJson) : [];
}

/**
 * 设置媒体会话控制
 * 允许在锁屏界面控制播放
 */
function setupMediaSession() {
    if ('mediaSession' in navigator) {
        // 设置默认的媒体会话元数据
        navigator.mediaSession.metadata = new MediaMetadata({
            title: '反击噪音狗',
            artist: '正在播放',
            album: '反击噪音应用',
            artwork: [
                { src: 'favicon.ico', sizes: '32x32', type: 'image/x-icon' }
            ]
        });
        
        // 设置播放操作处理程序
        navigator.mediaSession.setActionHandler('play', function() {
            if (isPaused) {
                resumePlayback();
            } else if (!isPlaying) {
                startPlayback();
            }
        });
        
        navigator.mediaSession.setActionHandler('pause', function() {
            if (isPlaying && !isPaused) {
                pausePlayback();
            }
        });
        
        navigator.mediaSession.setActionHandler('stop', function() {
            stopPlayback();
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', function() {
            playPreviousAudio();
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', function() {
            if (playModeSelect.value === 'auto-next') {
                playNextAudio();
            } else if (playModeSelect.value === 'sequence') {
                playNextInSequence();
            }
        });
    }
}

/**
 * 播放上一个音频
 */
function playPreviousAudio() {
    // 如果没有音频正在播放，直接返回
    if (!isPlaying) return;
    
    // 查找当前播放的音频
    const currentSrc = audioPlayer.src;
    const currentAudio = audioFiles.find(a => currentSrc.includes(a.path));
    
    if (!currentAudio) return;
    
    // 找到当前音频在列表中的索引位置
    const currentIndex = audioFiles.findIndex(a => a.id === currentAudio.id);
    
    // 计算上一个音频的索引（循环到末尾）
    const prevIndex = (currentIndex - 1 + audioFiles.length) % audioFiles.length;
    
    // 播放上一个音频
    playSingleAudio(audioFiles[prevIndex].id);
    
    // 重置播放次数计数
    currentPlayCount = 0;
}

/**
 * 设置页面可见性变化监听
 * 处理页面切换到后台时的播放控制
 */
function setupVisibilityChangeListener() {
    document.addEventListener('visibilitychange', () => {
        // 如果页面变为不可见（切换到后台）但音频正在播放
        if (document.visibilityState === 'hidden' && isPlaying && !isPaused) {
            // 尝试获取唤醒锁，防止设备睡眠
            requestWakeLock();
        } else if (document.visibilityState === 'visible') {
            // 页面重新变为可见时，更新UI状态
            if (isPlaying) {
                updatePlayStatus(true, null, true);
            }
            
            // 释放唤醒锁，因为页面现在可见
            releaseWakeLock();
        }
    });
}

/**
 * 请求唤醒锁，防止设备在播放音频时睡眠
 */
async function requestWakeLock() {
    // 仅在支持WakeLock API的浏览器上执行
    if ('wakeLock' in navigator) {
        try {
            // 释放现有的锁（如果有）
            releaseWakeLock();
            
            // 只在音频播放时请求唤醒锁
            if (isPlaying && !isPaused) {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('唤醒锁已激活');
                
                // 监听唤醒锁释放事件
                wakeLock.addEventListener('release', () => {
                    console.log('唤醒锁已释放');
                    wakeLock = null;
                });
            }
        } catch (err) {
            console.error(`无法获取唤醒锁: ${err.message}`);
        }
    }
}

/**
 * 释放唤醒锁
 */
function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release()
            .then(() => {
                console.log('唤醒锁已手动释放');
                wakeLock = null;
            })
            .catch((err) => {
                console.error(`释放唤醒锁错误: ${err.message}`);
            });
    }
}

/**
 * 更新媒体会话元数据
 * @param {Object} audio - 音频对象
 */
function updateMediaSessionMetadata(audio) {
    if ('mediaSession' in navigator) {
        // 显示文件名（不含扩展名）
        const displayName = audio.filename.replace(/\.[^.]+$/, '');
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: displayName,
            artist: '反击噪音狗',
            album: '反击噪音应用',
            artwork: [
                { src: 'favicon.ico', sizes: '32x32', type: 'image/x-icon' }
            ]
        });
        
        // 更新当前播放位置和持续时间
        navigator.mediaSession.setPositionState({
            duration: audioPlayer.duration || 0,
            position: audioPlayer.currentTime || 0,
            playbackRate: audioPlayer.playbackRate || 1
        });
    }
}

/**
 * 设置离线状态监听
 * 检测网络连接状态并通知用户
 */
function setupOfflineListener() {
    // 创建离线通知元素
    const offlineNotification = document.createElement('div');
    offlineNotification.className = 'offline-notification';
    offlineNotification.textContent = '当前处于离线状态，部分功能可能不可用';
    document.body.appendChild(offlineNotification);
    
    // 根据当前网络状态更新UI
    updateOfflineStatus();
    
    // 监听网络状态变化
    window.addEventListener('online', () => {
        isOffline = false;
        updateOfflineStatus();
    });
    
    window.addEventListener('offline', () => {
        isOffline = true;
        updateOfflineStatus();
    });
}

/**
 * 更新离线状态UI
 */
function updateOfflineStatus() {
    const offlineNotification = document.querySelector('.offline-notification');
    if (!offlineNotification) return;
    
    if (isOffline) {
        offlineNotification.classList.add('visible');
        // 5秒后自动隐藏提示
        setTimeout(() => {
            offlineNotification.classList.remove('visible');
        }, 5000);
    } else {
        offlineNotification.classList.remove('visible');
    }
}

/**
 * 检查是否从"添加到主屏幕"启动
 */
function checkStandalone() {
    // iOS设备上的独立模式检测
    const isInStandaloneMode = 
        window.navigator.standalone || 
        window.matchMedia('(display-mode: standalone)').matches;
    
    if (isInStandaloneMode) {
        console.log('应用正在独立模式下运行（从主屏幕启动）');
        // 可以在这里添加针对独立模式的特殊处理
    }
}

/**
 * 初始化分享功能
 */
function initShareFeature() {
    // 设置分享URL
    if (shareUrlInput) {
        shareUrlInput.value = window.location.href;
    }
    
    // 加载QR码库
    loadQRCodeLibrary()
        .then(() => {
            generateQRCode();
        })
        .catch(error => {
            console.error('加载QR码库失败:', error);
            if (qrCodeContainer) {
                qrCodeContainer.textContent = '无法加载二维码';
            }
        });
}

/**
 * 动态加载QRCode库
 * @returns {Promise} 加载完成的Promise
 */
function loadQRCodeLibrary() {
    return new Promise((resolve, reject) => {
        // 检查是否已加载
        if (window.QRCode) {
            resolve();
            return;
        }
        
        // 创建script元素
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
        script.onload = () => resolve();
        script.onerror = (error) => reject(error);
        
        // 添加到文档
        document.head.appendChild(script);
    });
}

/**
 * 生成二维码
 */
function generateQRCode() {
    if (!qrCodeContainer || !window.QRCode) return;
    
    // 清空容器
    qrCodeContainer.innerHTML = '';
    
    // 创建二维码
    try {
        new window.QRCode(qrCodeContainer, {
            text: window.location.href,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.H
        });
    } catch (error) {
        console.error('生成二维码失败:', error);
        qrCodeContainer.textContent = '生成二维码失败';
    }
}

/**
 * 显示分享对话框
 */
function showShareDialog() {
    if (!shareDialog) return;
    
    // 更新分享URL
    if (shareUrlInput) {
        shareUrlInput.value = window.location.href;
    }
    
    // 重新生成二维码
    generateQRCode();
    
    // 显示对话框
    shareDialog.classList.add('visible');
}

/**
 * 复制分享链接
 */
function copyShareUrl() {
    if (!shareUrlInput) return;
    
    // 选择文本
    shareUrlInput.select();
    shareUrlInput.setSelectionRange(0, 99999); // 兼容移动设备
    
    // 复制到剪贴板
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            // 显示复制成功提示
            const originalText = copyShareUrlBtn.textContent;
            copyShareUrlBtn.textContent = '已复制';
            copyShareUrlBtn.disabled = true;
            
            // 2秒后恢复按钮文字
            setTimeout(() => {
                copyShareUrlBtn.textContent = originalText;
                copyShareUrlBtn.disabled = false;
            }, 2000);
        } else {
            console.error('复制失败');
            alert('复制失败，请手动长按选择复制');
        }
    } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动长按选择复制');
    }
    
    // 取消选择
    window.getSelection().removeAllRanges();
    
    // 尝试使用新的Clipboard API（更现代的方法）
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrlInput.value)
            .catch(err => {
                console.error('Clipboard API复制失败:', err);
            });
    }
}

/**
 * 初始化音频输出检测
 * 检测AirPlay连接状态并设置WebAudio
 */
function initAudioOutput() {
    // 初始化WebAudio Context（仅在需要时）
    if (!audioContext && window.AudioContext) {
        try {
            audioContext = new AudioContext();
            console.log('WebAudio Context初始化成功');
        } catch (e) {
            console.warn('WebAudio Context初始化失败:', e);
        }
    }
    
    // 检测设备是否支持mediaDevices API
    if (navigator.mediaDevices && navigator.mediaDevices.ondevicechange !== undefined) {
        // 设置设备变化监听
        navigator.mediaDevices.ondevicechange = checkAudioOutputDevices;
        
        // 首次检查可用设备
        checkAudioOutputDevices();
    } else {
        console.log('当前浏览器不支持mediaDevices API，无法检测AirPlay连接');
        
        // 在iOS设备上添加备用检测
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            // iOS设备上使用WebAudio作为最佳实践
            setupWebAudioForIOS();
        }
    }
}

/**
 * 检查音频输出设备，检测AirPlay连接
 */
async function checkAudioOutputDevices() {
    // 检查是否支持获取设备列表
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.log('当前浏览器不支持enumerateDevices');
        return;
    }
    
    try {
        // 更新状态为"正在检测"
        updateAirplayStatus('检测中', 'connecting');
        
        // 获取所有设备
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // 筛选出音频输出设备
        const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
        
        // 查找AirPlay设备（通常名称中包含"AirPlay"或特定标识）
        const airplayDevice = audioOutputDevices.find(device => 
            device.label.includes('AirPlay') || 
            device.label.includes('Apple TV') ||
            device.label.includes('外部音频设备')
        );
        
        if (airplayDevice) {
            console.log('检测到AirPlay设备:', airplayDevice.label);
            airPlayDevice = airplayDevice;
            isAirPlayConnected = true;
            updateAirplayStatus('已连接', 'connected');
            currentAudioOutput.textContent = airplayDevice.label;
            
            // 如果当前有音频在播放，尝试切换到AirPlay设备
            if (isPlaying && !isPaused) {
                switchToAirPlayOutput();
            }
        } else {
            console.log('未检测到AirPlay设备');
            airPlayDevice = null;
            isAirPlayConnected = false;
            updateAirplayStatus('未连接', '');
            currentAudioOutput.textContent = '手机扬声器';
            
            // 如果之前使用的是AirPlay，现在切换回默认设备
            if (useWebAudio) {
                switchToDefaultOutput();
            }
        }
    } catch (err) {
        console.error('检测音频设备时出错:', err);
        updateAirplayStatus('检测失败', '');
    }
}

/**
 * 更新AirPlay状态显示
 * @param {string} text - 状态文本
 * @param {string} className - 状态类名
 */
function updateAirplayStatus(text, className) {
    if (airplayStatus) {
        airplayStatus.textContent = text;
        airplayStatus.className = 'status-indicator';
        if (className) {
            airplayStatus.classList.add(className);
        }
    }
}

/**
 * 为iOS设备设置WebAudio
 * 在iOS上WebAudio API通常更可靠
 */
function setupWebAudioForIOS() {
    // 仅在iOS设备上执行
    if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        return;
    }
    
    console.log('iOS设备检测，设置WebAudio');
    
    // 在用户交互后初始化AudioContext
    document.addEventListener('touchstart', initIOSAudioContext, { once: true });
    
    // 显示iOS专用提示
    const note = document.createElement('p');
    note.className = 'note ios-audio-note';
    note.textContent = '注意: iOS设备需要手动切换AirPlay输出';
    audioOutputGroup.appendChild(note);
    
    // 更改按钮文本
    if (audioOutputBtn) {
        audioOutputBtn.textContent = '显示AirPlay控制';
    }
}

/**
 * 初始化iOS AudioContext
 * 需要在用户交互后初始化
 */
function initIOSAudioContext() {
    if (!audioContext && window.AudioContext) {
        try {
            audioContext = new AudioContext();
            console.log('iOS WebAudio Context初始化成功');
        } catch (e) {
            console.warn('iOS WebAudio Context初始化失败:', e);
        }
    }
} 