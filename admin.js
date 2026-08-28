/**
 * ĐOÀN THƯỢNG BADMINTON - ADMIN PANEL CONTROLLER
 * Quyền hạn của 2 Admin (Nguyễn Đức Nhật Minh & Nguyễn Đức Hiếu):
 * - Cộng/trừ điểm xếp hạng BWF (Đơn & Đôi)
 * - Quản lý thành viên (Thêm, Xóa, Đổi mật khẩu học sinh, Khóa tài khoản)
 * - Quản lý cặp đôi & Cấu hình Realtime Database
 */

class AdminManager {
  constructor() {
    this.currentSection = 'points';
    this.init();
  }

  init() {
  }

  setSection(section) {
    this.currentSection = section;
    document.querySelectorAll('.admin-menu-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });

    document.querySelectorAll('.admin-sub-section').forEach(sec => {
      sec.style.display = sec.dataset.section === section ? 'block' : 'none';
    });

    if (section === 'points') this.renderPointsSection();
    else if (section === 'members') this.renderMembersSection();
    else if (section === 'pairs') this.renderPairsSection();
    else if (section === 'sync') this.renderSyncSection();
  }

  renderPointsSection() {
    const targetType = document.getElementById('admin-point-target-type');
    const targetSelect = document.getElementById('admin-point-target-select');
    if (!targetSelect) return;

    const isSingle = !targetType || targetType.value === 'single';
    let options = '<option value="">-- Chọn VĐV hoặc Cặp Đôi --</option>';

    if (isSingle) {
      const users = window.authManager.users || {};
      for (let uname in users) {
        const u = users[uname];
        options += `<option value="${u.username}">[Đơn] ${u.fullName} (@${u.username} - Lớp ${u.classGroup} - ${u.gender === 'nam' ? 'Nam' : 'Nữ'})</option>`;
      }
    } else {
      const pairs = window.doublesManager.pairs || {};
      for (let pid in pairs) {
        const p = pairs[pid];
        if (p.status === 'accepted') {
          const catName = p.category === 'MD' ? 'Đôi Nam' : (p.category === 'WD' ? 'Đôi Nữ' : 'Đôi Nam Nữ');
          options += `<option value="${p.id}">[${catName}] ${p.player1Name} & ${p.player2Name} (${p.player1Class}/${p.player2Class})</option>`;
        }
      }
    }

    targetSelect.innerHTML = options;
  }

  async submitPointAdjustment(formData) {
    if (!window.authManager.isAdmin()) throw new Error("Chỉ Admin mới có quyền cộng/trừ điểm!");

    const targetType = formData.targetType;
    const targetId = formData.targetId;
    const action = formData.action;
    const amount = parseInt(formData.amount);
    const tournamentName = formData.tournamentName.trim() || 'Giải Cầu Lông Đoàn Thượng';
    const reason = formData.reason.trim();

    if (!targetId) throw new Error("Vui lòng chọn đối tượng được cộng/trừ điểm!");
    if (isNaN(amount) || amount <= 0) throw new Error("Số điểm phải lớn hơn 0!");

    const delta = action === 'add' ? amount : -amount;

    if (targetType === 'single') {
      const u = window.authManager.users[targetId];
      if (!u) throw new Error("Vận động viên không tồn tại!");

      const field = u.gender === 'nam' ? 'pointsMS' : 'pointsWS';
      const currentPts = u[field] || 0;
      const newPts = Math.max(0, currentPts + delta);

      await window.realtimeDB.update(`users/${targetId}`, {
        [field]: newPts,
        tournamentsCount: (u.tournamentsCount || 1) + (action === 'add' ? 1 : 0)
      });
    } else {
      const p = window.doublesManager.pairs[targetId];
      if (!p) throw new Error("Cặp đôi không tồn tại!");

      const currentPts = p.points || 0;
      const newPts = Math.max(0, currentPts + delta);

      await window.realtimeDB.update(`pairs/${targetId}`, {
        points: newPts,
        tournamentsCount: (p.tournamentsCount || 1) + (action === 'add' ? 1 : 0)
      });
    }

    window.app.showToast(`Đã ${action === 'add' ? 'cộng' : 'trừ'} ${amount.toLocaleString()} điểm thành công!`, "success");
  }

  renderMembersSection() {
    const tbody = document.getElementById('admin-members-tbody');
    if (!tbody) return;

    const users = window.authManager.users || {};
    let html = '';

    for (let uname in users) {
      const u = users[uname];
      const isAdmin = u.role === 'admin';
      const initial = (u.fullName || u.username).charAt(0).toUpperCase();

      html += `
        <tr>
          <td>
            <div class="player-cell">
              <div class="player-avatar" style="width: 34px; height: 34px; font-size: 0.8rem;">${initial}</div>
              <div>
                <strong>${u.fullName}</strong>
                <div style="font-size: 0.75rem; color: #94a3b8;">@${u.username}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="tag-class">${u.classGroup || 'N/A'}</span>
          </td>
          <td>
            ${u.gender === 'nam' ? 'Nam (MS)' : 'Nữ (WS)'}
          </td>
          <td>
            <span class="tag-class" style="background: ${isAdmin ? '#fee2e2; color: #b91c1c;' : '#f1f5f9; color: #475569;'}">
              ${isAdmin ? '🛡️ Admin' : 'Học sinh'}
            </span>
          </td>
          <td style="font-weight: 700; color: var(--bwf-navy-dark);">
            ${u.gender === 'nam' ? (u.pointsMS || 0).toLocaleString() : (u.pointsWS || 0).toLocaleString()} PTS
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" onclick="adminManager.promptChangePassword('${u.username}')" title="Đổi mật khẩu">
                <i class="fa-solid fa-key"></i>
              </button>
              ${!isAdmin ? `
                <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;" onclick="adminManager.deleteMember('${u.username}')" title="Xóa thành viên">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  }

  async promptChangePassword(username) {
    const newPass = prompt(`Nhập mật khẩu mới cho tài khoản @${username}:`);
    if (!newPass) return;
    if (newPass.length < 4) {
      alert("Mật khẩu phải có ít nhất 4 ký tự!");
      return;
    }

    await window.realtimeDB.update(`users/${username}`, { password: newPass });
    window.app.showToast(`Đã đổi mật khẩu cho @${username} thành công!`, "success");
  }

  async deleteMember(username) {
    if (!confirm(`Bạn có chắc chắn muốn xóa thành viên @${username} khỏi hệ thống không?`)) return;
    await window.realtimeDB.remove(`users/${username}`);
    window.app.showToast(`Đã xóa thành viên @${username}`, "info");
    this.renderMembersSection();
  }

  async addNewMemberManual(formData) {
    const username = formData.username.trim().toLowerCase();
    const password = formData.password.trim();
    const fullName = formData.fullName.trim();
    const classGroup = formData.classGroup.trim();
    const gender = formData.gender;
    const role = formData.role || 'member';

    if (!username || !password || !fullName || !classGroup) {
      throw new Error("Vui lòng điền đủ thông tin!");
    }

    if (window.authManager.users[username]) {
      throw new Error("Tên đăng nhập này đã tồn tại!");
    }

    const newUser = {
      username: username,
      password: password,
      fullName: fullName,
      classGroup: classGroup,
      gender: gender,
      dominantHand: 'Phải',
      role: role,
      pointsMS: gender === 'nam' ? 1000 : 0,
      pointsWS: gender === 'nu' ? 1000 : 0,
      pointsMD: 0,
      pointsWD: 0,
      pointsXD: 0,
      avatar: "",
      createdAt: new Date().toISOString()
    };

    await window.realtimeDB.set(`users/${username}`, newUser);
    window.app.showToast(`Đã thêm thành viên ${fullName} thành công!`, "success");
  }

  renderPairsSection() {
    const tbody = document.getElementById('admin-pairs-tbody');
    if (!tbody) return;

    const pairs = window.doublesManager.pairs || {};
    let html = '';

    for (let pid in pairs) {
      const p = pairs[pid];
      const catName = p.category === 'MD' ? 'Đôi Nam' : (p.category === 'WD' ? 'Đôi Nữ' : 'Đôi Nam Nữ');

      html += `
        <tr>
          <td>
            <span class="match-category" style="font-size: 0.72rem; padding: 2px 6px;">${catName}</span>
          </td>
          <td>
            <strong>${p.player1Name}</strong> (@${p.player1} - Lớp ${p.player1Class})
          </td>
          <td>
            <strong>${p.player2Name}</strong> (@${p.player2} - Lớp ${p.player2Class})
          </td>
          <td>
            <span class="tag-class" style="background: #dcfce7; color: #15803d;">Đã duyệt</span>
          </td>
          <td style="font-weight: 700; color: var(--bwf-red);">
            ${(p.points || 0).toLocaleString()} PTS
          </td>
          <td>
            <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;" onclick="adminManager.deletePair('${p.id}')">
              <i class="fa-solid fa-trash"></i> Hủy
            </button>
          </td>
        </tr>
      `;
    }

    if (!html) {
      html = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">Chưa có cặp đôi nào được xác nhận.</td></tr>';
    }

    tbody.innerHTML = html;
  }

  async deletePair(pairId) {
    if (!confirm("Bạn có chắc muốn xóa cặp đôi này?")) return;
    await window.realtimeDB.remove(`pairs/${pairId}`);
    window.app.showToast("Đã xóa cặp đôi", "info");
    this.renderPairsSection();
  }

  renderSyncSection() {
    const configInput = document.getElementById('admin-custom-firebase-input');
    if (!configInput) return;

    const saved = localStorage.getItem('DT_CUSTOM_FIREBASE_CONFIG');
    if (saved) {
      configInput.value = saved;
    }
  }

  saveCustomFirebaseConfig() {
    const input = document.getElementById('admin-custom-firebase-input');
    if (!input) return;

    const val = input.value.trim();
    if (!val) {
      localStorage.removeItem('DT_CUSTOM_FIREBASE_CONFIG');
      window.app.showToast("Đã khôi phục cấu hình Realtime mặc định!", "info");
      setTimeout(() => location.reload(), 800);
      return;
    }

    try {
      JSON.parse(val);
      localStorage.setItem('DT_CUSTOM_FIREBASE_CONFIG', val);
      window.app.showToast("Đã lưu cấu hình Firebase! Đang tải lại...", "success");
      setTimeout(() => location.reload(), 1000);
    } catch (e) {
      alert("Cấu hình Firebase phải là định dạng JSON hợp lệ!");
    }
  }
}

window.adminManager = new AdminManager();
