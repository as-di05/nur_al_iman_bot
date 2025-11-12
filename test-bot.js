import { Telegraf } from "telegraf";

const BOT_TOKEN = "8378009940:AAGsJUg2RRhQwFaBeb2KOcuFTwiUq7Cl55U";
const bot = new Telegraf(BOT_TOKEN);

console.log("🔄 Launching test bot...");

bot.launch({
  dropPendingUpdates: true,
}).then(() => {
  console.log("✅ Bot launched successfully!");
}).catch((error) => {
  console.error("❌ Error launching bot:", error);
});
