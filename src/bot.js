// Главный файл бота
import { Telegraf } from "telegraf";
import cron from "node-cron";
import { BOT_TOKEN } from "./config/constants.js";
import { connectDatabase } from "./config/database.js";
import { scheduleAllUsersNotifications } from "./services/schedulerService.js";
import {
  handleStart,
  handleLocation,
  handleShowRegions,
  handleRegionSelection,
  handleCityCode,
  handleLocationCallback,
  handleMinutesBeforeInput,
  handleFajrTest,
  handleDhuhrTest,
  handleAsrTest,
  handleMaghribTest,
  handleIshaTest,
} from "./handlers/commandHandlers.js";

// Инициализация бота
const bot = new Telegraf(BOT_TOKEN);
let chatId = null;

// Функция для установки chatId
function setChatId(id) {
  chatId = id;
}

// Регистрация обработчиков команд
bot.start((ctx) => handleStart(ctx, setChatId));
bot.command("location", handleLocation);
bot.command("fajr", handleFajrTest);
bot.command("dhuhr", handleDhuhrTest);
bot.command("asr", handleAsrTest);
bot.command("maghrib", handleMaghribTest);
bot.command("isha", handleIshaTest);

// Обработка callback-ов (кнопок)
bot.action("show_regions", handleShowRegions);
bot.action("back_to_main", async (ctx) => {
  await ctx.editMessageText(
    `🕌 *Ассаламу алейкум!*\n\n` +
      `Добро пожаловать в бот для оповещения о времени намаза.\n\n` +
      `Пожалуйста, выберите ваш город:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🏙 Бишкек", callback_data: "location_1" },
            { text: "🏙 Ош", callback_data: "location_2" },
          ],
          [{ text: "📍 Другие города", callback_data: "show_regions" }],
        ],
      },
    }
  );
});

// Обработка выбора региона
bot.action(/^region_(.+)$/, (ctx) => {
  const regionKey = ctx.match[1];
  return handleRegionSelection(ctx, regionKey);
});

// Обработка выбора конкретного города
bot.action(/^location_(\d+)$/, (ctx) => {
  const locationCode = parseInt(ctx.match[1]);
  return handleLocationCallback(ctx, locationCode, setChatId);
});

// Обработка текстовых сообщений (коды городов и minutesBefore)
bot.on("text", async (ctx) => {
  const text = ctx.message.text;
  // Если это не команда
  if (!text.startsWith("/")) {
    // Сначала проверяем, ждем ли мы ввод minutesBefore
    const handled = await handleMinutesBeforeInput(ctx, setChatId);
    if (handled) return;

    // Если не обработали как minutesBefore, пробуем обработать как код города
    return handleCityCode(ctx, setChatId);
  }
});

// Запуск бота
export async function startBot() {
  console.log("🔄 Запуск бота...");

  // Подключение к MongoDB
  await connectDatabase();

  // Загружаем расписание для всех пользователей при старте
  console.log("📅 Загрузка расписания для всех пользователей...");
  await scheduleAllUsersNotifications(bot);
  console.log("✅ Расписание загружено!");

  // Каждый день в 00:30 по Бишкеку перезагружаем расписание для всех
  cron.schedule("30 0 * * *", async () => {
    console.log("🔄 Обновление расписания намазов (00:30)");
    await scheduleAllUsersNotifications(bot);
  });

  console.log("🚀 Запуск Telegram бота...");
  await bot.launch({
    dropPendingUpdates: true,
  });
  console.log("🤖 Бот запущен!");
}

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
