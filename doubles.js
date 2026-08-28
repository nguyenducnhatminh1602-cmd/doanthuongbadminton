/**
 * ĐOÀN THƯỢNG BADMINTON - DOUBLES PAIR APPROVAL LOGIC
 * Quy tắc: 1 đôi phải kết bạn và có sự CHẤP THUẬN TỪ CẢ 2 BẠN thì mới được lên bảng xếp hạng.
 */

class DoublesManager {
  constructor() {
    this.pairs = {};
    this.pairRequests = {};
    this.friends = {};
    this.users = {};
    this.init();
  }

  init() {
    window.realtimeDB.listen('pairs', (data) => {
      this.pairs = data || {};
      this.render();
    });

    window.realtimeDB.listen('pairRequests', (data) => {
      this.pairRequests = data || {};
      this.render();
    });

    window.realtimeDB.listen('friends', (data) => {
      this.friends = data || {};
      this.updateFriendsSelect();
    });

    window.realtimeDB.listen('users', (data) => {
      this.users = data || {};
      this.updateFriendsSelect();
    });
  }

  updateFriendsSelect() {
    const select = document.getElementById('doubles-partner-select');
    if (!select || !window.authManager.isLoggedIn()) return;

    const myUsername = window.authManager.currentUser.username;
    const userFriends = this.friends[myUsername] || {};

    let options = '<option value="">-- Chọn một người bạn trong danh sách bạn bè --</option>';
    let hasFriends = false;

    for (let friendUname in userFriends) {
      if (userFriends[friendUname] === 'accepted') {
        const friendUser = this.users[friendUname];
        if (friendUser) {
          hasFriends = true;
          options += `<option value="${friendUname}">${friendUser.fullName} (@${friendUname} - Lớp ${friendUser.classGroup} - ${friendUser.gender === 'nam' ? 'Nam' : 'Nữ'})</option>`;
        }
      }
    }

    if (!hasFriends) {
      options = '<option value="">(Bạn chưa có bạn bè nào. Hãy vào mục "Bạn bè & Chat" để kết bạn trước!)</option>';
    }

    select.innerHTML = options;
  }

