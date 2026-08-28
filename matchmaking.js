/**
 * ĐOÀN THƯỢNG BADMINTON - MATCHMAKING LOBBY
 * Đăng tin ghép trận cầu lông: Khung giờ, Địa điểm, Số lượng người, Nút tham gia
 */

class MatchmakingManager {
  constructor() {
    this.matches = {};
    this.filterCategory = 'all';
    this.init();
  }

  init() {
    window.realtimeDB.listen('matches', (data) => {
      this.matches = data || {};
      this.render();
    });
  }

  setFilterCategory(cat) {
    this.filterCategory = cat;
    this.render();
  }

  async createMatch(formData) {
    if (!window.authManager.isLoggedIn()) {
      throw new Error("Vui lòng đăng nhập để tạo bài ghép trận!");
    }

    const me = window.authManager.currentUser;
    const title = formData.title.trim();
    const timeFrame = formData.timeFrame.trim();
    const location = formData.location.trim();
    const category = formData.category;
    const maxPlayers = parseInt(formData.maxPlayers) || 4;
    const level = formData.level || 'Tất cả trình độ';
    const notes = formData.notes.trim();

    if (!title || !timeFrame || !location) {
      throw new Error("Vui lòng nhập đầy đủ Tiêu đề, Khung giờ và Địa điểm sân cầu!");
    }

    const matchId = `match_${Date.now()}`;
    const newMatch = {
      id: matchId,
      title: title,
      timeFrame: timeFrame,
      location: location,
      category: category,
      maxPlayers: maxPlayers,
      level: level,
      notes: notes,
      creatorUsername: me.username,
      creatorName: me.fullName,
      creatorClass: me.classGroup,
      status: 'open',
      createdAt: new Date().toISOString(),
      joinedPlayers: [
        {
          username: me.username,
          fullName: me.fullName,
          classGroup: me.classGroup
        }
      ]
    };

    await window.realtimeDB.set(`matches/${matchId}`, newMatch);
    return matchId;
  }

  async joinMatch(matchId) {
    if (!window.authManager.isLoggedIn()) {
      throw new Error("Vui lòng đăng nhập trước khi tham gia trận!");
    }

    const me = window.authManager.currentUser;
    const match = this.matches[matchId];
    if (!match) throw new Error("Trận đấu không tồn tại!");

    let players = match.joinedPlayers || [];
    const isAlreadyJoined = players.some(p => p.username === me.username);

    if (isAlreadyJoined) {
      throw new Error("Bạn đã tham gia trận này rồi!");
    }

    if (players.length >= match.maxPlayers) {
      throw new Error("Trận đấu này đã đủ số lượng người đăng ký!");
    }

    players.push({
      username: me.username,
      fullName: me.fullName,
      classGroup: me.classGroup
    });

    const isFull = players.length >= match.maxPlayers;
    await window.realtimeDB.update(`matches/${matchId}`, {
      joinedPlayers: players,
      status: isFull ? 'full' : 'open'
    });

    window.app.showToast("Tham gia trận đấu thành công!", "success");
  }

  async leaveMatch(matchId) {
    if (!window.authManager.isLoggedIn()) return;
    const me = window.authManager.currentUser;
    const match = this.matches[matchId];
    if (!match) return;

    let players = match.joinedPlayers || [];
    players = players.filter(p => p.username !== me.username);

    await window.realtimeDB.update(`matches/${matchId}`, {
      joinedPlayers: players,
      status: 'open'
    });

    window.app.showToast("Đã rút lui khỏi trận đấu", "info");
  }

  async deleteMatch(matchId) {
    if (!confirm("Bạn có chắc chắn muốn hủy trận đấu này?")) return;
    await window.realtimeDB.remove(`matches/${matchId}`);
    window.app.showToast("Đã xóa trận đấu", "info");
  }

