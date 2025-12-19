import fetch from "node-fetch";
import Parser from "rss-parser";
import 'dotenv/config';

const parser = new Parser();

// --- Telegram Bot Info ---
const BOT_TOKEN = "8563264926:AAFtaLS_XqfRPRksF5L_5YxtA12zT6Mv6-A";
const CHAT_ID = "2141064153";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// --- RSS Feed ---
const RSS_URL = "https://news.google.com/rss/search?q=bitcoin&hl=en-US&gl=US&ceid=US:en";

// --- Store sent headlines to avoid duplicates ---
const sentHeadlines = new Set();

// --- Function to fetch RSS and send new headlines ---
async function fetchAndSendHeadlines() {
    try {
        const feed = await parser.parseURL(RSS_URL);
        for (const item of feed.items) {
            if (!item.title) continue;
            if (sentHeadlines.has(item.title)) continue;

            const message = `Just in: ${item.title}`;
            await sendTelegramMessage(message);
            sentHeadlines.add(item.title);

            console.log(`Sent: ${item.title}`);
        }
    } catch (err) {
        console.error("Error fetching RSS:", err);
    }
}

// --- Function to send message to Telegram ---
async function sendTelegramMessage(text) {
    try {
        await fetch(TELEGRAM_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAT_ID, text })
        });
    } catch (err) {
        console.error("Error sending Telegram message:", err);
    }
}

// --- Run every 10 seconds ---
setInterval(fetchAndSendHeadlines, 10000);

console.log("Telegram news bot running...");
