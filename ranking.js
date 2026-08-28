/**
 * ĐOÀN THƯỢNG BADMINTON - BWF RANKING ENGINE
 * 5 Nội dung chuẩn BWF: Đơn Nam (MS), Đơn Nữ (WS), Đôi Nam (MD), Đôi Nữ (WD), Đôi Nam Nữ (XD)
 */

class RankingManager {
  constructor() {
    this.currentCategory = 'MS';
    this.searchQuery = '';
    this.users = {};
    this.pairs = {};
    this.init();
  }

  init() {
    window.realtimeDB.listen('users', (usersData) => {
      this.users = usersData || {};
      this.render();
      this.updateTopStats();
    });

    window.realtimeDB.listen('pairs', (pairsData) => {
      this.pairs = pairsData || {};
      this.render();
      this.updateTopStats();
    });
  }

  setCategory(category) {
    this.currentCategory = category;
    
    document.querySelectorAll('.cat-tab-btn').forEach(btn => {
      if (btn.dataset.category === category) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.render();
  }

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.render();
  }

  getRankingsData() {
    const cat = this.currentCategory;
    let list = [];

    if (cat === 'MS' || cat === 'WS') {
      const targetGender = cat === 'MS' ? 'nam' : 'nu';
      const pointField = cat === 'MS' ? 'pointsMS' : 'pointsWS';

      for (let uname in this.users) {
        const u = this.users[uname];
        if (u.gender === targetGender) {
          const points = u[pointField] || 0;
          list.push({
            id: u.username,
            type: 'single',
            username: u.username,
            fullName: u.fullName || u.username,
            classGroup: u.classGroup || 'N/A',
            gender: u.gender,
            dominantHand: u.dominantHand || 'Phải',
            points: points,
            tournamentsCount: u.tournamentsCount || Math.max(1, Math.floor(points / 2500) + 1),
            avatar: u.avatar || '',
            role: u.role
          });
        }
      }
    } else {
      for (let pid in this.pairs) {
        const p = this.pairs[pid];
        if (p.category === cat && p.status === 'accepted') {
          list.push({
            id: p.id,
            type: 'pair',
            category: p.category,
            player1: p.player1,
            player2: p.player2,
            player1Name: p.player1Name,
            player2Name: p.player2Name,
            player1Class: p.player1Class || 'CLB',
            player2Class: p.player2Class || 'CLB',
            points: p.points || 0,
            tournamentsCount: p.tournamentsCount || 1,
            createdAt: p.createdAt
          });
        }
      }
    }

    list.sort((a, b) => b.points - a.points);

    if (this.searchQuery) {
      list = list.filter(item => {
        if (item.type === 'single') {
          return item.fullName.toLowerCase().includes(this.searchQuery) ||
                 item.classGroup.toLowerCase().includes(this.searchQuery);
        } else {
          return item.player1Name.toLowerCase().includes(this.searchQuery) ||
                 item.player2Name.toLowerCase().includes(this.searchQuery) ||
                 item.player1Class.toLowerCase().includes(this.searchQuery) ||
                 item.player2Class.toLowerCase().includes(this.searchQuery);
        }
      });
    }

    return list;
  }

  updateTopStats() {
    const totalMembers = Object.keys(this.users).length;
    const acceptedPairs = Object.values(this.pairs).filter(p => p.status === 'accepted').length;

    const statMembersEl = document.getElementById('stat-total-members');
    const statPairsEl = document.getElementById('stat-total-pairs');

    if (statMembersEl) statMembersEl.textContent = totalMembers;
    if (statPairsEl) statPairsEl.textContent = acceptedPairs;
  }

  render() {
    const tbody = document.getElementById('bwf-ranking-tbody');
    if (!tbody) return;

    const data = this.getRankingsData();
    const isDoubles = (this.currentCategory === 'MD' || this.currentCategory === 'WD' || this.currentCategory === 'XD');

    const colNameHeader = document.getElementById('th-player-header');
    if (colNameHeader) {
      colNameHeader.textContent = isDoubles ? 'Cặp Vận Động Viên (Đôi)' : 'Vận Động Viên (Đơn)';
    }

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">🏸</div>
              <h3>Chưa có dữ liệu bảng xếp hạng nội dung này</h3>
              <p>${isDoubles ? 'Hãy vào mục "Ghép đôi" để mời bạn bè tạo cặp đôi và được duyệt lên bảng xếp hạng!' : 'Chưa có vận động viên nào đăng ký nội dung này.'}</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    data.forEach((item, index) => {
      const rank = index + 1;
      
      let rankBadgeClass = 'rank-other';
      if (rank === 1) rankBadgeClass = 'rank-1';
      else if (rank === 2) rankBadgeClass = 'rank-2';
      else if (rank === 3) rankBadgeClass = 'rank-3';

      const deltas = ['up', 'same', 'same', 'up', 'down'];
      const deltaType = deltas[rank % deltas.length];
      let deltaHtml = '';
      if (deltaType === 'up') deltaHtml = '<span class="rank-delta up"><i class="fa-solid fa-caret-up"></i> 1</span>';
      else if (deltaType === 'down') deltaHtml = '<span class="rank-delta down"><i class="fa-solid fa-caret-down"></i> 1</span>';
      else deltaHtml = '<span class="rank-delta same"><i class="fa-solid fa-minus"></i> 0</span>';

      if (!isDoubles) {
        const initial = item.fullName.charAt(0).toUpperCase();
        html += `
          <tr>
            <td style="width: 80px; text-align: center;">
              <span class="rank-badge ${rankBadgeClass}">${rank}</span>
            </td>
            <td style="width: 70px; text-align: center;">
              ${deltaHtml}
            </td>
            <td>
              <div class="player-cell">
                <div class="player-avatar">
                  ${item.avatar ? `<img src="${item.avatar}" alt="${item.fullName}"/>` : initial}
                </div>
                <div class="player-info-meta">
                  <div class="player-name">
                    ${item.fullName}
                    ${item.role === 'admin' ? '<span class="admin-badge-pill">BQT</span>' : ''}
                  </div>
                  <div class="player-sub">
                    Tay thuận: ${item.dominantHand} • @${item.username}
                  </div>
                </div>
              </div>
            </td>
            <td>
              <span class="tag-class">${item.classGroup}</span>
            </td>
            <td style="text-align: center; color: #64748b; font-weight: 600;">
              ${item.tournamentsCount} giải
            </td>
            <td style="text-align: right; padding-right: 24px;">
              <span class="points-badge">${item.points.toLocaleString()}</span>
              <span style="font-size: 0.72rem; color: #94a3b8; display: block;">PTS</span>
            </td>
          </tr>
        `;
      } else {
        const init1 = item.player1Name.charAt(0).toUpperCase();
        const init2 = item.player2Name.charAt(0).toUpperCase();

        html += `
          <tr>
            <td style="width: 80px; text-align: center;">
              <span class="rank-badge ${rankBadgeClass}">${rank}</span>
            </td>
            <td style="width: 70px; text-align: center;">
              ${deltaHtml}
            </td>
            <td>
              <div class="pair-cell">
                <div class="pair-member">
                  <div class="player-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">${init1}</div>
                  <div>
                    <strong style="color: var(--bwf-navy-dark);">${item.player1Name}</strong>
                    <span class="tag-class" style="font-size: 0.68rem; margin-left: 4px;">${item.player1Class}</span>
                  </div>
                </div>
                <div class="pair-member">
                  <div class="player-avatar" style="width: 32px; height: 32px; font-size: 0.75rem; background: #e0e7ff; color: #3730a3;">${init2}</div>
                  <div>
                    <strong style="color: var(--bwf-navy-dark);">${item.player2Name}</strong>
                    <span class="tag-class" style="font-size: 0.68rem; margin-left: 4px;">${item.player2Class}</span>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <span class="tag-class" style="background: #fef3c7; color: #92400e;">Đôi đã xác nhận</span>
            </td>
            <td style="text-align: center; color: #64748b; font-weight: 600;">
              ${item.tournamentsCount} giải
            </td>
            <td style="text-align: right; padding-right: 24px;">
              <span class="points-badge" style="color: var(--bwf-red);">${item.points.toLocaleString()}</span>
              <span style="font-size: 0.72rem; color: #94a3b8; display: block;">PTS</span>
            </td>
          </tr>
        `;
      }
    });

    tbody.innerHTML = html;
  }
}

window.rankingManager = new RankingManager();
