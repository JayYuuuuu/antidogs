// 缓存名称 - 更新版本号以触发缓存更新
const CACHE_NAME = 'anti-noise-dog-v4';

// 需要缓存的资源列表
const CACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './favicon.ico',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/share-image.png',  // 微信分享图片
  './icons/splash-640x1136.png',
  './icons/splash-750x1334.png',
  './icons/splash-1242x2208.png',
  './icons/splash-1125x2436.png',
  './icons/splash-1242x2688.png'
  // 不缓存音频文件和音频列表配置，因为需要实时更新
];

// 安装Service Worker时缓存资源
self.addEventListener('install', event => {
  console.log('Service Worker: 正在安装');
  
  // 等待缓存完成
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 打开缓存');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // 强制激活
  );
});

// 激活Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: 已激活');
  
  // 清理旧缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: 清理旧缓存', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  
  // 确保Service Worker立即控制所有页面
  return self.clients.claim();
});

// 拦截请求并从缓存中提供响应
self.addEventListener('fetch', event => {
  // 跳过不支持的请求，如chrome-extension://
  if (!event.request.url.startsWith('http')) return;
  
  // 忽略POST请求等
  if (event.request.method !== 'GET') return;
  
  // 对于audiolist.json文件，始终使用网络请求，失败后才使用缓存
  if (event.request.url.includes('audiolist.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 克隆响应（因为响应是流，只能使用一次）
          const responseToCache = response.clone();
          
          // 更新缓存中的版本
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        })
        .catch(() => {
          console.log('从缓存加载audiolist.json');
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 音频文件使用网络优先策略
  if (event.request.url.includes('/music/') || 
      event.request.url.match(/\.(mp3|wav|ogg)$/i)) {
    // 网络优先，失败后使用缓存
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 如果是新的音频文件，也更新缓存
          if (!event.request.url.endsWith('.json')) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // 对于其他资源，使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果找到缓存的响应，则返回
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 否则向网络发出请求
        return fetch(event.request)
          .then(response => {
            // 如果响应无效，直接返回
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应（因为响应是流，只能使用一次）
            const responseToCache = response.clone();
            
            // 打开缓存并存储响应
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
  );
});

// 处理后台同步
self.addEventListener('sync', event => {
  if (event.tag === 'sync-playlists') {
    // 在这里处理播放列表同步（如果需要）
  }
});

// 处理推送通知
self.addEventListener('push', event => {
  const title = '反击噪音狗';
  const options = {
    body: event.data.text() || '有新的内容可用',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
}); 