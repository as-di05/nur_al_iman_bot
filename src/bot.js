// Главный файл бота
import express from "express";
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
import {
  handleAdminHelp,
  handleAdminMenu,
  handleCreateCollection,
  handleListCollections,
  handleAddHadithStart,
  handleSelectCollection,
  handleEditHadithStart,
  handleSearchHadithStart,
  handleSearchSelectCollection,
  handleHadithTextInput,
  handleEditFieldSelect,
  handleToggleActive,
  handleUserHadith,
  handleUserEnableHadith,
  handleUserDisableHadith,
  handleUserChangeCollection,
  handleUserSetCollection,
} from "./handlers/hadithHandlers.js";
import { registerChat } from "./services/userService.js";
import { onlyOwnerInGroups, isMainAdmin } from "./middleware/adminCheck.js";
import { scheduleHadithSending } from "./services/hadithScheduler.js";

// Инициализация бота
const bot = new Telegraf(BOT_TOKEN);

// Глобальный middleware - блокирует команды для всех кроме владельца в группах
bot.use(onlyOwnerInGroups);

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

// Команды для хадисов (только для администратора)
bot.command("help_admin", isMainAdmin, handleAdminHelp);
bot.command("hadith_admin", isMainAdmin, handleAdminMenu);

// Команда для пользователей
bot.command("hadith", handleUserHadith);

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

// ==================== CALLBACK ОБРАБОТЧИКИ ДЛЯ ХАДИСОВ ====================

// Админские callback-и
bot.action("hadith_create_collection", handleCreateCollection);
bot.action("hadith_list_collections", handleListCollections);
bot.action("hadith_add_start", handleAddHadithStart);
bot.action("hadith_edit_start", handleEditHadithStart);
bot.action("hadith_search_start", handleSearchHadithStart);

// Выбор коллекции для добавления хадиса
bot.action(/^hadith_select_col_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleSelectCollection(ctx, collectionId);
});

// Выбор коллекции для поиска
bot.action(/^hadith_search_col_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleSearchSelectCollection(ctx, collectionId);
});

// Редактирование полей хадиса
bot.action(/^hadith_edit_(number|contentRu|contentAr|narrators|explanation)$/, (ctx) => {
  const field = ctx.match[1];
  return handleEditFieldSelect(ctx, field);
});

bot.action("hadith_toggle_active", handleToggleActive);

// Пользовательские callback-и
bot.action(/^user_hadith_enable_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleUserEnableHadith(ctx, collectionId);
});

bot.action("user_hadith_disable", handleUserDisableHadith);
bot.action("user_hadith_change_collection", handleUserChangeCollection);

bot.action(/^user_hadith_set_col_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleUserSetCollection(ctx, collectionId);
});

// Обработчик добавления бота в канал/группу
bot.on("my_chat_member", async (ctx) => {
  const { chat, new_chat_member } = ctx.update.my_chat_member;
  const { status } = new_chat_member;

  // Если бот был добавлен как администратор или участник
  if (status === "administrator" || status === "member") {
    const chatId = chat.id;
    const chatType = chat.type; // 'channel', 'group', 'supergroup'
    const chatTitle = chat.title || chat.username || "Без названия";

    console.log(`🎉 Бот добавлен в ${chatType}: ${chatTitle} (ID: ${chatId})`);

    // Автоматически регистрируем канал/группу (по умолчанию Бишкек, 15 минут)
    await registerChat(chatId, chatType, chatTitle, 1, 15);

    // Отправляем приветственное сообщение
    try {
      await ctx.telegram.sendMessage(
        chatId,
        `🕌 *Ассаламу алейкум!*\n\n` +
        `Бот для уведомлений о времени намаза успешно добавлен!\n\n` +
        `📍 *Настройки по умолчанию:*\n` +
        `• Город: Бишкек\n` +
        `• Уведомления: за 15 минут до намаза\n` +
        `• Фаджр: в точное время\n\n` +
        `Для изменения настроек напишите администратору канала.`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Ошибка отправки приветствия:", error.message);
    }
  }
});

// Обработка текстовых сообщений (коды городов, minutesBefore и хадисы)
bot.on("text", async (ctx) => {
  const text = ctx.message.text;
  const chatType = ctx.chat.type;

  // ТОЛЬКО в личных сообщениях обрабатываем текст
  if (chatType === "private" && !text.startsWith("/")) {
    // Проверяем состояния хадисов (для администратора)
    const hadithHandled = await handleHadithTextInput(ctx);
    if (hadithHandled) return;

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

  // Создаем HTTP сервер для Render (чтобы не было ошибки "No open ports")
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get("/", (req, res) => {
    res.json({
      status: "running",
      message: "Namaz Bot is running",
      uptime: process.uptime()
    });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  app.listen(PORT, () => {
    console.log(`🌐 HTTP сервер запущен на порту ${PORT}`);
  });

  // Подключение к MongoDB
  await connectDatabase();

  // Загружаем расписание для всех пользователей при старте
  console.log("📅 Загрузка расписания для всех пользователей...");
  await scheduleAllUsersNotifications(bot);
  console.log("✅ Расписание загружено!");

  // Каждый день в 00:30 по Бишкеку перезагружаем расписание для всех
  cron.schedule("30 0 * * *", async () => {
    console.log("🔄 Обновление расписания намазов (00:30 Bishkek time)");
    await scheduleAllUsersNotifications(bot);
  }, {
    timezone: "Asia/Bishkek"
  });

  // Запуск планировщика хадисов (ежедневно в 09:00)
  console.log("📖 Запуск планировщика хадисов...");
  scheduleHadithSending(bot);
  console.log("✅ Планировщик хадисов запущен!");

  console.log("🚀 Запуск Telegram бота...");
  await bot.launch({
    dropPendingUpdates: true,
  });
  console.log("🤖 Бот запущен!");
}

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
