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
      if (window.doublesManager) window.doublesManager.updateFriendsSelect();
    });

    window.realtimeDB.listen('friendRequests', (data) => {
      this.friendRequests = data || {};
      this.render();
    });

    window.realtimeDB.listen('chat', (data) => {
      this.chats = data || {};
      if (this.activeChatPartner) {
        this.renderChatMessages();
      }
      this.renderFriendsList();
    });
  }

  setFriendTab(tab) {
    this.activeFriendTab = tab;
    document.querySelectorAll('.social-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    this.render();
  }

  async sendFriendRequest(targetUsername) {
    if (!window.authManager.isLoggedIn()) {
      throw new Error("Vui lòng đăng nhập trước!");
    }

    const me = window.authManager.currentUser.username;
    if (targetUsername === me) {
      throw new Error("Không thể tự kết bạn với chính mình!");
    }

    const reqId = `freq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const req = {
      id: reqId,
      senderUsername: me,
      senderName: window.authManager.currentUser.fullName,
      senderClass: window.authManager.currentUser.classGroup,
      receiverUsername: targetUsername,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await window.realtimeDB.set(`friendRequests/${reqId}`, req);
    window.app.showToast("Đã gửi lời mời kết bạn!", "success");
    return true;
  }

  async acceptFriendRequest(reqId) {
    const req = this.friendRequests[reqId];
    if (!req) return;

    const u1 = req.senderUsername;
    const u2 = req.receiverUsername;

    await window.realtimeDB.update(`friends/${u1}`, { [u2]: 'accepted' });
    await window.realtimeDB.update(`friends/${u2}`, { [u1]: 'accepted' });
    await window.realtimeDB.update(`friendRequests/${reqId}`, { status: 'accepted' });
    window.app.showToast("Đã trở thành bạn bè!", "success");
  }

  async rejectFriendRequest(reqId) {
    await window.realtimeDB.update(`friendRequests/${reqId}`, { status: 'rejected' });
  }

  openChatWith(friendUsername) {
    this.activeChatPartner = friendUsername;
    const partner = this.users[friendUsername];
    if (!partner) return;

    const chatWindow = document.getElementById('chat-window-container');
    const noChatPlaceholder = document.getElementById('no-chat-placeholder');
    const partnerNameEl = document.getElementById('chat-partner-name');
    const partnerMetaEl = document.getElementById('chat-partner-meta');
    const partnerAvatarEl = document.getElementById('chat-partner-avatar');

    if (noChatPlaceholder) noChatPlaceholder.style.display = 'none';
    if (chatWindow) chatWindow.style.display = 'flex';

    if (partnerNameEl) partnerNameEl.textContent = partner.fullName;
    if (partnerMetaEl) partnerMetaEl.textContent = `Lớp ${partner.classGroup} • @${partner.username}`;
    if (partnerAvatarEl) partnerAvatarEl.textContent = partner.fullName.charAt(0).toUpperCase();

    this.renderChatMessages();
    this.renderFriendsList();
  }

  getChatRoomKey(u1, u2) {
    return [u1, u2].sort().join('__');
  }

  async sendMessage(text) {
    if (!window.authManager.isLoggedIn() || !this.activeChatPartner) return;
    const cleanText = text.trim();
    if (!cleanText) return;

    const me = window.authManager.currentUser.username;
    const partner = this.activeChatPartner;
    const roomKey = this.getChatRoomKey(me, partner);

    const msgId = `msg_${Date.now()}`;
    const newMsg = {
      id: msgId,
      sender: me,
      text: cleanText,
      timestamp: new Date().toISOString()
    };

    await window.realtimeDB.set(`chat/${roomKey}/${msgId}`, newMsg);
    
    const msgArea = document.getElementById('chat-messages-area');
    if (msgArea) {
      setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 100);
    }
  }

  renderChatMessages() {
    const msgArea = document.getElementById('chat-messages-area');
    if (!msgArea || !this.activeChatPartner || !window.authManager.isLoggedIn()) return;

    const me = window.authManager.currentUser.username;
    const roomKey = this.getChatRoomKey(me, this.activeChatPartner);
    const roomMessages = this.chats[roomKey] || {};

    const msgList = Object.values(roomMessages);
    msgList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (msgList.length === 0) {
      msgArea.innerHTML = `
        <div style="text-align: center; color: #94a3b8; margin: auto; padding: 20px;">
          <i class="fa-regular fa-comments" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
          <p>Chưa có tin nhắn nào. Hãy gửi lời chào đến bạn bè!</p>
        </div>
      `;
      return;
    }

    let html = '';
    msgList.forEach(m => {
      const isMe = m.sender === me;
      const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="message-bubble ${isMe ? 'outgoing' : 'incoming'}">
          <div>${this.escapeHtml(m.text)}</div>
          <div class="message-time">${timeStr}</div>
        </div>
      `;
    });

    msgArea.innerHTML = html;
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  render() {
    const container = document.getElementById('friends-sidebar-content');
    if (!container) return;

    if (!window.authManager.isLoggedIn()) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 0.88rem;">
          <i class="fa-solid fa-lock" style="font-size: 2rem; margin-bottom: 8px; color: #cbd5e1;"></i>
          <p>Vui lòng đăng nhập để xem danh sách bạn bè và trò chuyện trực tuyến.</p>
        </div>
      `;
      return;
    }

    if (this.activeFriendTab === 'friends') {
      this.renderFriendsList();
    } else if (this.activeFriendTab === 'find') {
      this.renderFindFriendsList();
    } else if (this.activeFriendTab === 'requests') {
      this.renderRequestsList();
    }
  }

  renderFriendsList() {
    const container = document.getElementById('friends-sidebar-content');
    if (!container || !window.authManager.isLoggedIn()) return;

    const myUsername = window.authManager.currentUser.username;
    const myFriendsMap = this.friends[myUsername] || {};

    let list = [];
    for (let friendUname in myFriendsMap) {
      if (myFriendsMap[friendUname] === 'accepted') {
        const u = this.users[friendUname];
        if (u) {
          list.push(u);
        }
      }
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: #94a3b8; font-size: 0.85rem;">
          <i class="fa-solid fa-user-group" style="font-size: 2rem; margin-bottom: 8px; color: #cbd5e1;"></i>
          <p>Bạn chưa có bạn bè nào.</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 10px;" onclick="friendsChatManager.setFriendTab('find')">
            Tìm bạn ngay
          </button>
        </div>
      `;
      return;
    }

    let html = '';
    list.forEach(friend => {
      const isActive = this.activeChatPartner === friend.username;
      const initial = friend.fullName.charAt(0).toUpperCase();
      const isOnline = !!friend.isOnline;

      html += `
        <div class="friend-item ${isActive ? 'active' : ''}" onclick="friendsChatManager.openChatWith('${friend.username}')">
          <div class="friend-avatar-wrap">
            <div class="player-avatar" style="width: 38px; height: 38px; font-size: 0.85rem;">${initial}</div>
            <span class="online-indicator ${isOnline ? '' : 'offline'}"></span>
          </div>
          <div class="friend-info">
            <div class="friend-name">${friend.fullName}</div>
            <div class="friend-last-msg">Lớp ${friend.classGroup} • @${friend.username}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  renderFindFriendsList() {
    const container = document.getElementById('friends-sidebar-content');
    if (!container || !window.authManager.isLoggedIn()) return;

    const myUsername = window.authManager.currentUser.username;
    const myFriendsMap = this.friends[myUsername] || {};

    let html = `
      <div style="padding: 8px 12px;">
        <input type="text" id="find-friend-search-input" class="form-input" placeholder="Tìm tên hoặc lớp..." oninput="friendsChatManager.filterFindList(this.value)" style="padding: 6px 10px; font-size: 0.82rem; margin-bottom: 8px;">
        <div id="find-friends-results">
    `;

    for (let uname in this.users) {
      if (uname !== myUsername) {
        const u = this.users[uname];
        const isFriend = myFriendsMap[uname] === 'accepted';
        
        let isPending = false;
        for (let rId in this.friendRequests) {
          const r = this.friendRequests[rId];
          if (r.senderUsername === myUsername && r.receiverUsername === uname && r.status === 'pending') {
            isPending = true;
            break;
          }
        }

        html += `
          <div class="friend-item" style="cursor: default;">
            <div class="player-avatar" style="width: 36px; height: 36px; font-size: 0.8rem;">${u.fullName.charAt(0).toUpperCase()}</div>
            <div class="friend-info">
              <div class="friend-name">${u.fullName}</div>
              <div class="friend-last-msg">Lớp ${u.classGroup} • @${u.username}</div>
            </div>
            <div>
              ${isFriend ? '<span class="tag-class" style="background:#dcfce7; color:#15803d; font-size:0.7rem;">Bạn bè</span>' : 
                (isPending ? '<span class="tag-class" style="background:#fef3c7; color:#b45309; font-size:0.7rem;">Đã gửi</span>' : 
                `<button class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 4px 8px;" onclick="friendsChatManager.sendFriendRequest('${u.username}')">
                  <i class="fa-solid fa-user-plus"></i> Kết bạn
                 </button>`)}
            </div>
          </div>
        `;
      }
    }

    html += `</div></div>`;
    container.innerHTML = html;
  }

  filterFindList(query) {
    const q = query.toLowerCase().trim();
    const items = document.querySelectorAll('#find-friends-results .friend-item');
    items.forEach(el => {
      const text = el.textContent.toLowerCase();
      el.style.display = text.includes(q) ? 'flex' : 'none';
    });
  }

  renderRequestsList() {
    const container = document.getElementById('friends-sidebar-content');
    if (!container || !window.authManager.isLoggedIn()) return;

    const myUsername = window.authManager.currentUser.username;
    let html = '';
    let count = 0;

    for (let rId in this.friendRequests) {
      const r = this.friendRequests[rId];
      if (r.receiverUsername === myUsername && r.status === 'pending') {
        count++;
        html += `
          <div class="pair-request-card" style="margin: 8px;">
            <div>
              <strong style="font-size: 0.88rem; color: var(--bwf-navy-dark);">${r.senderName}</strong>
              <div style="font-size: 0.75rem; color: #64748b;">Lớp ${r.senderClass}</div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-success btn-sm" style="padding: 4px 8px; font-size: 0.75rem;" onclick="friendsChatManager.acceptFriendRequest('${r.id}')">
                Đồng ý
              </button>
              <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem;" onclick="friendsChatManager.rejectFriendRequest('${r.id}')">
                Xóa
              </button>
            </div>
          </div>
        `;
      }
    }

    if (count === 0) {
      html = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 0.85rem;">Không có lời mời kết bạn nào.</div>';
    }

    container.innerHTML = html;
  }
}

window.friendsChatManager = new FriendsChatManager();
