/**
 * ĐOÀN THƯỢNG BADMINTON - NEWS, COMMENTS & MENTIONS ENGINE
 * 1. Quản lý Tin tức, Thông báo, Điều lệ & Tài liệu đính kèm (Admin).
 * 2. Hệ thống Bình luận trực tuyến thời gian thực (Realtime News Comments).
 * 3. Tag / Mention thành viên (@username, @Họ Tên) với gợi ý tự động & badge nổi bật.
 * 4. Pop-up hiển thị 2 bài viết mới nhất mỗi khi vào website (Welcome / Latest 2 News Modal).
 */

class NewsManager {
  constructor() {
    this.news = {};
    this.comments = {}; // { [newsId]: { [cmtId]: CommentObject } }
    this.expandedComments = {}; // { [newsId]: boolean }
    this.currentDetailNewsId = null;
    this.hasAutoShownLatest = false;
    this.init();
  }

  init() {
    // 1. Lắng nghe dữ liệu bài viết
    window.realtimeDB.listen('news', (data) => {
      this.news = data || {};
      this.render();
      this.renderLatestNewsPopupContent();
      if (this.currentDetailNewsId && this.news[this.currentDetailNewsId]) {
        this.renderDetailModal(this.currentDetailNewsId);
      }
    });

    // 2. Lắng nghe dữ liệu bình luận bài viết
    window.realtimeDB.listen('newsComments', (data) => {
      this.comments = data || {};
      this.render();
      this.renderLatestNewsPopupContent();
      if (this.currentDetailNewsId && this.news[this.currentDetailNewsId]) {
        this.renderDetailModal(this.currentDetailNewsId);
      }
    });
  }

  /* =========================================================
     NEWS POSTS CRUD (ADMIN ONLY)
     ========================================================= */
  async createNewsPost(formData) {
    if (!window.authManager.isAdmin()) {
      throw new Error("Chỉ Ban Quản Trị mới có quyền đăng tin tức và tài liệu!");
    }

    const title = (formData.title || '').trim();
    const category = formData.category || 'Thông báo';
    const content = (formData.content || '').trim();
    const imageUrl = formData.imageUrl || '';
    const documents = formData.documents || [];

    if (!title || !content) {
      throw new Error("Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết!");
    }

    const newsId = `news_${Date.now()}`;
    const author = window.authManager.currentUser.fullName || window.authManager.currentUser.username || 'Ban Quản Trị';
    
    const post = {
      id: newsId,
      title: title,
      category: category,
      content: content,
      imageUrl: imageUrl,
      documents: documents,
      author: `${author} (Admin)`,
      date: new Date().toLocaleDateString('vi-VN'),
      createdAt: new Date().toISOString()
    };

    await window.realtimeDB.set(`news/${newsId}`, post);
    return newsId;
  }

  async deleteNewsPost(newsId) {
    if (!window.authManager.isAdmin()) return;
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không? Toàn bộ bình luận đi kèm cũng sẽ bị xóa.")) return;
    
    await window.realtimeDB.remove(`news/${newsId}`);
    await window.realtimeDB.remove(`newsComments/${newsId}`);
    
    if (this.currentDetailNewsId === newsId) {
      window.app.closeModal('modal-news-detail');
      this.currentDetailNewsId = null;
    }
    
    window.app.showToast("Đã xóa bài viết thành công!", "info");
  }

  /* =========================================================
     COMMENTS SYSTEM (BÌNH LUẬN THỜI GIAN THỰC)
     ========================================================= */
  getNewsCommentsList(newsId) {
    const postComments = this.comments[newsId] || {};
    const list = Object.values(postComments);
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return list;
  }

