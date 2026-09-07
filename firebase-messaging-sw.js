// ĐOÀN THƯỢNG BADMINTON - Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAQTqFJXcWD0XwozL5Y_O-rFVx4e7mXSzU",
  authDomain: "doanthuongbadminton.firebaseapp.com",
  databaseURL: "https://doanthuongbadminton-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "doanthuongbadminton",
  storageBucket: "doanthuongbadminton.firebasestorage.app",
  messagingSenderId: "446383872362",
  appId: "1:446383872362:web:797cd099cad83d0977ed13",
  measurementId: "G-Y1KN5CSW5G"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload && payload.data ? payload.data : {};
  const title = data.title || '💬 Tin nhắn mới';
  const body = data.body || 'Bạn có tin nhắn mới.';

  self.registration.showNotification(title, {
    body,
    icon: './favicon.svg',
    badge: './favicon.svg',
    tag: data.roomKey ? `chat_${data.roomKey}` : 'chat_message',
    renotify: true,
    data: {
      sender: data.sender || '',
      roomKey: data.roomKey || ''
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const sender = event.notification.data && event.notification.data.sender;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          try {
            client.postMessage({ type: 'OPEN_CHAT', sender: sender || '' });
          } catch (e) {}
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow('./index.html#friends');
    })
  );
});
