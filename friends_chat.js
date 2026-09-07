/**
 * ĐOÀN THƯỢNG BADMINTON - FRIENDS & REALTIME DIRECT CHAT
 * Kết bạn giữa các học sinh/thành viên & Nhắn tin trực tuyến thời gian thực
 */

class FriendsChatManager {
  constructor() {
    this.activeFriendTab = 'friends';
    this.activeChatPartner = null;

    this.users = {};
    this.friends = {};
    this.chats = {};
    this.friendRequests = {};

    // ================================
    // HỆ THỐNG THÔNG BÁO TIN NHẮN
    // ================================

    this.chatDataInitialized = false;
    this.seenMessageIds = new Set();
    this.notificationPermissionRequested = false;
    this.audioContext = null;

    this.init();
  }

  init() {

    window.realtimeDB.listen('users', (data) => {
      this.users = data || {};
      this.render();
    });

    window.realtimeDB.listen('friends', (data) => {
      this.friends = data || {};
      this.render();

      if (window.doublesManager) {
        window.doublesManager.updateFriendsSelect();
      }
    });

    window.realtimeDB.listen('friendRequests', (data) => {
      this.friendRequests = data || {};
      this.render();
    });

    // ================================
    // CHAT REALTIME
    // ================================

    window.realtimeDB.listen('chat', (data) => {

      const newChatData = data || {};

      // Lần đầu Firebase trả dữ liệu:
      // chỉ ghi nhận các tin nhắn cũ,
      // KHÔNG phát thông báo hàng loạt.
      if (!this.chatDataInitialized) {

        this.seenMessageIds.clear();

        Object.values(newChatData).forEach(room => {

          if (!room || typeof room !== 'object') {
            return;
          }

          Object.values(room).forEach(message => {

            if (message && message.id) {
              this.seenMessageIds.add(
                String(message.id)
              );
            }
          });
        });

        this.chatDataInitialized = true;

      } else {

        // Kiểm tra tin nhắn mới
        this.checkForNewMessages(newChatData);
      }

      this.chats = newChatData;

      if (this.activeChatPartner) {
        this.renderChatMessages();
      }

      this.renderFriendsList();
    });
  }

  // =========================================================
  // XIN QUYỀN THÔNG BÁO TRÌNH DUYỆT
  // =========================================================

  async requestNotificationPermission() {

    if (
      typeof Notification === 'undefined'
    ) {
      return;
    }

    if (
      Notification.permission !== 'default'
    ) {
      return;
    }

    if (this.notificationPermissionRequested) {
      return;
    }

    this.notificationPermissionRequested = true;

    try {
      await Notification.requestPermission();
    } catch (e) {
      console.log(
        'Không thể xin quyền thông báo:',
        e
      );
    }
  }

  // =========================================================
  // TẠO ÂM THANH THÔNG BÁO
  // Không cần file mp3
  // =========================================================

