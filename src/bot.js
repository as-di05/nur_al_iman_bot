// Главный файл бота
import { Telegraf } from "telegraf";
import cron from "node-cron";
import { BOT_TOKEN, SCHEDULE, TIMEZONE } from "./config/constants.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { logger } from "./utils/logger.js";
import { startServer } from "./server.js";
import {
  scheduleAllUsersNotifications,
  stopAllScheduledTasks,
} from "./services/schedulerService.js";
import {
  handleStart,
  handleLocation,
  handleShowRegions,
  handleRegionSelection,
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
  handleAddMoreHadith,
  handleAddHadithDone,
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
import {
  handleDuaAdminMenu,
  handleCreateCollection as handleDuaCreateCollection,
  handleListCollections as handleDuaListCollections,
  handleAddDuaStart,
  handleSelectCollection as handleDuaSelectCollection,
  handleAddMoreDua,
  handleAddDuaDone,
  handleEditDuaStart,
  handleEditFieldSelect as handleDuaEditFieldSelect,
  handleToggleActive as handleDuaToggleActive,
  handleDuaTextInput,
  handleUserDua,
  handleDuaCategories,
  handleDuaCategory,
  handleDuaView,
} from "./handlers/duaHandlers.js";
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
bot.command("dua_admin", isMainAdmin, handleDuaAdminMenu);

// Команды для пользователей
bot.command("hadith", handleUserHadith);
bot.command("dua", handleUserDua);

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
    },
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

// "Добавить ещё" хадис в ту же коллекцию / "Готово"
bot.action(/^hadith_add_more_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleAddMoreHadith(ctx, collectionId);
});
bot.action("hadith_add_done", handleAddHadithDone);

// Выбор коллекции для поиска
bot.action(/^hadith_search_col_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleSearchSelectCollection(ctx, collectionId);
});

// Редактирование полей хадиса
bot.action(
  /^hadith_edit_(number|contentRu|contentAr|narrators|explanation)$/,
  (ctx) => {
    const field = ctx.match[1];
    return handleEditFieldSelect(ctx, field);
  },
);

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

// ==================== CALLBACK ОБРАБОТЧИКИ ДЛЯ ДУА ====================

// Админские callback-и
bot.action("dua_create_collection", handleDuaCreateCollection);
bot.action("dua_list_collections", handleDuaListCollections);
bot.action("dua_add_start", handleAddDuaStart);
bot.action("dua_edit_start", handleEditDuaStart);

// Выбор раздела для добавления дуа
bot.action(/^dua_select_col_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleDuaSelectCollection(ctx, collectionId);
});

// "Добавить ещё" дуа в тот же раздел / "Готово"
bot.action(/^dua_add_more_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleAddMoreDua(ctx, collectionId);
});
bot.action("dua_add_done", handleAddDuaDone);

// Редактирование полей дуа
bot.action(
  /^dua_edit_(titleRu|contentAr|transcription|translationRu|source|benefit)$/,
  (ctx) => {
    const field = ctx.match[1];
    return handleDuaEditFieldSelect(ctx, field);
  },
);

bot.action("dua_toggle_active", handleDuaToggleActive);

// Пользовательские callback-и (просмотр /dua)
bot.action("dua_back_cats", handleDuaCategories);
bot.action("dua_noop", (ctx) => ctx.answerCbQuery());

bot.action(/^dua_cat_(.+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  return handleDuaCategory(ctx, collectionId);
});

bot.action(/^dua_view_(.+)_(\d+)$/, (ctx) => {
  const collectionId = ctx.match[1];
  const index = parseInt(ctx.match[2], 10);
  return handleDuaView(ctx, collectionId, index);
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

    logger.info(`🎉 Бот добавлен в ${chatType}: ${chatTitle} (ID: ${chatId})`);

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
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      logger.error("Ошибка отправки приветствия:", error.message);
    }
  }
});

// Обработка текстовых сообщений — реагируем ТОЛЬКО когда бот ждёт ввод
// (пошаговые сценарии: хадисы у админа, ввод minutesBefore).
// Произвольные сообщения, не относящиеся к активному сценарию, игнорируются —
// бот реагирует на команды (начинающиеся с "/") и на ожидаемый ввод.
bot.on("text", async (ctx) => {
  const text = ctx.message.text;
  const chatType = ctx.chat.type;

  // Команды обрабатываются своими хендлерами; группы/каналы текст не вводят
  if (chatType !== "private" || text.startsWith("/")) {
    return;
  }

  // Проверяем состояния хадисов (для администратора)
  const hadithHandled = await handleHadithTextInput(ctx);
  if (hadithHandled) return;

  // Проверяем состояния дуа (для администратора)
  const duaHandled = await handleDuaTextInput(ctx);
  if (duaHandled) return;

  // Проверяем, ждём ли мы ввод minutesBefore
  const handled = await handleMinutesBeforeInput(ctx, setChatId);
  if (handled) return;

  // Никакой активный сценарий не ждёт ввод — молча игнорируем сообщение
});

// Глобальный обработчик ошибок Telegraf
bot.catch((error, ctx) => {
  logger.error(`Необработанная ошибка в обновлении ${ctx.updateType}: ${error.message}`);
});

// Ссылки на фоновые задачи для корректного завершения
let httpServer = null;
let rescheduleTask = null;
let hadithTask = null;

// Запуск бота
export async function startBot() {
  logger.info("🔄 Запуск бота...");

  // HTTP-сервер (health-проверки + API для будущего Mini App)
  httpServer = await startServer(process.env.PORT || 3000);

  // Подключение к MongoDB
  await connectDatabase();

  // Загружаем расписание для всех пользователей при старте
  logger.info("📅 Загрузка расписания для всех пользователей...");
  await scheduleAllUsersNotifications(bot);
  logger.info("✅ Расписание загружено!");

  // Ежедневное перепланирование расписания
  rescheduleTask = cron.schedule(
    SCHEDULE.reschedule,
    async () => {
      logger.info("🔄 Обновление расписания намазов");
      await scheduleAllUsersNotifications(bot);
    },
    { timezone: TIMEZONE },
  );

  // Запуск планировщика хадисов
  logger.info("📖 Запуск планировщика хадисов...");
  hadithTask = scheduleHadithSending(bot);

  logger.info("🚀 Запуск Telegram бота...");

  // Устанавливаем список команд для автокомплита
  await bot.telegram.setMyCommands([
    { command: "start", description: "Начать работу с ботом" },
    { command: "location", description: "Изменить город" },
    { command: "hadith", description: "Управление хадисами" },
    { command: "dua", description: "Дуа и азкары" },
    { command: "hadith_admin", description: "Админ панель хадисов" },
    { command: "dua_admin", description: "Админ панель дуа" },
    { command: "help_admin", description: "Справка администратора" },
  ]);
  logger.info("📋 Команды бота установлены!");

  await bot.launch({
    dropPendingUpdates: true,
  });
  logger.info("🤖 Бот запущен!");
}

// Корректное завершение: останавливаем бота, задачи, сервер и закрываем БД
async function shutdown(signal) {
  logger.info(`Получен сигнал ${signal}, завершаюсь...`);
  try {
    bot.stop(signal);
    stopAllScheduledTasks();
    rescheduleTask?.stop();
    hadithTask?.stop();
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await disconnectDatabase();
    logger.info("👋 Завершение выполнено");
  } catch (error) {
    logger.error(`Ошибка при завершении: ${error.message}`);
  }
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
