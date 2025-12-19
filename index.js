import 'dotenv/config';
import Parser from "rss-parser";

const parser = new Parser();

// --- Telegram Bot Info ---
const BOT_TOKEN = process.env.BOT_TOKEN || "8563264926:AAFtaLS_XqfRPRksF5L_5YxtA12zT6Mv6-A";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --- RSS Feed ---
const RSS_URL = "https://news.google.com/rss/search?q=bitcoin&hl=en-US&gl=US&ceid=US:en";

// --- Poll Telegram updates every 2 seconds ---
let offset = 0;

async function getUpdates() {
    const res = await fetch(`${TELEGRAM_API}/getUpdates?timeout=30&offset=${offset}`);
    const data = await res.json();
    if (!data.ok) return [];

    return data.result;
}

async function sendMessage(chat_id, text, keyboard = null) {
    const payload = {
        chat_id,
        text,
        parse_mode: "HTML"
    };
    if (keyboard) payload.reply_markup = keyboard;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

async function getTopHeadlines(limit = 5) {
    const feed = await parser.parseURL(RSS_URL);
    return feed.items.slice(0, limit).map(item => item.title);
}

async function handleUpdate(update) {
    const message = update.message;
    if (!message || !message.text) return;

    const chat_id = message.chat.id;
    const text = message.text;

    // Respond to /start with keyboard
    if (text === "/start") {
        const keyboard = {
            keyboard: [["Top 5 Headlines"]],
            resize_keyboard: true,
            one_time_keyboard: false
        };
        await sendMessage(chat_id, "Choose an option:", keyboard);
    }

    // Respond to keyboard button
    if (text === "Top 5 Headlines") {
        const headlines = await getTopHeadlines(5);
        const msg = headlines.map((h, i) => `📰 ${i + 1}. ${h}`).join("\n\n");
        await sendMessage(chat_id, msg);
    }
}

async function main() {
    console.log("Telegram headlines bot running...");

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
