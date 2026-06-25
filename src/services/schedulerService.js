// Сервис для планирования задач
import cron from "node-cron";
import { getPrayerTimes } from "./prayerService.js";
import {
  sendFajrNotification,
  sendFajrJamaatInfo,
  sendNamazReminder,
} from "./notificationService.js";
import { getDateTimeFromHHMM } from "../utils/timeUtils.js";
import { logger } from "../utils/logger.js";
import { NAMAZ_NAMES, NOTIFICATIONS, TIMEZONE } from "../config/constants.js";
import { getAllActiveUsers } from "./userService.js";
import { getCityName } from "../config/locations.js";

// Хранилище для запланированных задач
let scheduledTasks = [];

// Отменяем все предыдущие задачи
export function stopAllScheduledTasks() {
  scheduledTasks.forEach((task) => task.stop());
  scheduledTasks = [];
  logger.info("🧹 Очищены все предыдущие задачи");
}

// Группировка пользователей по locationCode (оптимизация API-запросов)
function groupUsersByLocation(users) {
  const usersByLocation = {};
  users.forEach((user) => {
    if (!usersByLocation[user.locationCode]) {
      usersByLocation[user.locationCode] = [];
    }
    usersByLocation[user.locationCode].push({
      userId: user.userId,
      minutesBefore: user.minutesBefore || NOTIFICATIONS.defaultMinutesBefore,
    });
  });
  return usersByLocation;
}

// Планирование уведомлений для одного города
function scheduleLocation(bot, locationUsers, times) {
  for (const [name, time] of Object.entries(times)) {
    const targetTime = getDateTimeFromHHMM(time);

    if (name === "fajr") {
      // Уведомление в точное время Фаджра
      const cronTime = `${targetTime.getMinutes()} ${targetTime.getHours()} * * *`;
      const task = cron.schedule(
        cronTime,
        async () => {
          logger.info(`🔔 Отправка Фаджр уведомлений (${time})...`);
          for (const user of locationUsers) {
            await sendFajrNotification(bot.telegram, user.userId, time);
          }
        },
        { timezone: TIMEZONE },
      );
      scheduledTasks.push(task);
      logger.info(`   ⏰ ${NAMAZ_NAMES[name]}: ${cronTime} (${time}) - точное время`);

      // Отдельная задача с инфо о джамаате (через N минут после Фаджра)
      const jamaatTime = getDateTimeFromHHMM(time);
      jamaatTime.setMinutes(
        jamaatTime.getMinutes() + NOTIFICATIONS.fajrJamaatDelayMinutes,
      );
      const jamaatCron = `${jamaatTime.getMinutes()} ${jamaatTime.getHours()} * * *`;
      const jamaatTask = cron.schedule(
        jamaatCron,
        async () => {
          logger.info("ℹ️ Отправка инфо о джамаате (Фаджр)...");
          for (const user of locationUsers) {
            await sendFajrJamaatInfo(bot.telegram, user.userId);
          }
        },
        { timezone: TIMEZONE },
      );
      scheduledTasks.push(jamaatTask);
      logger.info(
        `   ⏰ Джамаат (Фаджр): ${jamaatCron} (+${NOTIFICATIONS.fajrJamaatDelayMinutes} мин)`,
      );
    } else {
      // Остальные намазы — группируем пользователей по minutesBefore
      const usersByMinutes = {};
      locationUsers.forEach((user) => {
        const minutes = user.minutesBefore;
        if (!usersByMinutes[minutes]) usersByMinutes[minutes] = [];
        usersByMinutes[minutes].push(user.userId);
      });

      for (const [minutesBefore, userIds] of Object.entries(usersByMinutes)) {
        const minutes = parseInt(minutesBefore);
        const notifyTime = getDateTimeFromHHMM(time);
        notifyTime.setMinutes(notifyTime.getMinutes() - minutes);
        const cronTime = `${notifyTime.getMinutes()} ${notifyTime.getHours()} * * *`;

        const task = cron.schedule(
          cronTime,
          async () => {
            logger.info(
              `🔔 Отправка ${NAMAZ_NAMES[name]} уведомлений (${time}, за ${minutes} мин)...`,
            );
            for (const userId of userIds) {
              await sendNamazReminder(bot.telegram, userId, name, minutes, time);
            }
          },
          { timezone: TIMEZONE },
        );
        scheduledTasks.push(task);
        logger.info(
          `   ⏰ ${NAMAZ_NAMES[name]}: ${cronTime} (${notifyTime
            .toTimeString()
            .slice(0, 5)}) - за ${minutes} мин (${userIds.length} польз.)`,
        );
      }
    }
  }
}

// Основная логика планирования для ВСЕХ пользователей
export async function scheduleAllUsersNotifications(bot) {
  stopAllScheduledTasks();

  const users = await getAllActiveUsers();
  logger.info(`📋 Найдено активных пользователей: ${users.length}`);

  if (users.length === 0) {
    logger.warn("⚠️ Нет активных пользователей для планирования уведомлений");
    return;
  }

  const usersByLocation = groupUsersByLocation(users);
  const uniqueLocations = Object.keys(usersByLocation);
  logger.info(
    `📍 Уникальных локаций: ${uniqueLocations.length} (вместо ${users.length} запросов к API)`,
  );

  for (const [locationCode, locationUsers] of Object.entries(usersByLocation)) {
    const cityName = getCityName(locationCode);
    logger.info(`🌍 Обработка локации: ${cityName} (код ${locationCode})`);
    logger.info(`   👥 Пользователей в этом городе: ${locationUsers.length}`);

    // Сбой одного города не должен ломать расписание остальных
    try {
      const times = await getPrayerTimes(parseInt(locationCode));
      logger.info(`   ✅ Получены времена намазов: ${JSON.stringify(times)}`);
      scheduleLocation(bot, locationUsers, times);
    } catch (error) {
      logger.error(
        `   ❌ Пропускаю локацию ${cityName} (${locationCode}): ${error.message}`,
      );
    }
  }

  logger.info(`✅ Всего запланировано задач: ${scheduledTasks.length}`);
}
