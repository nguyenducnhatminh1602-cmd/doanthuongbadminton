/**
 * ĐOÀN THƯỢNG BADMINTON - AUTHENTICATION & USER MANAGEMENT
 * Xử lý Đăng nhập, Đăng ký, Đổi mật khẩu, Phân quyền Admin / Học sinh
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.users = {};
    this.init();
  }

  init() {
    const savedUser = localStorage.getItem('DT_CURRENT_USER');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }

    window.realtimeDB.listen('users', (usersData) => {
      this.users = usersData || {};
      
      if (this.currentUser && this.users[this.currentUser.username]) {
        this.currentUser = this.users[this.currentUser.username];
        localStorage.setItem('DT_CURRENT_USER', JSON.stringify(this.currentUser));
      }
      
      this.updateAuthUI();
    });
  }

  async login(username, password) {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanUsername || !cleanPassword) {
      throw new Error("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
    }

    const user = this.users[cleanUsername];
    if (!user) {
      throw new Error("Tài khoản không tồn tại trên hệ thống!");
    }

    if (user.password !== cleanPassword) {
      throw new Error("Mật khẩu không chính xác! Vui lòng kiểm tra lại.");
    }

    this.currentUser = user;
    localStorage.setItem('DT_CURRENT_USER', JSON.stringify(user));
    
    await window.realtimeDB.update(`users/${cleanUsername}`, {
      lastActive: new Date().toISOString(),
      isOnline: true
    });

    this.updateAuthUI();
    return user;
  }

  async register(formData) {
    const username = formData.username.trim().toLowerCase();
    const password = formData.password;
    const fullName = formData.fullName.trim();
    const classGroup = formData.classGroup.trim();
    const gender = formData.gender;
    const dominantHand = formData.dominantHand || 'Phải';

    if (!username || !password || !fullName || !classGroup) {
      throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc!");
    }

    if (username.length < 3) {
      throw new Error("Tên đăng nhập phải có ít nhất 3 ký tự!");
    }

    if (password.length < 4) {
      throw new Error("Mật khẩu phải có ít nhất 4 ký tự!");
    }

    if (this.users[username]) {
      throw new Error("Tên đăng nhập này đã được sử dụng! Vui lòng chọn tên khác.");
    }

    const newUser = {
      username: username,
      password: password,
      fullName: fullName,
      classGroup: classGroup,
      gender: gender,
      dominantHand: dominantHand,
      role: 'member',
      pointsMS: gender === 'nam' ? 1000 : 0,
      pointsWS: gender === 'nu' ? 1000 : 0,
      pointsMD: 0,
      pointsWD: 0,
      pointsXD: 0,
      avatar: "",
      createdAt: new Date().toISOString(),
      isOnline: true,
      lastActive: new Date().toISOString()
    };

    await window.realtimeDB.set(`users/${username}`, newUser);

    this.currentUser = newUser;
    localStorage.setItem('DT_CURRENT_USER', JSON.stringify(newUser));
    this.updateAuthUI();

    return newUser;
  }

  async changePassword(oldPassword, newPassword, confirmPassword) {
    if (!this.currentUser) {
      throw new Error("Bạn chưa đăng nhập!");
    }

    if (!newPassword || newPassword.length < 4) {
      throw new Error("Mật khẩu mới phải có ít nhất 4 ký tự!");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Xác nhận mật khẩu mới không trùng khớp!");
    }

    const username = this.currentUser.username;
    const userInDb = this.users[username];

    if (!userInDb || userInDb.password !== oldPassword) {
      throw new Error("Mật khẩu hiện tại không chính xác!");
    }

    await window.realtimeDB.update(`users/${username}`, {
      password: newPassword
    });

    this.currentUser.password = newPassword;
    localStorage.setItem('DT_CURRENT_USER', JSON.stringify(this.currentUser));
    return true;
  }

  async logout() {
    if (this.currentUser) {
      const uname = this.currentUser.username;
      await window.realtimeDB.update(`users/${uname}`, {
        isOnline: false,
        lastActive: new Date().toISOString()
      });
    }
    this.currentUser = null;
    localStorage.removeItem('DT_CURRENT_USER');
    this.updateAuthUI();
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  updateAuthUI() {
    const authLoggedOut = document.getElementById('auth-logged-out');
    const authLoggedIn = document.getElementById('auth-logged-in');
    const adminNavBtn = document.getElementById('nav-admin-btn');
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayRole = document.getElementById('user-display-role');
    const userAvatarSm = document.getElementById('user-avatar-sm');

    if (this.isLoggedIn()) {
      if (authLoggedOut) authLoggedOut.style.display = 'none';
      if (authLoggedIn) authLoggedIn.style.display = 'flex';
      
      if (userDisplayName) userDisplayName.textContent = this.currentUser.fullName || this.currentUser.username;
      if (userDisplayRole) {
        userDisplayRole.textContent = this.currentUser.role === 'admin' ? '🛡️ Admin BQT' : `🏸 Lớp ${this.currentUser.classGroup}`;
      }
      if (userAvatarSm) {
        userAvatarSm.textContent = (this.currentUser.fullName || this.currentUser.username).charAt(0).toUpperCase();
      }

      if (adminNavBtn) {
        adminNavBtn.style.display = this.isAdmin() ? 'flex' : 'none';
      }
    } else {
      if (authLoggedOut) authLoggedOut.style.display = 'flex';
      if (authLoggedIn) authLoggedIn.style.display = 'none';
      if (adminNavBtn) adminNavBtn.style.display = 'none';
    }

    if (window.rankingManager) window.rankingManager.render();
    if (window.doublesManager) window.doublesManager.render();
    if (window.matchmakingManager) window.matchmakingManager.render();
  }
}

window.authManager = new AuthManager();
