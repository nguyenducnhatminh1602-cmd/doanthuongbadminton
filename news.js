/**
 * ĐOÀN THƯỢNG BADMINTON - NEWS & MEDIA MANAGER
 * Trang tin tức, đăng bài kèm hình ảnh và đính kèm tài liệu giải đấu (PDF/Word/Excel)
 */

class NewsManager {
  constructor() {
    this.news = {};
    this.init();
  }

  init() {
    window.realtimeDB.listen('news', (data) => {
      this.news = data || {};
      this.render();
    });
  }

  async createNewsPost(formData) {
    if (!window.authManager.isAdmin()) {
      throw new Error("Chỉ Admin mới có quyền đăng tin tức và tài liệu!");
    }

    const title = formData.title.trim();
    const category = formData.category || 'Thông báo';
    const content = formData.content.trim();
    const imageUrl = formData.imageUrl || '';
    const documents = formData.documents || [];

    if (!title || !content) {
      throw new Error("Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết!");
    }

    const newsId = `news_${Date.now()}`;
    const author = window.authManager.currentUser.fullName || window.authManager.currentUser.username;
    
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
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
    await window.realtimeDB.remove(`news/${newsId}`);
    window.app.showToast("Đã xóa bài viết!", "info");
  }

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
    let html = '';

    list.forEach(post => {
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

      html += `
        <div class="news-card">
          ${post.imageUrl ? `
            <div class="news-cover">
              <img src="${post.imageUrl}" alt="${post.title}">
              <span class="news-badge">${post.category}</span>
            </div>
          ` : ''}
          <div class="news-content">
            <div class="news-date">
              <i class="fa-regular fa-calendar"></i> ${post.date} • Đăng bởi: ${post.author}
            </div>
            <h3 class="news-title">${post.title}</h3>
            <p class="news-excerpt">${post.content.replace(/\n/g, '<br>')}</p>
            ${docHtml}
            ${isAdmin ? `
              <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: flex-end;">
                <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5; font-size: 0.75rem;" onclick="newsManager.deleteNewsPost('${post.id}')">
                  <i class="fa-solid fa-trash"></i> Xóa bài
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  }
}

window.newsManager = new NewsManager();
