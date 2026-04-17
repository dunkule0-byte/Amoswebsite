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

// 3. Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Dynamic Pages (page2, page3, page4)
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', `${page}.html`);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`File not found: ${filePath}`);
            res.status(404).send("Boggaan lama helin (Page not found)");
        }
    });
});

// 5. Start Command (FIXED inline_keyboard error)
bot.start((ctx) => {
    ctx.reply('Ku soo dhowaad Waafi Amaah! 👇', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Bilow Codsiga", web_app: { url: "https://YOUR_DOMAIN_HERE/" } }
                ]
            ]
        }
    });
});

// 6. Handle Web App Data (FINAL FIXED VERSION)
bot.on('message', (ctx) => {
    if (ctx.message?.web_app_data) {
        try {
            const data = JSON.parse(ctx.message.web_app_data.data);

            const summary =
                `✅ CODSI CUSUB WAA LA HELAY!\n\n` +
                `👤 Magaca: ${data.firstName || ''} ${data.lastName || ''}\n` +
                `📞 Taleefanka: +252${data.phone || ''}\n` +
                `💰 Lacagta: $${data.amount || 'N/A'}\n` +
                `📆 Muddada: ${data.duration || 'N/A'}\n` +
                `💼 Shaqada: ${data.jobStatus || 'N/A'}\n` +
                `💵 Dakhliga: $${data.income || 'N/A'}\n` +
                `📝 Ujeedada: ${data.loanPurpose || 'N/A'}\n\n` +
                `⏳ Fadlan dib u eegis ku samee.`;

            ctx.reply(summary);

        } catch (e) {
            console.error("Data error:", e);
            ctx.reply('❌ Cillad ayaa ku dhacday akhrinta xogta.');
        }
    }
});

// 7. Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${PORT}`);
    bot.launch().then(() => console.log('✅ Telegram Bot launched'));
});

// 8. Safe stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
