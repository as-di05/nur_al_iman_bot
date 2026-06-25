// Обработчики команд для работы с хадисами
import { User } from "../models/User.js";
import * as hadithService from "../services/hadithService.js";

// Хранилище состояний для пошагового ввода (userId -> state)
const userStates = new Map();

// Валидатор номера хадиса: целое число или составной формат "5/123"
const HADITH_NUMBER_REGEX = /^\d+(\/\d+)?$/;
function isValidHadithNumber(text) {
  return HADITH_NUMBER_REGEX.test((text || "").trim());
}

// ==================== АДМИН КОМАНДЫ ====================

/**
 * /help_admin - Справка по админским командам
 */
export async function handleAdminHelp(ctx) {
  const helpText = `
📖 *Справка по командам администратора*

*Управление хадисами:*
/hadith_admin - Панель управления хадисами
  • Создать коллекцию
  • Добавить хадис
  • Редактировать хадис
  • Поиск хадиса
  • Список коллекций

*Управление дуа:*
/dua_admin - Панель управления дуа
  • Создать раздел
  • Добавить дуа
  • Редактировать дуа
  • Список разделов

*Тестовые команды намазов:*
/fajr - Тест уведомления Фаджр
/dhuhr - Тест уведомления Зухр
/asr - Тест уведомления Аср
/maghrib - Тест уведомления Магриб
/isha - Тест уведомления Иша

*Общие команды:*
/start - Регистрация в боте
/location - Изменить город
/hadith - Подписка на хадисы (для пользователей)

*Примечание:* Команды управления хадисами доступны только для @as_di05
  `;

  await ctx.reply(helpText, { parse_mode: "Markdown" });
}

/**
 * /hadith_admin - Главное меню администратора
 */
