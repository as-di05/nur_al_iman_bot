// Планировщик для отправки хадисов пользователям
import cron from "node-cron";
import * as hadithService from "./hadithService.js";
import { safeSendMessage } from "../utils/telegramSender.js";
import { logger } from "../utils/logger.js";
import { NOTIFICATIONS, SCHEDULE, TIMEZONE } from "../config/constants.js";

/**
 * Запустить планировщик ежедневной отправки хадисов.
 * @returns {import('node-cron').ScheduledTask}
 */
export function scheduleHadithSending(bot) {
  const task = cron.schedule(
    SCHEDULE.hadith,
    async () => {
      logger.info("📖 Начинается отправка ежедневных хадисов...");
      await sendHadithsToAllUsers(bot.telegram);
    },
    { timezone: TIMEZONE },
  );

  logger.info(`✅ Планировщик хадисов запущен (${SCHEDULE.hadith})`);
  return task;
}

/**
 * Найти следующий хадис подходящей длины для пользователя.
 * Слишком длинные хадисы помечаются отправленными и пропускаются.
 */
async function pickSendableHadith(userId, collection) {
  const MAX_LENGTH = NOTIFICATIONS.maxMessageLength;
  const MAX_ATTEMPTS = 10;

  let hadith = await hadithService.getNextHadithForUser(userId);
  if (!hadith) return { hadith: null, message: null };

  let message = hadithService.formatHadithMessage(hadith, collection);
  let attempts = 0;

  while (message.length > MAX_LENGTH && attempts < MAX_ATTEMPTS) {
    logger.warn(
      `Хадис №${hadith.number} слишком длинный (${message.length} символов), пропускаем`,
    );
    await hadithService.markHadithAsSent(userId, hadith._id);

    hadith = await hadithService.getNextHadithForUser(userId);
    if (!hadith) return { hadith: null, message: null };

    message = hadithService.formatHadithMessage(hadith, collection);
    attempts++;
  }

  if (message.length > MAX_LENGTH) return { hadith: null, message: null };
  return { hadith, message };
}

/**
 * Отправить хадисы всем пользователям с включенной подпиской
 */
async function sendHadithsToAllUsers(telegram) {
  try {
    const users = await hadithService.getUsersWithHadithsEnabled();
    logger.info(`📋 Найдено пользователей с хадисами: ${users.length}`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const { hadith, message } = await pickSendableHadith(
          user.userId,
          user.selectedCollection,
        );

        if (!hadith) {
          logger.warn(
            `Нет подходящего хадиса для пользователя ${user.userId} (коллекция пуста/слишком длинные)`,
          );
          continue;
        }

        const sent = await safeSendMessage(telegram, user.userId, message, {
          parse_mode: "Markdown",
        });

        if (sent) {
          await hadithService.markHadithAsSent(user.userId, hadith._id);
          successCount++;
          logger.info(
            `✅ Хадис №${hadith.number} отправлен пользователю ${user.userId} (${message.length} символов)`,
          );
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        logger.error(
          `❌ Ошибка отправки хадиса пользователю ${user.userId}: ${error.message}`,
        );
      }
    }

    logger.info(
      `📊 Отправка завершена. Успешно: ${successCount}, Ошибок: ${errorCount}`,
    );
  } catch (error) {
    logger.error(`❌ Критическая ошибка при отправке хадисов: ${error.message}`);
  }
}

/**
 * Отправить хадис конкретному пользователю (для тестирования)
 */
export async function sendHadithToUser(telegram, userId) {
  try {
    const hadith = await hadithService.getNextHadithForUser(userId);
    if (!hadith) {
      return { success: false, message: "Нет доступных хадисов" };
    }

    const users = await hadithService.getUsersWithHadithsEnabled();
    const currentUser = users.find((u) => u.userId === userId);
    if (!currentUser) {
      return { success: false, message: "Хадисы не включены" };
    }

    const message = hadithService.formatHadithMessage(
      hadith,
      currentUser.selectedCollection,
    );

    const sent = await safeSendMessage(telegram, userId, message, {
      parse_mode: "Markdown",
    });

    if (!sent) {
      return { success: false, message: "Не удалось отправить" };
    }

    await hadithService.markHadithAsSent(userId, hadith._id);
    return { success: true, hadith };
  } catch (error) {
    logger.error(`❌ Ошибка отправки хадиса пользователю ${userId}: ${error.message}`);
    return { success: false, message: error.message };
  }
}
