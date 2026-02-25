// Планировщик для отправки хадисов пользователям
import cron from "node-cron";
import * as hadithService from "./hadithService.js";

/**
 * Запустить планировщик ежедневной отправки хадисов
 */
export function scheduleHadithSending(bot) {
  // Отправка хадисов каждый день в 11:00 по Бишкеку
  cron.schedule(
    "0 11 * * *",
    async () => {
      console.log("📖 Начинается отправка ежедневных хадисов...");
      await sendHadithsToAllUsers(bot.telegram);
    },
    {
      timezone: "Asia/Bishkek",
    }
  );

  console.log("✅ Планировщик хадисов запущен (11:00 ежедневно)");
}

/**
 * Отправить хадисы всем пользователям с включенной подпиской
 */
async function sendHadithsToAllUsers(telegram) {
  try {
    const users = await hadithService.getUsersWithHadithsEnabled();
    console.log(`📋 Найдено пользователей с хадисами: ${users.length}`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let hadith = await hadithService.getNextHadithForUser(user.userId);

        if (!hadith) {
          console.log(
            `⚠️ Нет хадисов для пользователя ${user.userId} (коллекция пуста или не выбрана)`
          );
          continue;
        }

        const collection = user.selectedCollection;
        let message = hadithService.formatHadithMessage(hadith, collection);

        // Проверяем длину сообщения (лимит Telegram 4096 символов)
        const MAX_LENGTH = 4096;
        let attempts = 0;
        const MAX_ATTEMPTS = 10; // Максимум попыток найти подходящий хадис

        while (message.length > MAX_LENGTH && attempts < MAX_ATTEMPTS) {
          console.log(
            `⚠️ Хадис №${hadith.number} слишком длинный (${message.length} символов), пропускаем и берем следующий`
          );

          // Помечаем длинный хадис как отправленный (чтобы пропустить)
          await hadithService.markHadithAsSent(user.userId, hadith._id);

          // Получаем следующий хадис
          hadith = await hadithService.getNextHadithForUser(user.userId);

          if (!hadith) {
            console.log(`⚠️ Закончились хадисы для пользователя ${user.userId}`);
            break;
          }

          message = hadithService.formatHadithMessage(hadith, collection);
          attempts++;
        }

        // Если не нашли подходящий хадис после MAX_ATTEMPTS попыток
        if (!hadith || message.length > MAX_LENGTH) {
          console.log(
            `⚠️ Не удалось найти хадис подходящей длины для пользователя ${user.userId}`
          );
          continue;
        }

        // Отправляем хадис
        await telegram.sendMessage(user.userId, message, {
          parse_mode: "Markdown",
        });

        // Обновляем последний отправленный хадис
        await hadithService.markHadithAsSent(user.userId, hadith._id);

        successCount++;
        console.log(
          `✅ Хадис №${hadith.number} отправлен пользователю ${user.userId} (${message.length} символов)`
        );

        // Небольшая задержка между отправками (чтобы не упереться в лимиты Telegram)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Ошибка отправки хадиса пользователю ${user.userId}:`,
          error.message
        );
        // Не падаем, продолжаем отправку другим пользователям
      }
    }

    console.log(
      `📊 Отправка завершена. Успешно: ${successCount}, Ошибок: ${errorCount}`
    );
  } catch (error) {
    console.error("❌ Критическая ошибка при отправке хадисов:", error);
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

    const user = await hadithService.getUsersWithHadithsEnabled();
    const currentUser = user.find((u) => u.userId === userId);

    if (!currentUser) {
      return { success: false, message: "Хадисы не включены" };
    }

    const collection = currentUser.selectedCollection;
    const message = hadithService.formatHadithMessage(hadith, collection);

    await telegram.sendMessage(userId, message, {
      parse_mode: "Markdown",
    });

    await hadithService.markHadithAsSent(userId, hadith._id);

    return { success: true, hadith };
  } catch (error) {
    console.error(`❌ Ошибка отправки хадиса пользователю ${userId}:`, error);
    return { success: false, message: error.message };
  }
}
