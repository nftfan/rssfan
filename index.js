import 'dotenv/config';
import Parser from "rss-parser";

const parser = new Parser();

// --- Telegram Bot Info ---
const BOT_TOKEN = process.env.BOT_TOKEN || "8563264926:AAFtaLS_XqfRPRksF5L_5YxtA12zT6Mv6-A";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

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

// --- Core Functions ---
async function sendMessage(chat_id, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: "HTML" })
  });
}

async function getLatestHeadline() {
  const rssUrl = 'https://news.google.com/rss/search?q=%22a%22%20when%3A1h&hl=en-US&gl=US&ceid=US%3Aen';
  const feed = await parser.parseURL(rssUrl);
  const item = feed.items[0];
  return item
    ? {
        title: item.title || "",
        link: item.link || ""
      }
    : null;
}

// --- Auto-send new headline every 5 minutes ---
let lastChatId = null;

// Listen for at least one update to get a chat_id
async function getInitialChatId() {
  // Get the latest message sent to the bot (required for chat_id to send news)
  const res = await fetch(`${TELEGRAM_API}/getUpdates?timeout=30`);
  const data = await res.json();
  if (data.ok && data.result.length > 0) {
    // Get the chat_id from the most recent message
    for (let i = data.result.length - 1; i >= 0; --i) {
      if (data.result[i].message && data.result[i].message.chat) {
        return data.result[i].message.chat.id;
      }
    }
  }
  return null;
}

async function main() {
  console.log("Telegram latest Pakistan news bot running...");

  lastChatId = await getInitialChatId();

  if (!lastChatId) {
    console.error("No chat_id found. Send a message to your bot first on Telegram.");
    return;
  }

  let lastSentHeadline = "";

  setInterval(async () => {
    try {
      const headline = await getLatestHeadline();
      if (!headline) {
        console.log("No headline found.");
        return;
      }

      // Avoid sending the same headline repeatedly
      if (headline.title !== lastSentHeadline) {
        const title = escapeHTML(headline.title);
        const url = escapeAttr(headline.link);
        const msg = `📰 <a href="${url}">${title}</a>`;
        await sendMessage(lastChatId, msg);
        lastSentHeadline = headline.title;
        console.log("Sent headline:", headline.title);
      } else {
        console.log("No new headline to send.");
      }
    } catch (err) {
      console.error("Error fetching/sending headline:", err);
    }
  }, 1 * 60 * 1000); // Every 5 minutes
}

main();
