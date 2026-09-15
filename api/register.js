// Nhận đăng ký "Giữ chỗ" từ landing page khóa học, báo qua Telegram.
// Cần cấu hình TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID trong Vercel Environment Variables.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error('Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Notification not configured' });
  }

  const body = req.body || {};
  const phone = (body.phone || '').toString().slice(0, 30).trim();
  if (!phone || phone.replace(/\D/g, '').length < 9) {
    return res.status(400).json({ error: 'Missing or invalid phone' });
  }

  const name = (body.name || 'Chưa để tên').toString().slice(0, 100);
  const email = (body.email || '').toString().slice(0, 100).trim();
  const speaker = (body.speaker || 'Chưa rõ diễn giả').toString().slice(0, 100);
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const message =
    `🎓 <b>GIỮ CHỖ MỚI — LỚP HỌC ZOOM</b>\n\n` +
    `Diễn giả: ${speaker}\n` +
    `Tên: ${name}\n` +
    `SĐT/Zalo: <code>${phone}</code>\n` +
    (email ? `Email: ${email}\n` : '') +
    `\n⏰ ${time}\n` +
    `👉 Nhắn Zalo báo lịch + gửi link Zoom.`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(502).json({ error: 'Telegram send failed', detail: tgData });
    }
  } catch (err) {
    console.error('Telegram send error:', err);
    return res.status(502).json({ error: 'Telegram send failed' });
  }

  return res.status(200).json({ status: 'ok' });
};