  render() {
    const grid = document.getElementById('match-list-grid');
    if (!grid) return;

    let list = Object.values(this.matches);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (this.filterCategory !== 'all') {
      list = list.filter(m => m.category === this.filterCategory);
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;" class="empty-state">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 12px;"></i>
          <h3>Chưa có bài đăng ghép trận nào</h3>
          <p>Hãy là người đầu tiên tạo kèo giao lưu cầu lông tại nút "Đăng Kèo Ghép Trận" bên trên!</p>
        </div>
      `;
      return;
    }

    const me = window.authManager.currentUser;
    const myUsername = me ? me.username : null;
    const isAdmin = window.authManager.isAdmin();

    let html = '';
    list.forEach(m => {
      const players = m.joinedPlayers || [];
      const currentCount = players.length;
      const maxCount = m.maxPlayers;
      const isJoined = myUsername ? players.some(p => p.username === myUsername) : false;
      const isCreator = myUsername && m.creatorUsername === myUsername;

      let statusBadge = '';
      if (m.status === 'full' || currentCount >= maxCount) {
        statusBadge = `<span class="match-status-badge status-full"><i class="fa-solid fa-users"></i> Đã đủ người (${currentCount}/${maxCount})</span>`;
      } else {
        statusBadge = `<span class="match-status-badge status-open"><i class="fa-solid fa-user-plus"></i> Đang tìm (${currentCount}/${maxCount})</span>`;
      }

      let playerChipsHtml = '';
      players.forEach(p => {
        const isHost = p.username === m.creatorUsername;
        playerChipsHtml += `
          <span class="player-chip ${isHost ? 'creator' : ''}">
            ${isHost ? '👑 ' : ''}${p.fullName} (${p.classGroup})
          </span>
        `;
      });

      html += `
        <div class="match-card">
          <div class="match-header">
            <span class="match-category">${m.category}</span>
            ${statusBadge}
          </div>
          <div class="match-body">
            <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--bwf-navy-dark);">${m.title}</h4>
            
            <div class="match-info-item">
              <i class="fa-solid fa-clock"></i>
              <span><strong>Khung giờ:</strong> ${m.timeFrame}</span>
            </div>

            <div class="match-info-item">
              <i class="fa-solid fa-location-dot"></i>
              <span><strong>Địa điểm:</strong> ${m.location}</span>
            </div>

            <div class="match-info-item">
              <i class="fa-solid fa-medal"></i>
              <span><strong>Trình độ:</strong> ${m.level}</span>
            </div>

            ${m.notes ? `
              <div style="font-size: 0.84rem; color: #64748b; background: #f1f5f9; padding: 8px 12px; border-radius: var(--radius-sm);">
                💬 <em>${m.notes}</em>
              </div>
            ` : ''}

            <div class="match-players-section">
              <div class="players-header">
                <span>Vận động viên tham gia:</span>
                <span>${currentCount}/${maxCount}</span>
              </div>
              <div class="joined-chips">
                ${playerChipsHtml}
              </div>
            </div>
          </div>
          <div class="match-footer">
            <div>
              ${(isCreator || isAdmin) ? `
                <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;" onclick="matchmakingManager.deleteMatch('${m.id}')">
                  <i class="fa-solid fa-trash"></i> Hủy kèo
                </button>
              ` : `<span style="font-size: 0.75rem; color: #94a3b8;">Người tạo: ${m.creatorName}</span>`}
            </div>
            <div>
              ${isJoined ? `
                <button class="btn btn-secondary btn-sm" onclick="matchmakingManager.leaveMatch('${m.id}')">
                  <i class="fa-solid fa-right-from-bracket"></i> Rút lui
                </button>
              ` : `
                <button class="btn btn-primary btn-sm" ${currentCount >= maxCount ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''} onclick="matchmakingManager.joinMatch('${m.id}')">
                  <i class="fa-solid fa-handshake"></i> ${currentCount >= maxCount ? 'Đã đủ' : 'Tham gia ngay'}
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  }
}

window.matchmakingManager = new MatchmakingManager();
