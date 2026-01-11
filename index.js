import 'dotenv/config';
import Parser from "rss-parser";

const parser = new Parser();

// --- Telegram Bot Info ---
const BOT_TOKEN = process.env.BOT_TOKEN || "8563264926:AAFtaLS_XqfRPRksF5L_5YxtA12zT6Mv6-A";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --- Poll Telegram updates ---
let offset = 0;

// --- Helpers for HTML escaping ---
function escapeHTML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

async function getTopHeadlines(keyword, limit = 10) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
  const feed = await parser.parseURL(rssUrl);
  // Return title + link for each item
  return feed.items.slice(0, limit).map(item => ({
    title: item.title || "",
    link: item.link || ""
  }));
}

async function handleUpdate(update) {
  const message = update.message;
  if (!message || !message.text) return;

  const chat_id = message.chat.id;
  const keyword = message.text.trim();
  if (!keyword) return;

  const limit = 10;

  try {
    const headlines = await getTopHeadlines(keyword, limit);
    if (headlines.length === 0) {
      await sendMessage(chat_id, `No recent headlines found for "<b>${escapeHTML(keyword)}</b>".`);
    } else {
      const msg = headlines
        .map((h, i) => {
          const title = escapeHTML(h.title);
          const url = escapeAttr(h.link);
          // Make title clickable with HTML parse_mode
          return `📰 ${i + 1}. <a href="${url}">${title}</a>`;
        })
        .join("\n\n");

      await sendMessage(
        chat_id,
        `Top ${headlines.length} headlines for "<b>${escapeHTML(keyword)}</b>":\n\n${msg}`
      );
    }
  } catch (err) {
    console.error("Error fetching headlines:", err);
    await sendMessage(chat_id, `Failed to fetch headlines for "<b>${escapeHTML(keyword)}</b>".`);
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
