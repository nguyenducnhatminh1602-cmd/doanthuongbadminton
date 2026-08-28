/**
 * ĐOÀN THƯỢNG BADMINTON - BWF REALTIME CLOUD ENGINE
 * Hỗ trợ đồng bộ đa thiết bị tức thì (Real-time Multi-device Sync)
 * Chạy trực tiếp trên GitHub Pages bằng Firebase Realtime Database hoặc Local CloudSync.
 */

const DEFAULT_FIREBASE_CONFIG = null;

class RealtimeEngine {
  constructor() {
    this.isFirebaseReady = false;
    this.db = null;
    this.listeners = {};
    this.storageKey = 'DT_BADMINTON_LOCAL_DB_V2';
    this.init();
  }

  init() {
    // 1. Khởi tạo dữ liệu mặc định ban đầu nếu chưa có
    this.seedInitialData();

    // 2. Kiểm tra cấu hình Firebase tùy chỉnh từ localStorage
    let config = null;
    try {
      const customConfig = localStorage.getItem('DT_CUSTOM_FIREBASE_CONFIG');
      if (customConfig) {
        config = JSON.parse(customConfig);
      }
    } catch (e) {
      console.warn("Lỗi đọc custom config:", e);
    }

    // 3. Khởi tạo Firebase nếu có cấu hình hợp lệ
    if (config && config.apiKey && config.databaseURL && window.firebase) {
      try {
        if (!window.firebase.apps || !window.firebase.apps.length) {
          window.firebase.initializeApp(config);
        }
        this.db = window.firebase.database();
        this.isFirebaseReady = true;
        console.log("🏸 Firebase Realtime Database đã kết nối thành công!");
      } catch (e) {
        console.warn("⚠️ Lỗi kết nối Firebase, chuyển sang chế độ tự động:", e.message);
        this.isFirebaseReady = false;
      }
    }

    // 4. Lắng nghe BroadcastChannel để đồng bộ tức thì giữa các tab cùng trình duyệt
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('dt_badminton_sync_channel_v2');
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DATA_UPDATED') {
          this.triggerLocalListeners(event.data.path, event.data.data);
        }
      };
    }
  }

  seedInitialData() {
    let db = this.getLocalDb();
    if (!db.users || !db.users.nguyenducnhatminh) {
      db = {
        users: {
          "nguyenducnhatminh": {
            username: "nguyenducnhatminh",
            password: "minh226899@",
            fullName: "Nguyễn Đức Nhật Minh",
            role: "admin",
            gender: "nam",
            classGroup: "Ban Quản Trị",
            dominantHand: "Phải",
            pointsMS: 12500,
            pointsMD: 11200,
            pointsXD: 9800,
            avatar: "",
            createdAt: new Date().toISOString()
          },
          "nguyenduchieu": {
            username: "nguyenduchieu",
            password: "minh 226899@",
            fullName: "Nguyễn Đức Hiếu",
            role: "admin",
            gender: "nam",
            classGroup: "Ban Quản Trị",
            dominantHand: "Phải",
            pointsMS: 11800,
            pointsMD: 11200,
            pointsXD: 10400,
            avatar: "",
            createdAt: new Date().toISOString()
          },
          "tranvanan": {
            username: "tranvanan",
            password: "123",
            fullName: "Trần Văn An",
            role: "member",
            gender: "nam",
            classGroup: "12A1",
            dominantHand: "Phải",
            pointsMS: 9600,
            pointsMD: 8200,
            pointsXD: 7500,
            avatar: "",
            createdAt: new Date().toISOString()
          },
          "nguyenthimai": {
            username: "nguyenthimai",
            password: "123",
            fullName: "Nguyễn Thị Mai",
            role: "member",
            gender: "nu",
            classGroup: "11B2",
            dominantHand: "Trái",
            pointsWS: 10500,
            pointsWD: 9200,
            pointsXD: 9800,
            avatar: "",
            createdAt: new Date().toISOString()
          },
          "lethithao": {
            username: "lethithao",
            password: "123",
            fullName: "Lê Thị Thảo",
            role: "member",
            gender: "nu",
            classGroup: "12A3",
            dominantHand: "Phải",
            pointsWS: 9800,
            pointsWD: 9200,
            pointsXD: 8400,
            avatar: "",
            createdAt: new Date().toISOString()
          },
          "phamhoangnam": {
            username: "phamhoangnam",
            password: "123",
            fullName: "Phạm Hoàng Nam",
            role: "member",
            gender: "nam",
            classGroup: "10C1",
            dominantHand: "Phải",
            pointsMS: 8900,
            pointsMD: 8200,
            pointsXD: 0,
            avatar: "",
            createdAt: new Date().toISOString()
          }
        },
        pairs: {
          "pair_1": {
            id: "pair_1",
            category: "MD",
            player1: "nguyenducnhatminh",
            player2: "nguyenduchieu",
            player1Name: "Nguyễn Đức Nhật Minh",
            player2Name: "Nguyễn Đức Hiếu",
            player1Class: "BQT",
            player2Class: "BQT",
            status: "accepted",
            points: 11200,
            tournamentsCount: 4,
            createdAt: new Date().toISOString()
          },
          "pair_2": {
            id: "pair_2",
            category: "WD",
            player1: "nguyenthimai",
            player2: "lethithao",
            player1Name: "Nguyễn Thị Mai",
            player2Name: "Lê Thị Thảo",
            player1Class: "11B2",
            player2Class: "12A3",
            status: "accepted",
            points: 9200,
            tournamentsCount: 3,
            createdAt: new Date().toISOString()
          },
          "pair_3": {
            id: "pair_3",
            category: "XD",
            player1: "nguyenduchieu",
            player2: "nguyenthimai",
            player1Name: "Nguyễn Đức Hiếu",
            player2Name: "Nguyễn Thị Mai",
            player1Class: "BQT",
            player2Class: "11B2",
            status: "accepted",
            points: 10400,
            tournamentsCount: 4,
            createdAt: new Date().toISOString()
          }
        },
        matches: {
          "match_1": {
            id: "match_1",
            title: "Giao lưu đôi nam cuối tuần",
            timeFrame: "17:00 - 19:00 Thứ 7",
            location: "Sân thể chất Trường THPT Đoàn Thượng",
            category: "Đôi Nam",
            level: "Khá - Tốt",
            maxPlayers: 4,
            creatorUsername: "nguyenducnhatminh",
            creatorName: "Nguyễn Đức Nhật Minh",
            joinedPlayers: [
              { username: "nguyenducnhatminh", fullName: "Nguyễn Đức Nhật Minh", classGroup: "Ban Quản Trị" },
              { username: "nguyenduchieu", fullName: "Nguyễn Đức Hiếu", classGroup: "Ban Quản Trị" },
              { username: "tranvanan", fullName: "Trần Văn An", classGroup: "12A1" }
            ],
            notes: "Chuẩn bị cầu Thành Công, mang giày thể thao chuẩn sân.",
            status: "open",
            createdAt: new Date().toISOString()
          }
        },
        news: {
          "news_1": {
            id: "news_1",
            title: "Khai mạc Bảng Xếp Hạng Đoàn Thượng Badminton 2026",
            category: "Giải đấu",
            date: new Date().toLocaleDateString('vi-VN'),
            author: "Ban Quản Trị",
            content: "Chào mừng tất cả các bạn học sinh tham gia hệ thống xếp hạng BWF Đoàn Thượng. Bảng xếp hạng cập nhật liên tục thành tích các nội dung Đơn Nam, Đơn Nữ, Đôi Nam, Đôi Nữ và Đôi Nam Nữ.",
            imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80",
            documents: [
              { name: "Dieu_Le_Giai_Cau_Long_Doan_Thuong_2026.pdf", url: "#", size: "1.2 MB" }
            ],
            createdAt: new Date().toISOString()
          }
        },
        friends: {},
        friendRequests: {},
        pairRequests: {},
        chat: {},
        pointLogs: []
      };
      this.saveLocalDb(db);
    }
  }

  getLocalDb() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  saveLocalDb(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      if (this.channel) {
        this.channel.postMessage({ type: 'DATA_UPDATED', path: 'root', data });
      }
    } catch (e) {
      console.warn("Lỗi lưu local DB:", e);
    }
  }

  listen(path, callback) {
    if (!this.listeners[path]) {
      this.listeners[path] = [];
    }
    this.listeners[path].push(callback);

    const db = this.getLocalDb();
    const val = this.getValueByPath(db, path);
    callback(val);

    if (this.isFirebaseReady && this.db) {
      try {
        const ref = this.db.ref(path);
        ref.on('value', (snapshot) => {
          const cloudVal = snapshot.val();
          if (cloudVal !== null && cloudVal !== undefined) {
            const currentDb = this.getLocalDb();
            this.setValueByPath(currentDb, path, cloudVal);
            this.saveLocalDb(currentDb);
            callback(cloudVal);
          }
        }, (err) => {
          console.warn("Firebase listener notice:", err.message);
        });
      } catch (e) {
        console.warn("Firebase ref error:", e);
      }
    }
  }

  triggerLocalListeners(path, rootData) {
    const data = rootData || this.getLocalDb();
    for (let p in this.listeners) {
      const val = this.getValueByPath(data, p);
      this.listeners[p].forEach(cb => {
        try { cb(val); } catch (e) { console.error(e); }
      });
    }
  }

  getValueByPath(obj, path) {
    if (!path || path === 'root') return obj;
    const parts = path.split('/');
    let curr = obj;
    for (let part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        return null;
      }
    }
    return curr;
  }

  setValueByPath(obj, path, value) {
    const parts = path.split('/');
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!curr[p] || typeof curr[p] !== 'object') {
        curr[p] = {};
      }
      curr = curr[p];
    }
    curr[parts[parts.length - 1]] = value;
  }

  async set(path, data) {
    const db = this.getLocalDb();
    this.setValueByPath(db, path, data);
    this.saveLocalDb(db);
    this.triggerLocalListeners(path, db);

    if (this.isFirebaseReady && this.db) {
      try {
        await this.db.ref(path).set(data);
      } catch (e) {
        console.warn("Firebase set notice:", e.message);
      }
    }
    return true;
  }

  async update(path, updates) {
    const db = this.getLocalDb();
    let current = this.getValueByPath(db, path);
    if (!current || typeof current !== 'object') {
      current = {};
    }
    Object.assign(current, updates);
    this.setValueByPath(db, path, current);
    this.saveLocalDb(db);
    this.triggerLocalListeners(path, db);

    if (this.isFirebaseReady && this.db) {
      try {
        await this.db.ref(path).update(updates);
      } catch (e) {
        console.warn("Firebase update notice:", e.message);
      }
    }
    return true;
  }

  async remove(path) {
    const db = this.getLocalDb();
    const parts = path.split('/');
    if (parts.length === 1) {
      delete db[parts[0]];
    } else {
      let parent = db;
      for (let i = 0; i < parts.length - 1; i++) {
        parent = parent[parts[i]];
        if (!parent) break;
      }
      if (parent) {
        delete parent[parts[parts.length - 1]];
      }
    }
    this.saveLocalDb(db);
    this.triggerLocalListeners(path, db);

    if (this.isFirebaseReady && this.db) {
      try {
        await this.db.ref(path).remove();
      } catch (e) {
        console.warn("Firebase remove notice:", e.message);
      }
    }
    return true;
  }
}

window.realtimeDB = new RealtimeEngine();
