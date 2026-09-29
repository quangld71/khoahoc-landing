// Nhận webhook từ SePay khi có tiền chuyển vào tài khoản VPBank (AGBSPTHUY76),
// báo qua Telegram để đối chiếu với đăng ký. Cần cấu hình trong Vercel Environment Variables:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (đã có sẵn từ api/register.js)
//   SEPAY_API_KEY — đặt đúng giá trị đã dán vào ô "API Key" lúc tạo webhook trên SePay

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedKey = process.env.SEPAY_API_KEY;
  const authHeader = req.headers['authorization'] || '';
  if (!expectedKey || authHeader !== `Apikey ${expectedKey}`) {
    console.error('SePay webhook: sai hoặc thiếu Authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  const transferType = body.transferType;
  const amount = Number(body.transferAmount) || 0;
  const content = (body.content || body.description || '').toString();
  const gateway = body.gateway || 'Ngân hàng';
  const time = body.transactionDate || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  // Chỉ xử lý tiền chuyển VÀO — bỏ qua các giao dịch chuyển ra
  if (transferType !== 'in') {
    return res.status(200).json({ success: true, skipped: 'not an incoming transfer' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error('Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Notification not configured' });
  }

  const enoughAmount = amount >= 99000;
  const message =
    `💰 <b>ĐÃ NHẬN THANH TOÁN${enoughAmount ? '' : ' — SỐ TIỀN CHƯA ĐỦ'}</b>\n\n` +
    `Số tiền: <b>${amount.toLocaleString('vi-VN')}đ</b>\n` +
    `Nội dung CK: <code>${content}</code>\n` +
    `Ngân hàng: ${gateway}\n` +
    `⏰ ${time}\n\n` +
    `👉 Đối chiếu nội dung CK (thường là SĐT) với tin nhắn đăng ký, rồi thêm khách vào nhóm Zalo + gửi link Zoom.`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error('Telegram API error:', tgData);
      // Vẫn trả success cho SePay để không bị retry liên tục — lỗi Telegram log lại để tự kiểm tra
    }
  } catch (err) {
    console.error('Telegram send error:', err);
  }

  return res.status(200).json({ success: true });
};
