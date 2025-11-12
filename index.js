// Точка входа в приложение
import { startBot } from "./src/bot.js";

startBot().catch((error) => {
  console.error("❌ Ошибка при запуске бота:", error);
  process.exit(1);
});