export async function handleAdminMenu(ctx) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "➕ Создать коллекцию", callback_data: "hadith_create_collection" },
      ],
      [
        { text: "📚 Список коллекций", callback_data: "hadith_list_collections" },
      ],
      [
        { text: "➕ Добавить хадис", callback_data: "hadith_add_start" },
      ],
      [
        { text: "✏️ Редактировать хадис", callback_data: "hadith_edit_start" },
      ],
      [
        { text: "🔍 Поиск хадиса", callback_data: "hadith_search_start" },
      ],
    ],
  };

  await ctx.reply("📋 *Управление хадисами*\n\nВыберите действие:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

/**
 * Создание новой коллекции
 */
export async function handleCreateCollection(ctx) {
  await ctx.editMessageText(
    "📚 *Создание новой коллекции*\n\n" +
      "Отправьте название коллекции на русском (например: Сахих Бухари)",
    { parse_mode: "Markdown" }
  );

  userStates.set(ctx.from.id, { action: "create_collection", step: "name" });
}

/**
 * Список всех коллекций
 */
export async function handleListCollections(ctx) {
  const collections = await hadithService.getAllCollections();

  if (collections.length === 0) {
    await ctx.editMessageText("📚 Коллекций пока нет.");
    return;
  }

  let message = "📚 *Список коллекций:*\n\n";
  for (const col of collections) {
    message += `• *${col.name}* (${col.totalHadiths} хадисов)\n`;
    message += `  ID: \`${col._id}\`\n\n`;
  }

  await ctx.editMessageText(message, { parse_mode: "Markdown" });
}

/**
 * Начало добавления хадиса
 */
export async function handleAddHadithStart(ctx) {
  const collections = await hadithService.getAllCollections();

  if (collections.length === 0) {
    await ctx.editMessageText(
      "⚠️ Сначала создайте коллекцию!\n\nИспользуйте /hadith_admin",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const keyboard = {
    inline_keyboard: collections.map((col) => [
      { text: col.name, callback_data: `hadith_select_col_${col._id}` },
    ]),
  };

  await ctx.editMessageText("📖 *Добавление хадиса*\n\nВыберите коллекцию:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

/**
 * Выбор коллекции для добавления хадиса
 */
export async function handleSelectCollection(ctx, collectionId) {
  const collection = await hadithService.getCollectionById(collectionId);

  if (!collection) {
    await ctx.editMessageText("❌ Коллекция не найдена");
    return;
  }

  await ctx.editMessageText(
    `📖 *Добавление хадиса в: ${collection.name}*\n\n` +
      "Отправьте номер хадиса (например: 1, 234, 5/123)",
    { parse_mode: "Markdown" }
  );

  userStates.set(ctx.from.id, {
    action: "add_hadith",
    step: "number",
    collectionId: collectionId,
    collectionName: collection.name,
  });
}

/**
 * Кнопка "➕ Добавить ещё" — снова запросить номер хадиса для той же коллекции
 */
export async function handleAddMoreHadith(ctx, collectionId) {
  const collection = await hadithService.getCollectionById(collectionId);

  if (!collection) {
    await ctx.answerCbQuery("❌ Коллекция не найдена");
    return;
  }

  await ctx.answerCbQuery();
  // Убираем кнопки у предыдущего сообщения, чтобы не нажали повторно
  try {
    await ctx.editMessageReplyMarkup();
  } catch {
    // сообщение могло быть уже изменено — игнорируем
  }

  await ctx.reply(
    `📖 *Добавление хадиса в: ${collection.name}*\n\n` +
      "Отправьте номер хадиса (например: 1, 234, 5/123)",
    { parse_mode: "Markdown" }
  );

  userStates.set(ctx.from.id, {
    action: "add_hadith",
    step: "number",
    collectionId: collectionId,
    collectionName: collection.name,
  });
}

/**
 * Кнопка "✅ Готово" — завершить добавление хадисов
 */
export async function handleAddHadithDone(ctx) {
  await ctx.answerCbQuery("Готово");
  try {
    await ctx.editMessageReplyMarkup();
  } catch {
    // нечего убирать — игнорируем
  }
}

/**
 * Начало редактирования хадиса
 */
export async function handleEditHadithStart(ctx) {
  await ctx.editMessageText(
    "✏️ *Редактирование хадиса*\n\n" +
      "Отправьте ID хадиса для редактирования\n" +
      "(Найти ID можно через поиск в главном меню)",
    { parse_mode: "Markdown" }
  );

  userStates.set(ctx.from.id, { action: "edit_hadith", step: "select" });
}

/**
 * Начало поиска хадиса
 */
export async function handleSearchHadithStart(ctx) {
  const collections = await hadithService.getAllCollections();

  if (collections.length === 0) {
    await ctx.editMessageText("📚 Коллекций пока нет.");
    return;
  }

  const keyboard = {
    inline_keyboard: collections.map((col) => [
      { text: col.name, callback_data: `hadith_search_col_${col._id}` },
    ]),
  };

  await ctx.editMessageText("🔍 *Поиск хадиса*\n\nВыберите коллекцию:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

/**
 * Выбор коллекции для поиска
 */
export async function handleSearchSelectCollection(ctx, collectionId) {
  const collection = await hadithService.getCollectionById(collectionId);

  if (!collection) {
    await ctx.editMessageText("❌ Коллекция не найдена");
    return;
  }

  await ctx.editMessageText(
    `🔍 *Поиск в: ${collection.name}*\n\n` + "Отправьте номер хадиса:",
    { parse_mode: "Markdown" }
  );

  userStates.set(ctx.from.id, {
    action: "search_hadith",
    step: "number",
    collectionId: collectionId,
  });
}

// ==================== ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ (СОСТОЯНИЯ) ====================

/**
 * Обработка текстового ввода в зависимости от состояния пользователя
 */
export async function handleHadithTextInput(ctx) {
  const userId = ctx.from.id;
  const state = userStates.get(userId);

  if (!state) {
    return false; // Не наше состояние
  }

  const text = ctx.message.text;

  // ========== СОЗДАНИЕ КОЛЛЕКЦИИ ==========
  if (state.action === "create_collection") {
    if (state.step === "name") {
      try {
        const collection = await hadithService.createCollection(text);
        await ctx.reply(
          `✅ Коллекция "*${collection.name}*" создана!\n` +
            `ID: \`${collection._id}\``,
          { parse_mode: "Markdown" }
        );
        userStates.delete(userId);
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
    }
    return true;
  }

  // ========== ДОБАВЛЕНИЕ ХАДИСА ==========
  if (state.action === "add_hadith") {
    if (state.step === "number") {
      if (!isValidHadithNumber(text)) {
        await ctx.reply(
          "❌ Номер хадиса должен быть числом (например: 1, 234 или 5/123).\n\n" +
            "Отправьте номер ещё раз:"
        );
        return true; // Остаёмся на шаге ввода номера
      }

      const number = text.trim();
      state.number = number;
      state.step = "content";
      userStates.set(userId, state);

      await ctx.reply(
        `📖 Номер хадиса: *${number}*\n\n` +
          "Теперь отправьте содержание хадиса на русском языке:",
        { parse_mode: "Markdown" }
      );
      return true;
    }

    if (state.step === "content") {
      try {
        const hadith = await hadithService.addHadith(
          state.collectionId,
          state.number,
          text
        );

        const keyboard = {
          inline_keyboard: [
            [
              { text: "✅ Готово", callback_data: "hadith_add_done" },
              {
                text: "➕ Добавить ещё",
                callback_data: `hadith_add_more_${state.collectionId}`,
              },
            ],
          ],
        };

        await ctx.reply(
          `✅ Хадис добавлен в коллекцию "*${state.collectionName}*"!\n\n` +
            `*Номер:* ${hadith.number}\n` +
            `*ID:* \`${hadith._id}\`\n\n` +
            `Вы можете отредактировать его позже, чтобы добавить:\n` +
            `• Арабский текст\n` +
            `• Передатчиков\n` +
            `• Разъяснения ученых`,
          { parse_mode: "Markdown", reply_markup: keyboard }
        );

        userStates.delete(userId);
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
      return true;
    }
  }

  // ========== РЕДАКТИРОВАНИЕ ХАДИСА ==========
  if (state.action === "edit_hadith") {
    if (state.step === "select") {
      try {
        const hadith = await hadithService.getHadithById(text);

        if (!hadith) {
          await ctx.reply("❌ Хадис не найден. Проверьте ID.");
          return true;
        }

        state.hadithId = text;
        state.hadith = hadith;
        state.step = "choose_field";
        userStates.set(userId, state);

        const keyboard = {
          inline_keyboard: [
            [{ text: "📝 Номер", callback_data: "hadith_edit_number" }],
            [
              {
                text: "📄 Содержание (рус)",
                callback_data: "hadith_edit_contentRu",
              },
            ],
            [
              {
                text: "📜 Содержание (ар)",
                callback_data: "hadith_edit_contentAr",
              },
            ],
            [
              {
                text: "👥 Передатчики",
                callback_data: "hadith_edit_narrators",
              },
            ],
            [
              {
                text: "💡 Разъяснения",
                callback_data: "hadith_edit_explanation",
              },
            ],
            [
              {
                text: hadith.isActive ? "🔴 Деактивировать" : "🟢 Активировать",
                callback_data: "hadith_toggle_active",
              },
            ],
          ],
        };

        // Безопасно обрезаем текст
        const contentPreview = hadith.contentRu
          ? (hadith.contentRu.length > 100
              ? hadith.contentRu.substring(0, 100) + "..."
              : hadith.contentRu)
          : "Не указано";

        await ctx.reply(
          `✏️ *Редактирование хадиса*\n\n` +
            `*Коллекция:* ${hadith.collectionId.name}\n` +
            `*Номер:* ${hadith.number}\n` +
            `*Содержание:* ${contentPreview}\n\n` +
            `Выберите, что хотите изменить:`,
          { parse_mode: "Markdown", reply_markup: keyboard }
        );
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
      return true;
    }

    if (state.step === "input_field") {
      try {
        const updates = { [state.field]: text };
        await hadithService.updateHadith(state.hadithId, updates);

        await ctx.reply(`✅ Хадис обновлен!`);
        userStates.delete(userId);
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
      return true;
    }
  }

  // ========== ПОИСК ХАДИСА ==========
  if (state.action === "search_hadith") {
    if (state.step === "number") {
      if (!isValidHadithNumber(text)) {
        await ctx.reply(
          "❌ Номер хадиса должен быть числом (например: 1, 234 или 5/123).\n\n" +
            "Отправьте номер ещё раз:"
        );
        return true; // Остаёмся на шаге ввода номера
      }

      try {
        const hadith = await hadithService.findHadithByNumber(
          state.collectionId,
          text.trim()
        );

        if (!hadith) {
          await ctx.reply(
            `❌ Хадис №${text} не найден в этой коллекции.`
          );
          userStates.delete(userId);
          return true;
        }

        const message = hadithService.formatHadithMessage(
          hadith,
          hadith.collectionId
        );
        await ctx.reply(
          message + `\n\n*ID:* \`${hadith._id}\``,
          { parse_mode: "Markdown" }
        );

        userStates.delete(userId);
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
      return true;
    }
  }

  return false;
}

/**
 * Обработка callback для выбора поля редактирования
 */
export async function handleEditFieldSelect(ctx, field) {
  const userId = ctx.from.id;
  const state = userStates.get(userId);

  if (!state || state.action !== "edit_hadith") {
    await ctx.answerCbQuery("⚠️ Сессия истекла, начните заново");
    return;
  }

  const fieldNames = {
    number: "номер хадиса",
    contentRu: "содержание на русском",
    contentAr: "содержание на арабском",
    narrators: "передатчиков",
    explanation: "разъяснения ученых",
  };

  state.field = field === "explanation" ? "scholarsExplanation" : field;
  state.step = "input_field";
  userStates.set(userId, state);

  await ctx.editMessageText(
    `✏️ Введите новое значение для поля "*${fieldNames[field]}*":`,
    { parse_mode: "Markdown" }
  );
}

/**
 * Переключение статуса активности хадиса
 */
export async function handleToggleActive(ctx) {
  const userId = ctx.from.id;
  const state = userStates.get(userId);

  if (!state || state.action !== "edit_hadith") {
    await ctx.answerCbQuery("⚠️ Сессия истекла, начните заново");
    return;
  }

  try {
    const newStatus = !state.hadith.isActive;
    await hadithService.updateHadith(state.hadithId, { isActive: newStatus });

    await ctx.answerCbQuery(
      newStatus ? "✅ Хадис активирован" : "🔴 Хадис деактивирован"
    );
    await ctx.editMessageText(
      `✅ Статус хадиса изменен: ${newStatus ? "активен" : "деактивирован"}`
    );

    userStates.delete(userId);
  } catch (error) {
    await ctx.answerCbQuery(`❌ Ошибка: ${error.message}`);
  }
}

// ==================== КОМАНДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ====================

/**
 * /hadith - Управление подпиской на хадисы
 */
export async function handleUserHadith(ctx) {
  // Для групп/каналов используем chat.id, для личных чатов - from.id
  const chatType = ctx.chat?.type;
  const userId = (chatType === 'private') ? ctx.from.id : ctx.chat.id;

  const user = await User.findOne({ userId });

  if (!user) {
    const message = (chatType === 'private')
      ? "⚠️ Сначала зарегистрируйтесь через /start"
      : "⚠️ Бот еще не добавлен в эту группу/канал. Добавьте бота как администратора.";
    await ctx.reply(message);
    return;
  }

  const collections = await hadithService.getAllCollections();

  if (collections.length === 0) {
    await ctx.reply("📚 Пока нет доступных коллекций хадисов.");
    return;
  }

  if (!user.hadithsEnabled) {
    // Предложить включить хадисы
    const keyboard = {
      inline_keyboard: collections.map((col) => [
        { text: col.name, callback_data: `user_hadith_enable_${col._id}` },
      ]),
    };

    const targetText = (chatType === 'private')
      ? "вы будете получать"
      : "в этот чат будут приходить";

    await ctx.reply(
      "📖 *Ежедневные хадисы*\n\n" +
        `Каждый день в 11:00 ${targetText} новый хадис.\n\n` +
        "Выберите коллекцию хадисов:",
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  } else {
    // Показать текущие настройки
    const collection = await hadithService.getCollectionById(
      user.selectedCollection
    );

    const keyboard = {
      inline_keyboard: [
        [{ text: "🔴 Отключить хадисы", callback_data: "user_hadith_disable" }],
        [
          {
            text: "📚 Сменить коллекцию",
            callback_data: "user_hadith_change_collection",
          },
        ],
      ],
    };

    await ctx.reply(
      `📖 *Ваши настройки хадисов*\n\n` +
        `✅ Хадисы включены\n` +
        `📚 Коллекция: ${collection?.name || "Не выбрана"}\n` +
        `⏰ Время отправки: ${user.hadithSendTime}`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  }
}

/**
 * Включение хадисов для пользователя/группы/канала
 */
export async function handleUserEnableHadith(ctx, collectionId) {
  const chatType = ctx.chat?.type;
  const userId = (chatType === 'private') ? ctx.from.id : ctx.chat.id;

  await User.findOneAndUpdate(
    { userId },
    {
      hadithsEnabled: true,
      selectedCollection: collectionId,
    }
  );

  const collection = await hadithService.getCollectionById(collectionId);
  const targetText = (chatType === 'private') ? "вы получите" : "придет";

  await ctx.editMessageText(
    `✅ Хадисы включены!\n\n` +
      `📚 Коллекция: ${collection.name}\n` +
      `⏰ Время отправки: 11:00 (ежедневно)\n\n` +
      `Завтра ${targetText} первый хадис!`,
    { parse_mode: "Markdown" }
  );
}

/**
 * Отключение хадисов
 */
export async function handleUserDisableHadith(ctx) {
  const chatType = ctx.chat?.type;
  const userId = (chatType === 'private') ? ctx.from.id : ctx.chat.id;

  await User.findOneAndUpdate({ userId }, { hadithsEnabled: false });

  await ctx.editMessageText("🔴 Хадисы отключены.");
}

/**
 * Смена коллекции хадисов
 */
export async function handleUserChangeCollection(ctx) {
  const collections = await hadithService.getAllCollections();

  const keyboard = {
    inline_keyboard: collections.map((col) => [
      { text: col.name, callback_data: `user_hadith_set_col_${col._id}` },
    ]),
  };

  await ctx.editMessageText("📚 Выберите новую коллекцию:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

/**
 * Установка новой коллекции
 */
export async function handleUserSetCollection(ctx, collectionId) {
  const chatType = ctx.chat?.type;
  const userId = (chatType === 'private') ? ctx.from.id : ctx.chat.id;

  await User.findOneAndUpdate(
    { userId },
    {
      selectedCollection: collectionId,
      lastHadithSent: null, // Сбрасываем, чтобы начать с начала
    }
  );

  const collection = await hadithService.getCollectionById(collectionId);

  await ctx.editMessageText(
    `✅ Коллекция изменена на: ${collection.name}\n\n` +
      `Хадисы будут отправляться с начала коллекции.`
  );
}
