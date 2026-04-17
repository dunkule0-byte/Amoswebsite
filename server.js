const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 1. Initialize Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// 2. Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Main Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Dynamic Pages (page2, page3, etc.)
app.get('/:pageName', (req, res) => {
    const pageName = req.params.pageName;

    res.sendFile(path.join(__dirname, 'public', `${pageName}.html`), (err) => {
        if (err) {
            res.status(404).send("Boggaan lama helin (Page not found)");
        }
    });
});

// 5. START COMMAND (FIXED)
bot.start((ctx) => {
    ctx.reply('Ku soo dhowaad Waafi Amaah! 👇', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "🚀 FUR WAAFI AMAAN",
                        web_app: {
                            url: "https://waafiamaah-production.up.railway.app"
                        }
                    }
                ]
            ]
        }
    });
});

// 6. HANDLE WEB APP DATA
bot.on('message', (ctx) => {
    if (ctx.message.web_app_data) {
        try {
            const data = JSON.parse(ctx.message.web_app_data.data);

            ctx.reply(
                `✅ Codsi waa la helay!\n\n` +
                `💰 Lacagta: $${data.amount || 'N/A'}\n` +
                `📆 Muddada: ${data.duration || 'N/A'} bilood\n` +
                `📝 Sababta: ${data.reason || data.loanPurpose || 'N/A'}\n\n` +
                `⏳ Waxaan kula soo xiriiri doonaa 24 saac gudahood.`
            );

        } catch (e) {
            ctx.reply('❌ Cillad ayaa dhacday.');
        }
    }
});

// 7. START SERVER + BOT
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server live on port ${PORT}`);
    bot.launch();
});

// 8. SAFE STOP
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