  playNotificationSound() {

    try {

      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioCtx) {
        return;
      }

      if (!this.audioContext) {
        this.audioContext =
          new AudioCtx();
      }

      const ctx =
        this.audioContext;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now =
        ctx.currentTime;

      // Tiếng "ting" 2 nốt
      const oscillator =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      oscillator.type = 'sine';

      oscillator.frequency.setValueAtTime(
        880,
        now
      );

      oscillator.frequency.setValueAtTime(
        1174.66,
        now + 0.12
      );

      gain.gain.setValueAtTime(
        0.0001,
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        0.18,
        now + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.45
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.5);

    } catch (e) {

      console.log(
        'Không phát được âm thanh:',
        e
      );
    }
  }

  // =========================================================
  // KIỂM TRA TIN NHẮN MỚI
  // =========================================================

  checkForNewMessages(newChatData) {

    if (
      !window.authManager ||
      !window.authManager.isLoggedIn()
    ) {
      return;
    }

    const me =
      window.authManager.currentUser.username;

    Object.entries(newChatData).forEach(
      ([roomKey, room]) => {

        if (
          !room ||
          typeof room !== 'object'
        ) {
          return;
        }

        Object.values(room).forEach(message => {

          if (
            !message ||
            !message.id
          ) {
            return;
          }

          const messageId =
            String(message.id);

          // Tin nhắn đã biết rồi -> bỏ qua
          if (
            this.seenMessageIds.has(
              messageId
            )
          ) {
            return;
          }

          // Đánh dấu đã biết
          this.seenMessageIds.add(
            messageId
          );

          // Tin nhắn của chính mình -> không báo
          if (
            message.sender === me
          ) {
            return;
          }

          // Đây là tin nhắn mới từ người khác
          this.handleIncomingMessage(
            message,
            roomKey
          );
        });
      }
    );
  }

  // =========================================================
  // XỬ LÝ KHI CÓ TIN NHẮN MỚI
  // =========================================================

  handleIncomingMessage(
    message,
    roomKey
  ) {

    const senderUsername =
      message.sender;

    const sender =
      this.users[senderUsername] || {};

    const senderName =
      sender.fullName ||
      senderUsername ||
      'Bạn';

    let preview = '';

    if (
      message.type === 'image'
    ) {

      preview =
        '📷 Đã gửi một ảnh';

    } else {

      preview =
        String(
          message.text || 'Tin nhắn mới'
        );

      // Không để preview quá dài
      if (preview.length > 80) {
        preview =
          preview.substring(0, 80) +
          '...';
      }
    }

    // ==========================================
    // ÂM THANH
    // ==========================================

    this.playNotificationSound();

    // ==========================================
    // TOAST TRÊN WEBSITE
    // ==========================================

    if (
      window.app &&
      typeof window.app.showToast ===
        'function'
    ) {

      window.app.showToast(
        `💬 ${senderName}: ${preview}`,
        'info'
      );
    }

    // ==========================================
    // THÔNG BÁO CỦA TRÌNH DUYỆT / WINDOWS
    // ==========================================

    this.showBrowserNotification(
      senderName,
      preview,
      senderUsername
    );
  }

  // =========================================================
  // THÔNG BÁO TRÌNH DUYỆT
  // =========================================================

  showBrowserNotification(
    senderName,
    preview,
    senderUsername
  ) {

    if (
      typeof Notification === 'undefined'
    ) {
      return;
    }

    if (
      Notification.permission !== 'granted'
    ) {
      return;
    }

    try {

      const notification =
        new Notification(
          `💬 Tin nhắn từ ${senderName}`,
          {
            body: preview,
            icon: './favicon.svg',
            tag:
              'chat_' +
              senderUsername,
            renotify: true
          }
        );

      notification.onclick = () => {

        window.focus();

        if (
          senderUsername
        ) {

          this.openChatWith(
            senderUsername
          );
        }

        notification.close();
      };

      setTimeout(() => {

        try {
          notification.close();
        } catch (e) {}

      }, 6000);

    } catch (e) {

      console.log(
        'Không thể tạo browser notification:',
        e
      );
    }
  }

  // =========================================================
  // TAB BẠN BÈ
  // =========================================================

  setFriendTab(tab) {

    this.activeFriendTab = tab;

    document
      .querySelectorAll(
        '.social-tab-btn'
      )
      .forEach(b => {

        b.classList.toggle(
          'active',
          b.dataset.tab === tab
        );
      });

    this.render();
  }

  // =========================================================
  // GỬI LỜI MỜI KẾT BẠN
  // =========================================================

  async sendFriendRequest(
    targetUsername
  ) {

    if (
      !window.authManager.isLoggedIn()
    ) {

      throw new Error(
        "Vui lòng đăng nhập trước!"
      );
    }

    const me =
      window.authManager.currentUser
        .username;

    if (
      targetUsername === me
    ) {

      throw new Error(
        "Không thể tự kết bạn với chính mình!"
      );
    }

    const reqId =
      `freq_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 4)}`;

    const req = {

      id: reqId,

      senderUsername: me,

      senderName:
        window.authManager
          .currentUser
          .fullName,

      senderClass:
        window.authManager
          .currentUser
          .classGroup,

      receiverUsername:
        targetUsername,

      status: 'pending',

      createdAt:
        new Date().toISOString()
    };

    await window.realtimeDB.set(
      `friendRequests/${reqId}`,
      req
    );

    window.app.showToast(
      "Đã gửi lời mời kết bạn!",
      "success"
    );

    return true;
  }

  // =========================================================
  // CHẤP NHẬN KẾT BẠN
  // =========================================================

  async acceptFriendRequest(
    reqId
  ) {

    const req =
      this.friendRequests[reqId];

    if (!req) return;

    const u1 =
      req.senderUsername;

    const u2 =
      req.receiverUsername;

    await window.realtimeDB.update(
      `friends/${u1}`,
      {
        [u2]: 'accepted'
      }
    );

    await window.realtimeDB.update(
      `friends/${u2}`,
      {
        [u1]: 'accepted'
      }
    );

    await window.realtimeDB.update(
      `friendRequests/${reqId}`,
      {
        status: 'accepted'
      }
    );

    window.app.showToast(
      "Đã trở thành bạn bè!",
      "success"
    );
  }

  // =========================================================
  // TỪ CHỐI KẾT BẠN
  // =========================================================

  async rejectFriendRequest(
    reqId
  ) {

    await window.realtimeDB.update(
      `friendRequests/${reqId}`,
      {
        status: 'rejected'
      }
    );
  }

  // =========================================================
  // MỞ CHAT
  // =========================================================

  openChatWith(
    friendUsername
  ) {

    this.activeChatPartner =
      friendUsername;

    // Người dùng đã click vào chat,
    // có thể xin quyền thông báo.
    this.requestNotificationPermission();

    // Khởi động AudioContext sau thao tác người dùng
    try {

      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;

      if (
        AudioCtx &&
        !this.audioContext
      ) {

        this.audioContext =
          new AudioCtx();
      }

      if (
        this.audioContext &&
        this.audioContext.state ===
          'suspended'
      ) {

        this.audioContext
          .resume()
          .catch(() => {});
      }

    } catch (e) {}

    const partner =
      this.users[friendUsername];

    if (!partner) return;

    const chatWindow =
      document.getElementById(
        'chat-window-container'
      );

    const noChatPlaceholder =
      document.getElementById(
        'no-chat-placeholder'
      );

    const partnerNameEl =
      document.getElementById(
        'chat-partner-name'
      );

    const partnerMetaEl =
      document.getElementById(
        'chat-partner-meta'
      );

    const partnerAvatarEl =
      document.getElementById(
        'chat-partner-avatar'
      );

    if (noChatPlaceholder) {

      noChatPlaceholder.style.display =
        'none';
    }

    if (chatWindow) {

      chatWindow.style.display =
        'flex';
    }

    if (partnerNameEl) {

      partnerNameEl.textContent =
        partner.fullName;
    }

    if (partnerMetaEl) {

      partnerMetaEl.textContent =
        `Lớp ${partner.classGroup} • @${partner.username}`;
    }

    if (partnerAvatarEl) {

      partnerAvatarEl.textContent =
        partner.fullName
          .charAt(0)
          .toUpperCase();
    }

    this.renderChatMessages();
    this.renderFriendsList();
  }

  // =========================================================
  // TẠO CHAT ROOM KEY
  // =========================================================

  getChatRoomKey(
    u1,
    u2
  ) {

    return [
      u1,
      u2
    ]
      .sort()
      .join('__');
  }

  // =========================================================
  // GỬI TIN NHẮN TEXT
  // =========================================================

  async sendMessage(
    text
  ) {

    if (
      !window.authManager.isLoggedIn() ||
      !this.activeChatPartner
    ) {
      return;
    }

    const cleanText =
      String(text || '').trim();

    if (!cleanText) return;

    const me =
      window.authManager.currentUser
        .username;

    const partner =
      this.activeChatPartner;

    const roomKey =
      this.getChatRoomKey(
        me,
        partner
      );

    const msgId =
      `msg_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    const newMsg = {

      id: msgId,

      sender: me,

      text: cleanText,

      type: 'text',

      timestamp:
        new Date().toISOString()
    };

    try {

      await window.realtimeDB.set(
        `chat/${roomKey}/${msgId}`,
        newMsg
      );

      const msgArea =
        document.getElementById(
          'chat-messages-area'
        );

      if (msgArea) {

        setTimeout(() => {

          msgArea.scrollTop =
            msgArea.scrollHeight;

        }, 100);
      }

    } catch (e) {

      console.error(
        'sendMessage error:',
        e
      );

      if (
        window.app &&
        window.app.showToast
      ) {

        window.app.showToast(
          'Không thể gửi tin nhắn: ' +
          (
            e.message ||
            'Lỗi không xác định'
          ),
          'error'
        );
      }
    }
  }

  // =========================================================
  // GỬI ẢNH
  // =========================================================

  async sendImageMessage(
    file
  ) {

    if (
      !window.authManager.isLoggedIn() ||
      !this.activeChatPartner
    ) {
      return;
    }

    if (!file) return;

    // Giới hạn 5MB
    if (
      file.size >
      5 * 1024 * 1024
    ) {

      window.app.showToast(
        'Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB.',
        'error'
      );

      return;
    }

    // Kiểm tra định dạng
    if (
      !file.type ||
      !file.type.startsWith('image/')
    ) {

      window.app.showToast(
        'File được chọn không phải là ảnh.',
        'error'
      );

      return;
    }

    const me =
      window.authManager.currentUser
        .username;

    const partner =
      this.activeChatPartner;

    const roomKey =
      this.getChatRoomKey(
        me,
        partner
      );

    window.app.showToast(
      'Đang gửi ảnh...',
      'info'
    );

    try {

      const imageData =
        await this._compressImage(
          file,
          900,
          0.78
        );

      if (
        !imageData ||
        !imageData.startsWith(
          'data:image/'
        )
      ) {

        throw new Error(
          'Không thể xử lý ảnh!'
        );
      }

      const msgId =
        `msg_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      const newMsg = {

        id: msgId,

        sender: me,

        type: 'image',

        // Lưu cả 2 để tương thích
        imageData: imageData,

        image: imageData,

        text: '',

        timestamp:
          new Date().toISOString()
      };

      await window.realtimeDB.set(
        `chat/${roomKey}/${msgId}`,
        newMsg
      );

      window.app.showToast(
        'Đã gửi ảnh!',
        'success'
      );

      const msgArea =
        document.getElementById(
          'chat-messages-area'
        );

      if (msgArea) {

        setTimeout(() => {

          msgArea.scrollTop =
            msgArea.scrollHeight;

        }, 100);
      }

    } catch (e) {

      console.error(
        'sendImageMessage error:',
        e
      );

      window.app.showToast(
        'Lỗi khi gửi ảnh: ' +
        (
          e.message ||
          'Lỗi không xác định'
        ),
        'error'
      );
    }
  }

  // =========================================================
  // NÉN ẢNH
  // =========================================================

  _compressImage(
    file,
    maxDim = 900,
    quality = 0.78
  ) {

    return new Promise(
      (resolve, reject) => {

        const reader =
          new FileReader();

        reader.onload = (e) => {

          const img =
            new Image();

          img.onload = () => {

            try {

              let w =
                img.naturalWidth ||
                img.width;

              let h =
                img.naturalHeight ||
                img.height;

              if (!w || !h) {

                reject(
                  new Error(
                    'Không đọc được kích thước ảnh!'
                  )
                );

                return;
              }

              if (
                w > maxDim ||
                h > maxDim
              ) {

                if (w > h) {

                  h =
                    Math.round(
                      h * maxDim / w
                    );

                  w = maxDim;

                } else {

                  w =
                    Math.round(
                      w * maxDim / h
                    );

                  h = maxDim;
                }
              }

              const canvas =
                document.createElement(
                  'canvas'
                );

              canvas.width =
                Math.max(1, w);

              canvas.height =
                Math.max(1, h);

              const ctx =
                canvas.getContext(
                  '2d'
                );

              if (!ctx) {

                reject(
                  new Error(
                    'Trình duyệt không hỗ trợ Canvas!'
                  )
                );

                return;
              }

              // Nền trắng
              ctx.fillStyle =
                '#ffffff';

              ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
              );

              ctx.drawImage(
                img,
                0,
                0,
                w,
                h
              );

              const result =
                canvas.toDataURL(
                  'image/jpeg',
                  quality
                );

              if (
                !result ||
                result === 'data:,'
              ) {

                reject(
                  new Error(
                    'Không tạo được ảnh!'
                  )
                );

                return;
              }

              resolve(result);

            } catch (error) {

              reject(error);
            }
          };

          img.onerror = () => {

            reject(
              new Error(
                'Không thể đọc ảnh!'
              )
            );
          };

          img.src =
            e.target.result;
        };

        reader.onerror = () => {

          reject(
            new Error(
              'Không thể đọc file ảnh!'
            )
          );
        };

        reader.readAsDataURL(
          file
        );
      }
    );
  }

  // =========================================================
  // HIỂN THỊ TIN NHẮN
  // =========================================================

  renderChatMessages() {

    const msgArea =
      document.getElementById(
        'chat-messages-area'
      );

    if (
      !msgArea ||
      !this.activeChatPartner ||
      !window.authManager.isLoggedIn()
    ) {
      return;
    }

    const me =
      window.authManager.currentUser
        .username;

    const roomKey =
      this.getChatRoomKey(
        me,
        this.activeChatPartner
      );

    const roomMessages =
      this.chats[roomKey] || {};

    const msgList =
      Object.values(
        roomMessages
      );

    msgList.sort(
      (a, b) =>
        new Date(a.timestamp) -
        new Date(b.timestamp)
    );

    if (
      msgList.length === 0
    ) {

      msgArea.innerHTML = `
        <div
          style="
            text-align:center;
            color:#94a3b8;
            margin:auto;
            padding:20px;
          "
        >

          <i
            class="fa-regular fa-comments"
            style="
              font-size:2.5rem;
              margin-bottom:8px;
            "
          ></i>

          <p>
            Chưa có tin nhắn nào.
            Hãy gửi lời chào đến bạn bè!
          </p>

        </div>
      `;

      return;
    }

    let html = '';

    msgList.forEach(m => {

      const isMe =
        m.sender === me;

      const timeStr =
        new Date(
          m.timestamp
        ).toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit'
          }
        );

      // Hỗ trợ cả imageData và image
      const imageSrc =
        m.imageData ||
        m.image ||
        '';

      if (
        m.type === 'image' &&
        imageSrc
      ) {

        html += `
          <div
            class="message-bubble ${
              isMe
                ? 'outgoing'
                : 'incoming'
            }"
          >

            <img
              class="message-img"
              src="${imageSrc}"
              alt="Ảnh"
              loading="lazy"
              decoding="async"
              style="
                display:block;
                max-width:280px;
                width:auto;
                height:auto;
                max-height:350px;
                object-fit:contain;
                border-radius:12px;
                cursor:pointer;
              "
              onclick="
                const box =
                  document.getElementById(
                    'chat-lightbox'
                  );

                const img =
                  document.getElementById(
                    'chat-lightbox-img'
                  );

                if (box && img) {
                  img.src = this.src;
                  box.classList.add('open');
                  box.style.display = 'flex';
                }
              "
              onerror="
                this.style.display='none';

                if (
                  this.nextElementSibling
                ) {
                  this.nextElementSibling.insertAdjacentHTML(
                    'beforebegin',
                    '<div style=&quot;color:#ef4444;padding:8px;&quot;>Không thể tải ảnh</div>'
                  );
                }
              "
            >

            <div class="message-time">
              ${timeStr}
            </div>

          </div>
        `;

      } else {

        html += `
          <div
            class="message-bubble ${
              isMe
                ? 'outgoing'
                : 'incoming'
            }"
          >

            <div>
              ${this.escapeHtml(
                m.text || ''
              )}
            </div>

            <div class="message-time">
              ${timeStr}
            </div>

          </div>
        `;
      }
    });

    msgArea.innerHTML =
      html;

    msgArea.scrollTop =
      msgArea.scrollHeight;
  }

  // =========================================================
  // ESCAPE HTML
  // =========================================================

  escapeHtml(str) {

    if (
      str === null ||
      str === undefined
    ) {
      return '';
    }

    return String(str)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  // =========================================================
  // RENDER
  // =========================================================

  render() {

    const container =
      document.getElementById(
        'friends-sidebar-content'
      );

    if (!container) {
      return;
    }

    if (
      !window.authManager.isLoggedIn()
    ) {

      container.innerHTML = `
        <div
          style="
            padding:20px;
            text-align:center;
            color:#94a3b8;
            font-size:0.88rem;
          "
        >

          <i
            class="fa-solid fa-lock"
            style="
              font-size:2rem;
              margin-bottom:8px;
              color:#cbd5e1;
            "
          ></i>

          <p>
            Vui lòng đăng nhập để xem
            danh sách bạn bè và trò chuyện
            trực tuyến.
          </p>

        </div>
      `;

      return;
    }

    if (
      this.activeFriendTab ===
      'friends'
    ) {

      this.renderFriendsList();

    } else if (
      this.activeFriendTab ===
      'find'
    ) {

      this.renderFindFriendsList();

    } else if (
      this.activeFriendTab ===
      'requests'
    ) {

      this.renderRequestsList();
    }
  }

  // =========================================================
  // DANH SÁCH BẠN BÈ
  // =========================================================

  renderFriendsList() {

    const container =
      document.getElementById(
        'friends-sidebar-content'
      );

    if (
      !container ||
      !window.authManager.isLoggedIn()
    ) {
      return;
    }

    const myUsername =
      window.authManager.currentUser
        .username;

    const myFriendsMap =
      this.friends[
        myUsername
      ] || {};

    let list = [];

    for (
      let friendUname in myFriendsMap
    ) {

      if (
        myFriendsMap[friendUname] ===
        'accepted'
      ) {

        const u =
          this.users[
            friendUname
          ];

        if (u) {
          list.push(u);
        }
      }
    }

    if (
      list.length === 0
    ) {

      container.innerHTML = `
        <div
          style="
            padding:24px 16px;
            text-align:center;
            color:#94a3b8;
            font-size:0.85rem;
          "
        >

          <i
            class="fa-solid fa-user-group"
            style="
              font-size:2rem;
              margin-bottom:8px;
              color:#cbd5e1;
            "
          ></i>

          <p>
            Bạn chưa có bạn bè nào.
          </p>

          <button
            class="btn btn-primary btn-sm"
            style="margin-top:10px;"
            onclick="
              friendsChatManager.setFriendTab(
                'find'
              )
            "
          >
            Tìm bạn ngay
          </button>

        </div>
      `;

      return;
    }

    let html = '';

    list.forEach(friend => {

      const isActive =
        this.activeChatPartner ===
        friend.username;

      const name =
        friend.fullName ||
        friend.username ||
        'U';

      const initial =
        name
          .charAt(0)
          .toUpperCase();

      const isOnline =
        !!friend.isOnline;

      html += `
        <div
          class="friend-item ${
            isActive
              ? 'active'
              : ''
          }"
          onclick="
            friendsChatManager.openChatWith(
              '${friend.username}'
            )
          "
        >

          <div class="friend-avatar-wrap">

            <div
              class="player-avatar"
              style="
                width:38px;
                height:38px;
                font-size:0.85rem;
              "
            >
              ${initial}
            </div>

            <span
              class="
                online-indicator
                ${
                  isOnline
                    ? ''
                    : 'offline'
                }
              "
            ></span>

          </div>

          <div class="friend-info">

            <div class="friend-name">
              ${this.escapeHtml(
                name
              )}
            </div>

            <div class="friend-last-msg">
              Lớp ${
                this.escapeHtml(
                  friend.classGroup ||
                  ''
                )
              }
              • @${this.escapeHtml(
                friend.username ||
                ''
              )}
            </div>

          </div>

        </div>
      `;
    });

    container.innerHTML =
      html;
  }

  // =========================================================
  // TÌM BẠN
  // =========================================================

  renderFindFriendsList() {

    const container =
      document.getElementById(
        'friends-sidebar-content'
      );

    if (
      !container ||
      !window.authManager.isLoggedIn()
    ) {
      return;
    }

    const myUsername =
      window.authManager.currentUser
        .username;

    const myFriendsMap =
      this.friends[
        myUsername
      ] || {};

    let html = `
      <div
        style="
          padding:8px 12px;
        "
      >

        <input
          type="text"
          id="find-friend-search-input"
          class="form-input"
          placeholder="Tìm tên hoặc lớp..."
          oninput="
            friendsChatManager.filterFindList(
              this.value
            )
          "
          style="
            padding:6px 10px;
            font-size:0.82rem;
            margin-bottom:8px;
          "
        >

        <div id="find-friends-results">
    `;

    for (
      let uname in this.users
    ) {

      if (
        uname !== myUsername
      ) {

        const u =
          this.users[uname];

        const isFriend =
          myFriendsMap[uname] ===
          'accepted';

        let isPending =
          false;

        for (
          let rId in this.friendRequests
        ) {

          const r =
            this.friendRequests[rId];

          if (
            r.senderUsername ===
              myUsername &&
            r.receiverUsername ===
              uname &&
            r.status ===
              'pending'
          ) {

            isPending = true;
            break;
          }
        }

        const fullName =
          u.fullName ||
          u.username ||
          'U';

        html += `
          <div
            class="friend-item"
            style="
              cursor:default;
            "
          >

            <div
              class="player-avatar"
              style="
                width:36px;
                height:36px;
                font-size:0.8rem;
              "
            >
              ${fullName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div class="friend-info">

              <div class="friend-name">
                ${this.escapeHtml(
                  fullName
                )}
              </div>

              <div class="friend-last-msg">
                Lớp ${
                  this.escapeHtml(
                    u.classGroup ||
                    ''
                  )
                }
                • @${this.escapeHtml(
                  u.username ||
                  ''
                )}
              </div>

            </div>

            <div>

              ${
                isFriend

                  ? `
                    <span
                      class="tag-class"
                      style="
                        background:#dcfce7;
                        color:#15803d;
                        font-size:0.7rem;
                      "
                    >
                      Bạn bè
                    </span>
                  `

                  : (

                    isPending

                      ? `
                        <span
                          class="tag-class"
                          style="
                            background:#fef3c7;
                            color:#b45309;
                            font-size:0.7rem;
                          "
                        >
                          Đã gửi
                        </span>
                      `

                      : `
                        <button
                          class="btn btn-primary btn-sm"
                          style="
                            font-size:0.72rem;
                            padding:4px 8px;
                          "
                          onclick="
                            friendsChatManager.sendFriendRequest(
                              '${u.username}'
                            )
                          "
                        >
                          <i class="fa-solid fa-user-plus"></i>
                          Kết bạn
                        </button>
                      `
                  )
              }

            </div>

          </div>
        `;
      }
    }

    html += `
        </div>
      </div>
    `;

    container.innerHTML =
      html;
  }

  // =========================================================
  // LỌC TÌM BẠN
  // =========================================================

  filterFindList(
    query
  ) {

    const q =
      String(
        query || ''
      )
        .toLowerCase()
        .trim();

    const items =
      document.querySelectorAll(
        '#find-friends-results .friend-item'
      );

    items.forEach(el => {

      const text =
        el.textContent
          .toLowerCase();

      el.style.display =
        text.includes(q)
          ? 'flex'
          : 'none';
    });
  }

  // =========================================================
  // DANH SÁCH LỜI MỜI
  // =========================================================

  renderRequestsList() {

    const container =
      document.getElementById(
        'friends-sidebar-content'
      );

    if (
      !container ||
      !window.authManager.isLoggedIn()
    ) {
      return;
    }

    const myUsername =
      window.authManager.currentUser
        .username;

    let html = '';

    let count = 0;

    for (
      let rId in this.friendRequests
    ) {

      const r =
        this.friendRequests[rId];

      if (
        r.receiverUsername ===
          myUsername &&
        r.status ===
          'pending'
      ) {

        count++;

        html += `
          <div
            class="pair-request-card"
            style="
              margin:8px;
            "
          >

            <div>

              <strong
                style="
                  font-size:0.88rem;
                  color:var(--bwf-navy-dark);
                "
              >
                ${this.escapeHtml(
                  r.senderName ||
                  ''
                )}
              </strong>

              <div
                style="
                  font-size:0.75rem;
                  color:#64748b;
                "
              >
                Lớp ${
                  this.escapeHtml(
                    r.senderClass ||
                    ''
                  )
                }
              </div>

            </div>

            <div
              style="
                display:flex;
                gap:4px;
              "
            >

              <button
                class="btn btn-success btn-sm"
                style="
                  padding:4px 8px;
                  font-size:0.75rem;
                "
                onclick="
                  friendsChatManager.acceptFriendRequest(
                    '${r.id}'
                  )
                "
              >
                Đồng ý
              </button>

              <button
                class="btn btn-secondary btn-sm"
                style="
                  padding:4px 8px;
                  font-size:0.75rem;
                "
                onclick="
                  friendsChatManager.rejectFriendRequest(
                    '${r.id}'
                  )
                "
              >
                Xóa
              </button>

            </div>

          </div>
        `;
      }
    }

    if (
      count === 0
    ) {

      html = `
        <div
          style="
            padding:20px;
            text-align:center;
            color:#94a3b8;
            font-size:0.85rem;
          "
        >
          Không có lời mời kết bạn nào.
        </div>
      `;
    }

    container.innerHTML =
      html;
  }
}

// =========================================================
// KHỞI TẠO
// =========================================================

window.friendsChatManager =
  new FriendsChatManager();
