import 'dotenv/config';
import Parser from "rss-parser";
import fetch from "node-fetch";
import axios from "axios";
import FormData from "form-data";

const parser = new Parser();

// --- Telegram Bot Info ---
const BOT_TOKEN = process.env.BOT_TOKEN || "8563264926:AAFtaLS_XqfRPRksF5L_5YxtA12zT6Mv6-A";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
let offset = 0;

// --- Helper Functions ---
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

async function sendAudio(chat_id, audioBuffer, title='audio.mp3') {
    const form = new FormData();
    form.append('chat_id', chat_id);
    form.append('audio', audioBuffer, {
        filename: title,
        contentType: 'audio/mpeg'
    });

    await fetch(`${TELEGRAM_API}/sendAudio`, {
        method: "POST",
        body: form
    });
}

async function getTopHeadlines(keyword, limit = 5) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
    const feed = await parser.parseURL(rssUrl);
    return feed.items.slice(0, limit).map(item => item.title);
}

function isYoutubeUrl(text) {
    return /(youtube\.com|youtu\.be)/i.test(text);
}

async function handleUpdate(update) {
    const message = update.message;
    if (!message || !message.text) return;

    const chat_id = message.chat.id;
    const text = message.text.trim();
    if (!text) return;

    try {
        if (isYoutubeUrl(text)) {
            await sendMessage(chat_id, "Converting YouTube to MP3...");

            // Step 1: Get MP3 link from ytmp3.ai
            const ytmp3Response = await axios.post(
                'https://ytmp3.ai/api/ajax/search',
                new URLSearchParams({ q: text }).toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }}
            );

            const mp3Link = ytmp3Response.data?.links?.mp3;
            const title = (ytmp3Response.data?.title || 'audio') + '.mp3';

            if (!mp3Link) {
                await sendMessage(chat_id, 'Sorry, conversion failed. Try another YouTube link.');
                return;
            }

            // Step 2: Download MP3 as buffer
            const audioResp = await axios.get(mp3Link, { responseType: 'arraybuffer' });
            const audioBuffer = Buffer.from(audioResp.data);

            // Step 3: Send MP3 file
            await sendAudio(chat_id, audioBuffer, title);

        } else {
            const headlines = await getTopHeadlines(text, 5);
            if (headlines.length === 0) {
                await sendMessage(chat_id, `No recent headlines found for "<b>${text}</b>".`);
            } else {
                const msg = headlines.map((h, i) => `📰 ${i + 1}. ${h}`).join("\n\n");
                await sendMessage(chat_id, `Top 5 headlines for "<b>${text}</b>":\n\n${msg}`);
            }
        }
    } catch (err) {
        console.error("Error:", err);
        await sendMessage(chat_id, `Failed to process your request for "<b>${text}</b>".`);
    }
}

// --- Main loop ---
async function main() {
    console.log("Telegram news+YouTube MP3 bot running...");

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
