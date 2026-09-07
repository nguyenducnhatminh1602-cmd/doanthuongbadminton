const { onValueCreated } = require("firebase-functions/v2/database");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendChatNotification = onValueCreated(
  {
    ref: "/chat/{roomKey}/{messageId}",
    region: "asia-southeast1"
  },
  async (event) => {
    const message = event.data.val();
    if (!message || !message.sender) return;

    const roomKey = event.params.roomKey;
    const sender = message.sender;

    let receiver = message.receiver;
    if (!receiver) {
      const parts = String(roomKey).split("__");
      receiver = parts.find((u) => u && u !== sender);
    }

    if (!receiver || receiver === sender) return;

    const db = admin.database();

    const [senderSnap, tokenSnap] = await Promise.all([
      db.ref(`/users/${sender}`).once("value"),
      db.ref(`/users/${receiver}/fcmTokens`).once("value")
    ]);

    const senderUser = senderSnap.val() || {};
    const tokenMap = tokenSnap.val() || {};

    const tokens = Object.keys(tokenMap).map((encoded) => {
      try { return decodeURIComponent(encoded); }
      catch (_) { return encoded; }
    }).filter(Boolean);

    if (!tokens.length) {
      logger.info(`Không có FCM token cho ${receiver}`);
      return;
    }

    const senderName = senderUser.fullName || sender;
    let body = message.type === "image"
      ? "📷 Đã gửi một ảnh"
      : String(message.text || "Đã gửi một tin nhắn");

    if (body.length > 100) body = body.slice(0, 100) + "…";

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        title: `💬 Tin nhắn từ ${senderName}`,
        body,
        sender,
        receiver,
        roomKey,
        messageId: String(event.params.messageId)
      }
    });

    const cleanup = [];
    response.responses.forEach((result, index) => {
      const code = result.error && result.error.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        const rawToken = tokens[index];
        cleanup.push(
          db.ref(`/users/${receiver}/fcmTokens/${encodeURIComponent(rawToken)}`).remove()
        );
      }
    });

    await Promise.all(cleanup);
    logger.info(`Chat push ${sender} -> ${receiver}: ${response.successCount} OK, ${response.failureCount} lỗi`);
  }
);