  async addComment(newsId, text, textareaElement) {
    if (!window.authManager.isLoggedIn()) {
      window.app.showToast("Vui lòng đăng nhập để tham gia bình luận!", "warning");
      window.app.openModal('modal-login');
      return;
    }

    const me = window.authManager.currentUser;
    if (window.authManager.checkIsBanned(me)) {
      window.app.showToast("Tài khoản của bạn đang bị khóa, không thể bình luận!", "error");
      return;
    }

    const cleanText = (text || '').trim();
    if (!cleanText) {
      window.app.showToast("Vui lòng nhập nội dung bình luận!", "warning");
      return;
    }

    const cmtId = `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const commentObj = {
      id: cmtId,
      newsId: newsId,
      authorUsername: me.username,
      authorName: me.fullName || me.username,
      authorAvatar: me.avatar || '',
      authorClass: me.classGroup || 'CLB',
      authorRole: me.role || 'member',
      content: cleanText,
      createdAt: new Date().toISOString()
    };

    try {
      await window.realtimeDB.set(`newsComments/${newsId}/${cmtId}`, commentObj);
      if (textareaElement) {
        textareaElement.value = '';
      }
      this.expandedComments[newsId] = true;
      window.app.showToast("Đã đăng bình luận thành công!", "success");
    } catch (e) {
      console.error(e);
      window.app.showToast("Lỗi khi gửi bình luận: " + e.message, "error");
    }
  }

  async deleteComment(newsId, cmtId) {
    if (!window.authManager.isLoggedIn()) return;
    const me = window.authManager.currentUser;
    const postComments = this.comments[newsId] || {};
    const targetCmt = postComments[cmtId];

    if (!targetCmt) return;

    const isAuthor = targetCmt.authorUsername === me.username;
    const isAdmin = window.authManager.isAdmin();

    if (!isAuthor && !isAdmin) {
      window.app.showToast("Bạn không có quyền xóa bình luận này!", "error");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;

    try {
      await window.realtimeDB.remove(`newsComments/${newsId}/${cmtId}`);
      window.app.showToast("Đã xóa bình luận!", "info");
    } catch (e) {
      window.app.showToast("Lỗi khi xóa bình luận: " + e.message, "error");
    }
  }

  toggleComments(newsId) {
    this.expandedComments[newsId] = !this.expandedComments[newsId];
    this.render();
  }

  /* =========================================================
     MENTIONS & TAGGING SYSTEM (@username / @Họ Tên)
     ========================================================= */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  formatContentWithMentions(rawText) {
    if (!rawText) return '';
    let escaped = this.escapeHtml(rawText);
    const users = window.authManager ? (window.authManager.users || {}) : {};

    // Pattern 1: @username
    escaped = escaped.replace(/@([a-zA-Z0-9_]{3,25})/g, (match, uname) => {
      const u = users[uname.toLowerCase()];
      const displayName = u ? (u.fullName || uname) : uname;
      return `<span class="mention-tag" onclick="newsManager.onMentionClick('${uname}')" title="Thành viên @${uname}"><i class="fa-solid fa-at"></i> ${displayName}</span>`;
    });

    // Xuống dòng tự nhiên
    return escaped.replace(/\n/g, '<br>');
  }

  onMentionClick(username) {
    const users = window.authManager ? (window.authManager.users || {}) : {};
    const u = users[username.toLowerCase()];
    if (!u) {
      window.app.showToast(`Thành viên: @${username}`, "info");
      return;
    }

    const singlePts = u.gender === 'nam' ? (u.pointsMS || 0) : (u.pointsWS || 0);
    const roleText = u.role === 'admin' ? '🛡️ Ban Quản Trị' : '🏸 Vận Động Viên';
    const infoMsg = `🏸 ${u.fullName} (@${u.username})\n• Lớp: ${u.classGroup || 'N/A'}\n• Vai trò: ${roleText}\n• Điểm đơn BWF: ${singlePts.toLocaleString()} PTS\n• Tay thuận: ${u.dominantHand || 'Phải'}`;

    if (window.authManager.isLoggedIn() && window.authManager.currentUser.username !== username) {
      if (confirm(`${infoMsg}\n\n👉 Bạn có muốn mở khung chat với ${u.fullName} không?`)) {
        window.app.closeModal('modal-latest-news');
        window.app.closeModal('modal-news-detail');
        window.app.navigate('friends');
        if (window.friendsChatManager) {
          window.friendsChatManager.openChatWith(username);
        }
      }
    } else {
      alert(infoMsg);
    }
  }

  setupMentionInput(textareaEl, dropdownEl, quickTagsEl, newsId) {
    if (!textareaEl) return;

    // Render Quick Tag Chips
    if (quickTagsEl) {
      const users = window.authManager ? (window.authManager.users || {}) : {};
      const currentUname = window.authManager.currentUser ? window.authManager.currentUser.username : '';
      let chipsHtml = '<span style="font-size:0.75rem; color:#64748b; font-weight:700; align-self:center; margin-right:4px;"><i class="fa-solid fa-tags" style="color:var(--bwf-gold);"></i> Tag bạn:</span>';
      
      let count = 0;
      for (let uname in users) {
        if (uname === currentUname) continue;
        const u = users[uname];
        if (!u) continue;
        count++;
        if (count > 6) break;
        const fname = u.fullName ? u.fullName.split(' ').slice(-1)[0] : uname;
        chipsHtml += `
          <button type="button" class="quick-tag-chip" onclick="newsManager.insertMention('${textareaEl.id}', '${uname}', '${u.fullName || uname}')">
            @${fname}
          </button>
        `;
      }
      quickTagsEl.innerHTML = chipsHtml;
    }

    // Auto-complete Dropdown on Typing @
    textareaEl.addEventListener('input', (e) => {
      const text = textareaEl.value;
      const cursorPos = textareaEl.selectionStart;
      const textBefore = text.slice(0, cursorPos);
      const match = textBefore.match(/@([a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]*)$/);

      if (match && dropdownEl) {
        const query = match[1].toLowerCase();
        const users = window.authManager ? (window.authManager.users || {}) : {};
        let matches = [];

        for (let uname in users) {
          const u = users[uname];
          if (!u) continue;
          const unameLower = uname.toLowerCase();
          const nameLower = (u.fullName || '').toLowerCase();
          const classLower = (u.classGroup || '').toLowerCase();

          if (!query || unameLower.includes(query) || nameLower.includes(query) || classLower.includes(query)) {
            matches.push(u);
          }
        }

        if (matches.length > 0) {
          let itemsHtml = '';
          matches.slice(0, 5).forEach(u => {
            const initial = (u.fullName || u.username || 'U').charAt(0).toUpperCase();
            itemsHtml += `
              <div class="mention-autocomplete-item" onclick="newsManager.insertMention('${textareaEl.id}', '${u.username}', '${u.fullName || u.username}'); document.getElementById('${dropdownEl.id}').style.display='none';">
                <div class="player-avatar" style="width: 26px; height: 26px; font-size: 0.72rem;">
                  ${u.avatar ? `<img src="${u.avatar}" alt="${u.fullName}"/>` : initial}
                </div>
                <div style="flex:1; min-width:0;">
                  <strong style="font-size:0.82rem; color:var(--bwf-navy-dark);">${u.fullName}</strong>
                  <span style="font-size:0.72rem; color:#94a3b8; margin-left:4px;">@${u.username} • Lớp ${u.classGroup || 'CLB'}</span>
                </div>
              </div>
            `;
          });
          dropdownEl.innerHTML = itemsHtml;
          dropdownEl.style.display = 'block';
        } else {
          dropdownEl.style.display = 'none';
        }
      } else if (dropdownEl) {
        dropdownEl.style.display = 'none';
      }
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (dropdownEl && !dropdownEl.contains(e.target) && e.target !== textareaEl) {
        dropdownEl.style.display = 'none';
      }
    });
  }

  insertMention(textareaId, username, fullName) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const val = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const textAfter = val.slice(cursorPos);

    // Thay thế từ @cuối cùng
    const replacedBefore = textBefore.replace(/@([a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]*)$/, `@${username} `);

    if (replacedBefore !== textBefore) {
      textarea.value = replacedBefore + textAfter;
      textarea.selectionStart = textarea.selectionEnd = replacedBefore.length;
    } else {
      // Nếu chưa có @ thì thêm vào
      const addition = `@${username} `;
      textarea.value = textBefore + addition + textAfter;
      textarea.selectionStart = textarea.selectionEnd = cursorPos + addition.length;
    }

    textarea.focus();
  }

  /* =========================================================
     POPUP HIỂN THỊ 2 BÀI VIẾT MỚI NHẤT (WELCOME MODAL)
     ========================================================= */
  showWelcomeLatestNews(force = false) {
    if (!force) {
      const isDismissed = sessionStorage.getItem('dt_dismiss_latest_news_v2');
      if (isDismissed) return;
    }

    this.renderLatestNewsPopupContent();
    window.app.openModal('modal-latest-news');
    this.hasAutoShownLatest = true;
  }

  dismissLatestNewsPopup(dontShowAgain = false) {
    if (dontShowAgain) {
      sessionStorage.setItem('dt_dismiss_latest_news_v2', '1');
    }
    window.app.closeModal('modal-latest-news');
  }

  renderLatestNewsPopupContent() {
    const container = document.getElementById('latest-news-popup-container');
    if (!container) return;

    let list = Object.values(this.news);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Lấy đúng 2 bài viết mới nhất
    const top2 = list.slice(0, 2);

    if (top2.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #94a3b8;">
          <i class="fa-regular fa-newspaper" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 10px;"></i>
          <h4>Hiện chưa có bài viết mới</h4>
          <p style="font-size: 0.85rem;">Ban Quản Trị sẽ sớm cập nhật các tin tức và thông báo tiếp theo.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="latest-news-grid">';
    top2.forEach((post, idx) => {
      const commentsCount = (this.comments[post.id] ? Object.keys(this.comments[post.id]).length : 0);
      const isFirst = idx === 0;

      html += `
        <div class="latest-news-card" onclick="newsManager.openArticleFromPopup('${post.id}')">
          <div class="latest-news-thumb-wrap">
            ${post.imageUrl ? `
              <img src="${post.imageUrl}" alt="${post.title}" class="latest-news-thumb">
            ` : `
              <div class="latest-news-thumb-placeholder">
                <i class="fa-solid fa-trophy" style="font-size: 3rem; color: var(--bwf-gold); opacity: 0.8;"></i>
              </div>
            `}
            <span class="news-badge ${isFirst ? 'badge-hot' : ''}">
              ${isFirst ? '<i class="fa-solid fa-fire"></i> MỚI NHẤT • ' : ''}${post.category || 'Thông báo'}
            </span>
          </div>

          <div class="latest-news-body">
            <div class="latest-news-meta">
              <span><i class="fa-regular fa-calendar"></i> ${post.date || 'Hôm nay'}</span>
              <span><i class="fa-solid fa-shield-halved" style="color: var(--bwf-gold);"></i> ${post.author || 'BQT'}</span>
            </div>

            <h4 class="latest-news-title">${post.title}</h4>
            <p class="latest-news-excerpt">${post.content}</p>

            <div class="latest-news-footer">
              <span class="latest-news-comments-count">
                <i class="fa-regular fa-comment-dots" style="color: var(--bwf-blue);"></i> ${commentsCount} bình luận
              </span>
              <button class="btn btn-gold btn-sm" style="padding: 6px 14px; font-weight: 800;" onclick="event.stopPropagation(); newsManager.openArticleFromPopup('${post.id}')">
                Xem bài viết <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  openArticleFromPopup(newsId) {
    this.dismissLatestNewsPopup(false);
    window.app.navigate('news');
    
    setTimeout(() => {
      // Mở modal chi tiết và cuộn đến khung bình luận
      this.openDetailModal(newsId);
    }, 250);
  }

  /* =========================================================
     MODAL XEM CHI TIẾT BÀI VIẾT & BÌNH LUẬN ĐẦY ĐỦ
     ========================================================= */
  openDetailModal(newsId) {
    this.currentDetailNewsId = newsId;
    this.renderDetailModal(newsId);
    window.app.openModal('modal-news-detail');
  }

  renderDetailModal(newsId) {
    const modalBody = document.getElementById('news-detail-modal-body');
    const modalTitle = document.getElementById('news-detail-modal-title');
    const post = this.news[newsId];

    if (!modalBody || !post) return;

    if (modalTitle) {
      modalTitle.innerHTML = `<i class="fa-regular fa-newspaper" style="color: var(--bwf-gold);"></i> ${post.title}`;
    }

    const commentsList = this.getNewsCommentsList(newsId);
    const isAdmin = window.authManager.isAdmin();
    const me = window.authManager.currentUser;
    const currentUsername = me ? me.username : null;

    // Build documents HTML
    let docHtml = '';
    if (post.documents && post.documents.length > 0) {
      docHtml = '<div class="news-attachments" style="margin: 16px 0;"><div style="font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 6px;">📂 Tài liệu đính kèm:</div>';
      post.documents.forEach(doc => {
        docHtml += `
          <a href="${doc.url}" download="${doc.name}" target="_blank" class="doc-download-btn" style="padding: 8px 14px; font-size: 0.88rem;">
            <i class="fa-solid fa-file-arrow-down" style="color: var(--bwf-red);"></i>
            <span>${doc.name} ${doc.size ? `(${doc.size})` : ''}</span>
          </a>
        `;
      });
      docHtml += '</div>';
    }

    // Build comments list HTML
    let commentsHtml = '';
    if (commentsList.length === 0) {
      commentsHtml = `
        <div style="text-align: center; padding: 24px; color: #94a3b8; background: #f8fafc; border-radius: var(--radius-md);">
          <i class="fa-regular fa-comments" style="font-size: 2.2rem; color: #cbd5e1; margin-bottom: 6px;"></i>
          <p style="font-size: 0.88rem;">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ và tag bạn bè!</p>
        </div>
      `;
    } else {
      commentsList.forEach(cmt => {
        const isMyCmt = currentUsername && cmt.authorUsername === currentUsername;
        const initial = (cmt.authorName || cmt.authorUsername || 'U').charAt(0).toUpperCase();
        const timeStr = new Date(cmt.createdAt).toLocaleDateString('vi-VN') + ' ' + new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isCmtAdmin = cmt.authorRole === 'admin' || cmt.authorUsername === 'nguyenducnhatminh' || cmt.authorUsername === 'nguyenduchieu';

        commentsHtml += `
          <div class="comment-item">
            <div class="comment-avatar">
              ${cmt.authorAvatar ? `<img src="${cmt.authorAvatar}" alt="${cmt.authorName}"/>` : initial}
            </div>
            <div class="comment-bubble">
              <div class="comment-bubble-header">
                <div class="comment-author">
                  <span>${cmt.authorName || cmt.authorUsername}</span>
                  ${isCmtAdmin ? '<span class="admin-badge-pill" style="font-size: 0.65rem; padding: 1px 6px;">BQT</span>' : ''}
                  <span class="tag-class" style="font-size: 0.68rem; margin-left: 2px;">${cmt.authorClass || 'Học sinh'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="comment-time">${timeStr}</span>
                  ${(isMyCmt || isAdmin) ? `
                    <button class="comment-delete-btn" onclick="newsManager.deleteComment('${newsId}', '${cmt.id}')" title="Xóa bình luận">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
              <div class="comment-text">${this.formatContentWithMentions(cmt.content)}</div>
            </div>
          </div>
        `;
      });
    }

    modalBody.innerHTML = `
      <div class="news-detail-full">
        ${post.imageUrl ? `
          <div style="width: 100%; max-height: 360px; overflow: hidden; border-radius: var(--radius-md); margin-bottom: 16px;">
            <img src="${post.imageUrl}" alt="${post.title}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
          <span class="news-badge" style="position: static; font-size: 0.8rem;">${post.category || 'Thông báo'}</span>
          <div style="font-size: 0.82rem; color: #94a3b8;">
            <i class="fa-regular fa-calendar"></i> ${post.date} • Đăng bởi: <strong style="color: var(--bwf-navy-dark);">${post.author}</strong>
          </div>
        </div>

        <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--bwf-navy-dark); line-height: 1.35; margin-bottom: 14px;">${post.title}</h2>
        <div style="font-size: 0.96rem; color: #334155; line-height: 1.7; white-space: pre-line; margin-bottom: 16px;">
          ${this.formatContentWithMentions(post.content)}
        </div>

        ${docHtml}

        <!-- COMMENTS SECTION IN MODAL -->
        <div class="news-comments-wrapper" style="margin-top: 24px; border-radius: var(--radius-lg); border: 1px solid var(--bwf-gray-border);">
          <div class="news-comments-header">
            <span><i class="fa-solid fa-comments" style="color: var(--bwf-gold);"></i> Bình luận (${commentsList.length})</span>
            <span style="font-size: 0.78rem; color: #94a3b8;">Gõ <strong>@</strong> để tag thành viên</span>
          </div>

          <div class="comments-list" id="modal-comments-list-${newsId}">
            ${commentsHtml}
          </div>

          <!-- Comment Input Form -->
          <form class="comment-form" onsubmit="event.preventDefault(); const txt = document.getElementById('modal-comment-input-${newsId}'); newsManager.addComment('${newsId}', txt.value, txt);">
            <div class="quick-tags-wrap" id="modal-quick-tags-${newsId}"></div>

            <div class="comment-input-wrap">
              <div class="mention-autocomplete-box" id="modal-mention-dropdown-${newsId}"></div>
              <textarea id="modal-comment-input-${newsId}" class="comment-textarea" placeholder="Viết bình luận hoặc gõ @ để tag bạn bè..." rows="2" required></textarea>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.72rem; color: #94a3b8;">Hỗ trợ tag @username hoặc bấm chọn ở trên</span>
              <button type="submit" class="btn btn-primary btn-sm" style="padding: 7px 18px; font-weight: 700;">
                <i class="fa-solid fa-paper-plane"></i> Gửi bình luận
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Khởi tạo mention autocomplete cho form trong modal
    setTimeout(() => {
      const txt = document.getElementById(`modal-comment-input-${newsId}`);
      const drop = document.getElementById(`modal-mention-dropdown-${newsId}`);
      const qtags = document.getElementById(`modal-quick-tags-${newsId}`);
      if (txt) {
        this.setupMentionInput(txt, drop, qtags, newsId);
      }
    }, 100);
  }

  /* =========================================================
     RENDER MAIN NEWS FEED GRID
     ========================================================= */
  render() {
    const grid = document.getElementById('news-posts-grid');
    if (!grid) return;

    let list = Object.values(this.news);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;" class="empty-state">
          <i class="fa-regular fa-newspaper" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 12px;"></i>
          <h3>Chưa có bài viết hoặc thông báo nào</h3>
          <p>Ban Quản Trị sẽ sớm cập nhật các tin tức, điều lệ giải đấu và tài liệu mới nhất.</p>
        </div>
      `;
      return;
    }

    const isAdmin = window.authManager.isAdmin();
    const me = window.authManager.currentUser;
    const currentUsername = me ? me.username : null;
    let html = '';

    list.forEach(post => {
      const newsId = post.id;
      const commentsList = this.getNewsCommentsList(newsId);
      const isCommentsOpen = !!this.expandedComments[newsId];

      let docHtml = '';
      if (post.documents && post.documents.length > 0) {
        docHtml = '<div class="news-attachments"><div style="font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">📂 Tài liệu đính kèm:</div>';
        post.documents.forEach(doc => {
          docHtml += `
            <a href="${doc.url}" download="${doc.name}" target="_blank" class="doc-download-btn">
              <i class="fa-solid fa-file-arrow-down"></i>
              <span>${doc.name} ${doc.size ? `(${doc.size})` : ''}</span>
            </a>
          `;
        });
        docHtml += '</div>';
      }

      // Comments inner HTML for inline card
      let commentsHtml = '';
      if (isCommentsOpen) {
        if (commentsList.length === 0) {
          commentsHtml = `
            <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 0.85rem;">
              Chưa có bình luận nào. Hãy là người đầu tiên bình luận và tag bạn bè!
            </div>
          `;
        } else {
          commentsList.forEach(cmt => {
            const isMyCmt = currentUsername && cmt.authorUsername === currentUsername;
            const initial = (cmt.authorName || cmt.authorUsername || 'U').charAt(0).toUpperCase();
            const timeStr = new Date(cmt.createdAt).toLocaleDateString('vi-VN') + ' ' + new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isCmtAdmin = cmt.authorRole === 'admin' || cmt.authorUsername === 'nguyenducnhatminh' || cmt.authorUsername === 'nguyenduchieu';

            commentsHtml += `
              <div class="comment-item">
                <div class="comment-avatar">
                  ${cmt.authorAvatar ? `<img src="${cmt.authorAvatar}" alt="${cmt.authorName}"/>` : initial}
                </div>
                <div class="comment-bubble">
                  <div class="comment-bubble-header">
                    <div class="comment-author">
                      <span>${cmt.authorName || cmt.authorUsername}</span>
                      ${isCmtAdmin ? '<span class="admin-badge-pill" style="font-size: 0.62rem; padding: 1px 5px;">BQT</span>' : ''}
                      <span class="tag-class" style="font-size: 0.68rem; margin-left: 2px;">${cmt.authorClass || 'Học sinh'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="comment-time">${timeStr}</span>
                      ${(isMyCmt || isAdmin) ? `
                        <button class="comment-delete-btn" onclick="newsManager.deleteComment('${newsId}', '${cmt.id}')" title="Xóa bình luận">
                          <i class="fa-solid fa-trash-can"></i>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                  <div class="comment-text">${this.formatContentWithMentions(cmt.content)}</div>
                </div>
              </div>
            `;
          });
        }
      }

      html += `
        <div class="news-card" id="news-card-${newsId}">
          ${post.imageUrl ? `
            <div class="news-cover" onclick="newsManager.openDetailModal('${newsId}')" style="cursor: pointer;">
              <img src="${post.imageUrl}" alt="${post.title}">
              <span class="news-badge">${post.category || 'Thông báo'}</span>
            </div>
          ` : ''}
          <div class="news-content">
            <div class="news-date">
              <i class="fa-regular fa-calendar"></i> ${post.date} • Đăng bởi: ${post.author}
            </div>
            <h3 class="news-title" onclick="newsManager.openDetailModal('${newsId}')" style="cursor: pointer;">${post.title}</h3>
            <p class="news-excerpt">${this.formatContentWithMentions(post.content)}</p>
            ${docHtml}

            <!-- Card Actions -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" onclick="newsManager.toggleComments('${newsId}')">
                  <i class="fa-regular fa-comments"></i> 
                  <span>${isCommentsOpen ? 'Ẩn bình luận' : `Bình luận (${commentsList.length})`}</span>
                </button>
                <button class="btn btn-outline btn-sm" style="color: var(--bwf-navy-dark); border-color: #cbd5e1;" onclick="newsManager.openDetailModal('${newsId}')">
                  <i class="fa-solid fa-up-right-from-square"></i> Xem chi tiết
                </button>
              </div>

              ${isAdmin ? `
                <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5; font-size: 0.75rem;" onclick="newsManager.deleteNewsPost('${newsId}')">
                  <i class="fa-solid fa-trash"></i> Xóa
                </button>
              ` : ''}
            </div>
          </div>

          <!-- INLINE COMMENTS ACCORDION -->
          ${isCommentsOpen ? `
            <div class="news-comments-wrapper">
              <div class="news-comments-header">
                <span>💬 Bình luận cộng đồng (${commentsList.length})</span>
                <span style="font-size: 0.75rem; color: #64748b;">Gõ @ để tag</span>
              </div>

              <div class="comments-list">
                ${commentsHtml}
              </div>

              <form class="comment-form" onsubmit="event.preventDefault(); const txt = document.getElementById('card-comment-input-${newsId}'); newsManager.addComment('${newsId}', txt.value, txt);">
                <div class="quick-tags-wrap" id="card-quick-tags-${newsId}"></div>

                <div class="comment-input-wrap">
                  <div class="mention-autocomplete-box" id="card-mention-dropdown-${newsId}"></div>
                  <textarea id="card-comment-input-${newsId}" class="comment-textarea" placeholder="Viết bình luận hoặc gõ @ để tag bạn bè..." rows="2" required></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end;">
                  <button type="submit" class="btn btn-primary btn-sm" style="padding: 6px 16px;">
                    <i class="fa-solid fa-paper-plane"></i> Gửi
                  </button>
                </div>
              </form>
            </div>
          ` : ''}
        </div>
      `;
    });

    grid.innerHTML = html;

    // Kích hoạt autocomplete cho các form bình luận đang mở
    list.forEach(post => {
      if (this.expandedComments[post.id]) {
        const txt = document.getElementById(`card-comment-input-${post.id}`);
        const drop = document.getElementById(`card-mention-dropdown-${post.id}`);
        const qtags = document.getElementById(`card-quick-tags-${post.id}`);
        if (txt) {
          this.setupMentionInput(txt, drop, qtags, post.id);
        }
      }
    });
  }
}

window.newsManager = new NewsManager();