  async sendPairRequest(partnerUsername, category) {
    if (!window.authManager.isLoggedIn()) {
      throw new Error("Vui lòng đăng nhập trước!");
    }

    const me = window.authManager.currentUser;
    if (!partnerUsername) {
      throw new Error("Vui lòng chọn người bạn muốn ghép đôi!");
    }

    if (partnerUsername === me.username) {
      throw new Error("Không thể tự ghép đôi với chính mình!");
    }

    const partner = this.users[partnerUsername];
    if (!partner) {
      throw new Error("Không tìm thấy thông tin đối tác!");
    }

    if (category === 'MD') {
      if (me.gender !== 'nam' || partner.gender !== 'nam') {
        throw new Error("Nội dung Đôi Nam (MD) yêu cầu cả 2 vận động viên đều là Nam!");
      }
    } else if (category === 'WD') {
      if (me.gender !== 'nu' || partner.gender !== 'nu') {
        throw new Error("Nội dung Đôi Nữ (WD) yêu cầu cả 2 vận động viên đều là Nữ!");
      }
    } else if (category === 'XD') {
      if (me.gender === partner.gender) {
        throw new Error("Nội dung Đôi Nam Nữ (XD) yêu cầu 1 vận động viên Nam và 1 vận động viên Nữ!");
      }
    }

    for (let pid in this.pairs) {
      const p = this.pairs[pid];
      if (p.category === category && p.status === 'accepted') {
        if ((p.player1 === me.username && p.player2 === partnerUsername) ||
            (p.player1 === partnerUsername && p.player2 === me.username)) {
          throw new Error("Cặp đôi này đã được đăng ký và đang có mặt trên bảng xếp hạng!");
        }
      }
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRequest = {
      id: requestId,
      category: category,
      senderUsername: me.username,
      senderName: me.fullName,
      senderClass: me.classGroup,
      receiverUsername: partnerUsername,
      receiverName: partner.fullName,
      receiverClass: partner.classGroup,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await window.realtimeDB.set(`pairRequests/${requestId}`, newRequest);
    return true;
  }

  async acceptPairRequest(requestId) {
    const req = this.pairRequests[requestId];
    if (!req) throw new Error("Yêu cầu không tồn tại!");

    const me = window.authManager.currentUser;
    if (!me || me.username !== req.receiverUsername) {
      throw new Error("Bạn không có quyền duyệt yêu cầu này!");
    }

    const pairId = `pair_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newPair = {
      id: pairId,
      category: req.category,
      player1: req.senderUsername,
      player2: req.receiverUsername,
      player1Name: req.senderName,
      player2Name: req.receiverName,
      player1Class: req.senderClass,
      player2Class: req.receiverClass,
      status: 'accepted',
      points: 1000,
      tournamentsCount: 0,
      createdAt: new Date().toISOString()
    };

    await window.realtimeDB.set(`pairs/${pairId}`, newPair);
    await window.realtimeDB.update(`pairRequests/${requestId}`, {
      status: 'accepted'
    });

    return true;
  }

  async rejectPairRequest(requestId) {
    const req = this.pairRequests[requestId];
    if (!req) return;

    await window.realtimeDB.update(`pairRequests/${requestId}`, {
      status: 'rejected'
    });
  }

  async dissolvePair(pairId) {
    if (!confirm("Bạn có chắc chắn muốn hủy ghép đôi cặp này không?")) return;
    await window.realtimeDB.remove(`pairs/${pairId}`);
  }

  render() {
    const pendingListEl = document.getElementById('doubles-pending-requests');
    const myPairsListEl = document.getElementById('my-approved-pairs-list');

    if (!window.authManager.isLoggedIn()) {
      if (pendingListEl) pendingListEl.innerHTML = '<p style="color: #94a3b8; font-size: 0.88rem;">Vui lòng đăng nhập để xem lời mời ghép đôi.</p>';
      if (myPairsListEl) myPairsListEl.innerHTML = '<p style="color: #94a3b8; font-size: 0.88rem;">Vui lòng đăng nhập để xem danh sách cặp đôi của bạn.</p>';
      return;
    }

    const myUsername = window.authManager.currentUser.username;

    if (pendingListEl) {
      let pendingHtml = '';
      let hasPending = false;

      for (let reqId in this.pairRequests) {
        const req = this.pairRequests[reqId];
        if (req.receiverUsername === myUsername && req.status === 'pending') {
          hasPending = true;
          const catName = req.category === 'MD' ? 'Đôi Nam' : (req.category === 'WD' ? 'Đôi Nữ' : 'Đôi Nam Nữ');
          pendingHtml += `
            <div class="pair-request-card">
              <div>
                <strong style="color: var(--bwf-navy-dark); font-size: 0.95rem;">🏸 ${req.senderName}</strong>
                <span class="tag-class" style="margin-left: 6px;">Lớp ${req.senderClass}</span>
                <p style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">
                  Đã gửi lời mời ghép đôi nội dung: <strong style="color: var(--bwf-red);">${catName}</strong>
                </p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-success btn-sm" onclick="doublesManager.acceptPairRequest('${req.id}').then(() => app.showToast('Đã chấp thuận cặp đôi thành công!', 'success'))">
                  <i class="fa-solid fa-check"></i> Chấp thuận
                </button>
                <button class="btn btn-secondary btn-sm" onclick="doublesManager.rejectPairRequest('${req.id}')">
                  <i class="fa-solid fa-xmark"></i> Từ chối
                </button>
              </div>
            </div>
          `;
        }
      }

      if (!hasPending) {
        pendingHtml = '<p style="color: #64748b; font-size: 0.85rem;">Không có lời mời ghép đôi nào đang chờ bạn duyệt.</p>';
      }
      pendingListEl.innerHTML = pendingHtml;
    }

    if (myPairsListEl) {
      let myPairsHtml = '';
      let hasPairs = false;

      for (let pid in this.pairs) {
        const p = this.pairs[pid];
        if (p.status === 'accepted' && (p.player1 === myUsername || p.player2 === myUsername)) {
          hasPairs = true;
          const catName = p.category === 'MD' ? 'Đôi Nam' : (p.category === 'WD' ? 'Đôi Nữ' : 'Đôi Nam Nữ');
          const partnerClass = p.player1 === myUsername ? p.player2Class : p.player1Class;

          myPairsHtml += `
            <div style="background: white; border: 1px solid var(--bwf-gray-border); border-radius: var(--radius-md); padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span class="match-category" style="font-size: 0.7rem; padding: 2px 6px;">${catName}</span>
                <strong style="margin-left: 8px; font-size: 0.92rem; color: var(--bwf-navy-dark);">${p.player1Name} & ${p.player2Name}</strong>
                <span class="tag-class" style="margin-left: 6px;">${partnerClass}</span>
                <div style="font-size: 0.78rem; color: var(--bwf-gray-text); margin-top: 4px;">
                  Điểm BWF: <strong style="color: var(--bwf-red);">${(p.points || 0).toLocaleString()} PTS</strong> • Đã lên Bảng xếp hạng ✅
                </div>
              </div>
              <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;" onclick="doublesManager.dissolvePair('${p.id}')">
                <i class="fa-solid fa-user-minus"></i> Hủy đôi
              </button>
            </div>
          `;
        }
      }

      if (!hasPairs) {
        myPairsHtml = '<p style="color: #64748b; font-size: 0.85rem;">Bạn chưa có cặp đôi nào được xác nhận. Hãy gửi lời mời cho bạn bè ở form bên cạnh!</p>';
      }
      myPairsListEl.innerHTML = myPairsHtml;
    }
  }
}

window.doublesManager = new DoublesManager();
