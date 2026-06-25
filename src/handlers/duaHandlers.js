// Обработчики команд для работы с дуа
import * as duaService from "../services/duaService.js";

// Хранилище состояний для пошагового ввода (userId -> state)
const userStates = new Map();

// ==================== АДМИН: МЕНЮ ====================

/**
 * /dua_admin - Главное меню администратора по дуа
 */
export async function handleDuaAdminMenu(ctx) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "➕ Создать раздел", callback_data: "dua_create_collection" }],
      [{ text: "📚 Список разделов", callback_data: "dua_list_collections" }],
      [{ text: "➕ Добавить дуа", callback_data: "dua_add_start" }],
      [{ text: "✏️ Редактировать дуа", callback_data: "dua_edit_start" }],
    ],
  };

  await ctx.reply("🤲 *Управление дуа*\n\nВыберите действие:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

/**
 * Создание нового раздела
 */
export async function handleCreateCollection(ctx) {
  await ctx.editMessageText(
    "📚 *Создание нового раздела*\n\n" +
      "Отправьте название раздела (например: Утренние азкары, Дуа перед сном)",
    { parse_mode: "Markdown" },
  );

  userStates.set(ctx.from.id, { action: "create_collection", step: "name" });
}

/**
 * Список всех разделов
 */
export async function handleListCollections(ctx) {
  const collections = await duaService.getAllCollections();

  if (collections.length === 0) {
    await ctx.editMessageText("📚 Разделов пока нет.");
    return;
  }

  let message = "📚 *Список разделов:*\n\n";
  for (const col of collections) {
    message += `• *${col.name}* (${col.totalDuas} дуа)\n`;
    message += `  ID: \`${col._id}\`\n\n`;
  }

  await ctx.editMessageText(message, { parse_mode: "Markdown" });
}

// ==================== АДМИН: ДОБАВЛЕНИЕ ДУА ====================

/**
 * Начало добавления дуа — выбор раздела
 */
export async function handleAddDuaStart(ctx) {
  const collections = await duaService.getAllCollections();

  if (collections.length === 0) {
    await ctx.editMessageText(
      "⚠️ Сначала создайте раздел!\n\nИспользуйте /dua_admin",
      { parse_mode: "Markdown" },
    );
    return;
  }

  const keyboard = {
    inline_keyboard: collections.map((col) => [
      { text: col.name, callback_data: `dua_select_col_${col._id}` },
    ]),
  };

  await ctx.editMessageText("🤲 *Добавление дуа*\n\nВыберите раздел:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

// Запросить первый шаг ввода дуа (название)
function startAddDuaFlow(userId, collection) {
  userStates.set(userId, {
    action: "add_dua",
    step: "titleRu",
    collectionId: String(collection._id),
    collectionName: collection.name,
  });
}

/**
 * Выбор раздела для добавления дуа
 */
export async function handleSelectCollection(ctx, collectionId) {
  const collection = await duaService.getCollectionById(collectionId);

  if (!collection) {
    await ctx.editMessageText("❌ Раздел не найден");
    return;
  }

  await ctx.editMessageText(
    `🤲 *Добавление дуа в: ${collection.name}*\n\n` +
      "Шаг 1/4. Отправьте *название* дуа (например: Дуа перед сном):",
    { parse_mode: "Markdown" },
  );

  startAddDuaFlow(ctx.from.id, collection);
}

/**
 * Кнопка "➕ Добавить ещё" — снова начать ввод дуа в тот же раздел
 */
export async function handleAddMoreDua(ctx, collectionId) {
  const collection = await duaService.getCollectionById(collectionId);

  if (!collection) {
    await ctx.answerCbQuery("❌ Раздел не найден");
    return;
  }

  await ctx.answerCbQuery();
  try {
    await ctx.editMessageReplyMarkup();
  } catch {
    // кнопки уже убраны — игнорируем
  }

  await ctx.reply(
    `🤲 *Добавление дуа в: ${collection.name}*\n\n` +
      "Шаг 1/4. Отправьте *название* дуа:",
    { parse_mode: "Markdown" },
  );

  startAddDuaFlow(ctx.from.id, collection);
}

/**
 * Кнопка "✅ Готово" — завершить добавление дуа
 */
export async function handleAddDuaDone(ctx) {
  await ctx.answerCbQuery("Готово");
  try {
    await ctx.editMessageReplyMarkup();
  } catch {
    // нечего убирать — игнорируем
  }
}

// ==================== АДМИН: РЕДАКТИРОВАНИЕ ДУА ====================

/**
 * Начало редактирования дуа
 */
export async function handleEditDuaStart(ctx) {
  await ctx.editMessageText(
    "✏️ *Редактирование дуа*\n\n" +
      "Отправьте ID дуа для редактирования\n" +
      "(ID показывается в сообщении сразу после добавления дуа)",
    { parse_mode: "Markdown" },
  );

  userStates.set(ctx.from.id, { action: "edit_dua", step: "select" });
}

/**
 * Обработка callback для выбора поля редактирования
 */
export async function handleEditFieldSelect(ctx, field) {
  const userId = ctx.from.id;
  const state = userStates.get(userId);

  if (!state || state.action !== "edit_dua") {
    await ctx.answerCbQuery("⚠️ Сессия истекла, начните заново");
    return;
  }

  const fieldNames = {
    titleRu: "название",
    contentAr: "арабский текст",
    transcription: "транскрипцию",
    translationRu: "перевод",
    source: "источник",
    benefit: "достоинство",
  };

  state.field = field;
  state.step = "input_field";
  userStates.set(userId, state);

  await ctx.editMessageText(
    `✏️ Введите новое значение для поля "*${fieldNames[field]}*":`,
    { parse_mode: "Markdown" },
  );
}

/**
 * Переключение статуса активности дуа
 */
export async function handleToggleActive(ctx) {
  const userId = ctx.from.id;
  const state = userStates.get(userId);

  if (!state || state.action !== "edit_dua") {
    await ctx.answerCbQuery("⚠️ Сессия истекла, начните заново");
    return;
  }

  try {
    const newStatus = !state.dua.isActive;
    await duaService.updateDua(state.duaId, { isActive: newStatus });

    await ctx.answerCbQuery(
      newStatus ? "✅ Дуа активирована" : "🔴 Дуа деактивирована",
    );
    await ctx.editMessageText(
      `✅ Статус дуа изменён: ${newStatus ? "активна" : "деактивирована"}`,
    );

    userStates.delete(userId);
  } catch (error) {
    await ctx.answerCbQuery(`❌ Ошибка: ${error.message}`);
  }
}

// ==================== ОБРАБОТКА ТЕКСТОВОГО ВВОДА ====================

/**
 * Обработка текстового ввода в зависимости от состояния пользователя.
 * Возвращает true, если ввод был обработан (бот ждал ввод).
 */
export async function handleDuaTextInput(ctx) {
  const userId = ctx.from.id;
  const state = userStates.get(userId);

  if (!state) {
    return false;
  }

  const text = ctx.message.text;

  // ========== СОЗДАНИЕ РАЗДЕЛА ==========
  if (state.action === "create_collection") {
    if (state.step === "name") {
      try {
        const collection = await duaService.createCollection(text.trim());
        await ctx.reply(
          `✅ Раздел "*${collection.name}*" создан!\n` +
            `ID: \`${collection._id}\``,
          { parse_mode: "Markdown" },
        );
        userStates.delete(userId);
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
    }
    return true;
  }

  // ========== ДОБАВЛЕНИЕ ДУА (4 шага) ==========
  if (state.action === "add_dua") {
    if (state.step === "titleRu") {
      state.titleRu = text.trim();
      state.step = "contentAr";
      userStates.set(userId, state);
      await ctx.reply(
        "Шаг 2/4. Отправьте *арабский текст* дуа:",
        { parse_mode: "Markdown" },
      );
      return true;
    }

    if (state.step === "contentAr") {
      state.contentAr = text.trim();
      state.step = "transcription";
      userStates.set(userId, state);
      await ctx.reply(
        "Шаг 3/4. Отправьте *транскрипцию* (как читается кириллицей):",
        { parse_mode: "Markdown" },
      );
      return true;
    }

    if (state.step === "transcription") {
      state.transcription = text.trim();
      state.step = "translationRu";
      userStates.set(userId, state);
      await ctx.reply(
        "Шаг 4/4. Отправьте *перевод* дуа на русском:",
        { parse_mode: "Markdown" },
      );
      return true;
    }

    if (state.step === "translationRu") {
      try {
        const dua = await duaService.addDua(state.collectionId, {
          titleRu: state.titleRu,
          contentAr: state.contentAr,
          transcription: state.transcription,
          translationRu: text.trim(),
        });

        const keyboard = {
          inline_keyboard: [
            [
              { text: "✅ Готово", callback_data: "dua_add_done" },
              {
                text: "➕ Добавить ещё",
                callback_data: `dua_add_more_${state.collectionId}`,
              },
            ],
          ],
        };

        await ctx.reply(
          `✅ Дуа добавлена в раздел "*${state.collectionName}*"!\n\n` +
            `*Название:* ${dua.titleRu}\n` +
            `*ID:* \`${dua._id}\`\n\n` +
            `Можно отредактировать позже, чтобы добавить:\n` +
            `• Источник\n` +
            `• Достоинство (фадиль)`,
          { parse_mode: "Markdown", reply_markup: keyboard },
        );

        userStates.delete(userId);
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
      return true;
    }
  }

  // ========== РЕДАКТИРОВАНИЕ ДУА ==========
  if (state.action === "edit_dua") {
    if (state.step === "select") {
      try {
        const dua = await duaService.getDuaById(text.trim());

        if (!dua) {
          await ctx.reply("❌ Дуа не найдена. Проверьте ID.");
          return true;
        }

        state.duaId = text.trim();
        state.dua = dua;
        state.step = "choose_field";
        userStates.set(userId, state);

        const keyboard = {
          inline_keyboard: [
            [{ text: "📝 Название", callback_data: "dua_edit_titleRu" }],
            [{ text: "📜 Арабский текст", callback_data: "dua_edit_contentAr" }],
            [
              {
                text: "🔤 Транскрипция",
                callback_data: "dua_edit_transcription",
              },
            ],
            [{ text: "💬 Перевод", callback_data: "dua_edit_translationRu" }],
            [{ text: "📚 Источник", callback_data: "dua_edit_source" }],
            [{ text: "💡 Достоинство", callback_data: "dua_edit_benefit" }],
            [
              {
                text: dua.isActive ? "🔴 Деактивировать" : "🟢 Активировать",
                callback_data: "dua_toggle_active",
              },
            ],
          ],
        };

        await ctx.reply(
          `✏️ *Редактирование дуа*\n\n` +
            `*Раздел:* ${dua.collectionId?.name || "—"}\n` +
            `*Название:* ${dua.titleRu}\n\n` +
            `Выберите, что хотите изменить:`,
          { parse_mode: "Markdown", reply_markup: keyboard },
        );
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
      return true;
    }

    if (state.step === "input_field") {
      try {
        const updates = { [state.field]: text.trim() };
        await duaService.updateDua(state.duaId, updates);

        await ctx.reply(`✅ Дуа обновлена!`);
        userStates.delete(userId);
      } catch (error) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
      return true;
    }
  }

  return false;
}

// ==================== ПОЛЬЗОВАТЕЛЬ: ПРОСМОТР /dua ====================

/**
 * /dua - Просмотр дуа по разделам
 */
export async function handleUserDua(ctx) {
  const collections = await duaService.getVisibleCollections();

  if (collections.length === 0) {
    await ctx.reply("🤲 Пока нет доступных дуа.");
    return;
  }

  const keyboard = {
    inline_keyboard: collections.map((col) => [
      {
        text: `${col.name} (${col.totalDuas})`,
        callback_data: `dua_cat_${col._id}`,
      },
    ]),
  };

  await ctx.reply(
    "🤲 *Дуа и азкары*\n\nВыберите раздел:",
    { parse_mode: "Markdown", reply_markup: keyboard },
  );
}

/**
 * Вернуться к списку разделов (редактирует текущее сообщение)
 */
export async function handleDuaCategories(ctx) {
  const collections = await duaService.getVisibleCollections();

  if (collections.length === 0) {
    await ctx.editMessageText("🤲 Пока нет доступных дуа.");
    return;
  }

  const keyboard = {
    inline_keyboard: collections.map((col) => [
      {
        text: `${col.name} (${col.totalDuas})`,
        callback_data: `dua_cat_${col._id}`,
      },
    ]),
  };

  await ctx.editMessageText("🤲 *Дуа и азкары*\n\nВыберите раздел:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

// Построить клавиатуру навигации по дуа внутри раздела
function buildDuaNavKeyboard(collectionId, index, total) {
  const prev = (index - 1 + total) % total;
  const next = (index + 1) % total;

  const navRow = [];
  if (total > 1) {
    navRow.push({
      text: "◀️",
      callback_data: `dua_view_${collectionId}_${prev}`,
    });
  }
  navRow.push({ text: `${index + 1}/${total}`, callback_data: "dua_noop" });
  if (total > 1) {
    navRow.push({
      text: "▶️",
      callback_data: `dua_view_${collectionId}_${next}`,
    });
  }

  return {
    inline_keyboard: [
      navRow,
      [{ text: "🔙 К разделам", callback_data: "dua_back_cats" }],
    ],
  };
}

/**
 * Показать дуа раздела по индексу (с навигацией).
 * @param {boolean} edit - редактировать текущее сообщение (true) или прислать новое (false)
 */
async function showDuaAt(ctx, collectionId, index, edit) {
  const collection = await duaService.getCollectionById(collectionId);
  if (!collection) {
    await ctx.answerCbQuery?.("❌ Раздел не найден");
    return;
  }

  const duas = await duaService.getDuasByCollection(collectionId, true);
  if (duas.length === 0) {
    const text = "🤲 В этом разделе пока нет дуа.";
    if (edit) {
      await ctx.editMessageText(text);
    } else {
      await ctx.reply(text);
    }
    return;
  }

  // Нормализуем индекс (на случай удаления дуа после открытия)
  const safeIndex = ((index % duas.length) + duas.length) % duas.length;
  const dua = duas[safeIndex];

  const message = duaService.formatDuaMessage(dua, collection);
  const keyboard = buildDuaNavKeyboard(collectionId, safeIndex, duas.length);

  if (edit) {
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }
}

/**
 * Выбор раздела пользователем — показываем первую дуа
 */
export async function handleDuaCategory(ctx, collectionId) {
  await ctx.answerCbQuery();
  await showDuaAt(ctx, collectionId, 0, true);
}

/**
 * Навигация по дуа (◀️ / ▶️)
 */
export async function handleDuaView(ctx, collectionId, index) {
  await ctx.answerCbQuery();
  await showDuaAt(ctx, collectionId, index, true);
}
