import 'dotenv/config';
import Parser from "rss-parser";

const parser = new Parser();

// --- Telegram Bot Info ---
const BOT_TOKEN = process.env.BOT_TOKEN || "8563264926:AAFtaLS_XqfRPRksF5L_5YxtA12zT6Mv6-A";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --- Poll Telegram updates ---
let offset = 0;

// --- Functions ---
async function getUpdates() {
    const res = await fetch(`${TELEGRAM_API}/getUpdates?timeout=30&offset=${offset}`);
    const data = await res.json();
    return data.ok ? data.result : [];
}

async function sendMessage(chat_id, text) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text, parse_mode: "HTML" })
    });
}

async function getTopHeadlines(keyword, limit = 5) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
    const feed = await parser.parseURL(rssUrl);
    return feed.items.slice(0, limit).map(item => item.title);
}

async function handleUpdate(update) {
    const message = update.message;
    if (!message || !message.text) return;

    const chat_id = message.chat.id;
    const keyword = message.text.trim();
    if (!keyword) return;

    try {
        const headlines = await getTopHeadlines(keyword, 5);
        if (headlines.length === 0) {
            await sendMessage(chat_id, `No recent headlines found for "<b>${keyword}</b>".`);
        } else {
            const msg = headlines.map((h, i) => `📰 ${i + 1}. ${h}`).join("\n\n");
            await sendMessage(chat_id, `Top 5 headlines for "<b>${keyword}</b>":\n\n${msg}`);
        }
    } catch (err) {
        console.error("Error fetching headlines:", err);
        await sendMessage(chat_id, `Failed to fetch headlines for "<b>${keyword}</b>".`);
    }
}

// --- Main loop ---
async function main() {
    console.log("Telegram keyword bot running...");

    setInterval(async () => {
        try {
            const updates = await getUpdates();
            for (const update of updates) {
                offset = update.update_id + 1;
                await handleUpdate(update);
            }
        } catch (err) {
            console.error("Error handling updates:", err);
        }
    }, 2000); // poll every 2 seconds
}

main();
