// Middleware для проверки прав администратора в группах/каналах

/**
 * Глобальный middleware - блокирует команды и callback-и для всех кроме владельца
 * В личных чатах разрешает все
 * В группах/каналах - только для владельца (creator)
 */
export async function onlyOwnerInGroups(ctx, next) {
  const chatType = ctx.chat?.type;

  // В личных чатах разрешаем все
  if (chatType === "private") {
    return next();
  }

  // Проверяем только команды и callback queries
  const isCommand = ctx.message?.text?.startsWith('/');
  const isCallback = !!ctx.callbackQuery;

  if (!isCommand && !isCallback) {
    // Если это не команда и не callback - пропускаем (обычное сообщение)
    return next();
  }

  // В группах и каналах проверяем права создателя
  if (chatType === "group" || chatType === "supergroup" || chatType === "channel") {
    try {
      const userId = ctx.from?.id;
      if (!userId) {
        return; // Нет информации о пользователе
      }

      // Получаем информацию о пользователе в чате
      const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);

      // Проверяем, является ли пользователь создателем
      if (chatMember.status === "creator") {
        return next();
      }

      // Если не создатель - игнорируем (можно добавить предупреждение)
      // Для callback query нужно ответить, чтобы убрать "часики"
      if (isCallback) {
        await ctx.answerCbQuery("⚠️ Доступно только владельцу группы", { show_alert: true });
      }

      return; // Не выполняем команду
    } catch (error) {
      console.error("Ошибка проверки прав владельца:", error.message);
    }
    return;
  }

  // По умолчанию разрешаем
  return next();
}
