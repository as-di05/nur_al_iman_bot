// Настройка списка команд для разных типов пользователей

const USER_COMMANDS = [
  { command: "start", description: "🚀 Начать работу с ботом" },
  { command: "location", description: "📍 Изменить город" },
  { command: "hadith", description: "📖 Управление хадисами" },
];

const ADMIN_COMMANDS = [
  ...USER_COMMANDS,
  { command: "hadith_admin", description: "⚙️ Админ панель хадисов" },
  { command: "help_admin", description: "❓ Справка администратора" },
];

/**
 * Установить команды для конкретного пользователя
 * @param {Object} bot - Telegraf bot instance
 * @param {Number} userId - Telegram user ID
 * @param {Boolean} isAdmin - является ли пользователь админом
 */
export async function setCommandsForUser(bot, userId, isAdmin) {
  const commands = isAdmin ? ADMIN_COMMANDS : USER_COMMANDS;

  await bot.telegram.setMyCommands(commands, {
    scope: {
      type: "chat",
      chat_id: userId,
    },
  });
}

/**
 * Установить команды по умолчанию для всех
 */
export async function setDefaultCommands(bot) {
  await bot.telegram.setMyCommands(USER_COMMANDS);
  console.log("📋 Команды бота установлены!");
}

/**
 * Установить команды для админа при старте
 */
export async function setupAdminCommands(bot, adminUserId = 793289094) {
  try {
    await bot.telegram.setMyCommands(ADMIN_COMMANDS, {
      scope: {
        type: "chat",
        chat_id: adminUserId,
      },
    });
    console.log("👑 Админские команды установлены!");
  } catch (error) {
    console.log("⚠️ Не удалось установить админские команды:", error.message);
  }
}
