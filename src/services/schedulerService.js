// Сервис для планирования задач
import cron from "node-cron";
import { getPrayerTimes } from "./prayerService.js";
import {
  sendFajrNotification,
  sendFajrJamaatInfo,
  sendNamazReminder,
} from "./notificationService.js";
import { getDateTimeFromHHMM } from "../utils/timeUtils.js";
import {
  NAMAZ_NAMES,
  NAMAZ_MINUTES_BEFORE,
} from "../config/constants.js";
import { getAllActiveUsers } from "./userService.js";
import { getCityName } from "../config/locations.js";

// Хранилище для запланированных задач
let scheduledTasks = [];

// Отменяем все предыдущие задачи
function clearScheduledTasks() {
  scheduledTasks.forEach((task) => task.stop());
  scheduledTasks = [];
  console.log("🧹 Очищены все предыдущие задачи");
}

// Основная логика планирования для ВСЕХ пользователей
export async function scheduleAllUsersNotifications(bot) {
  clearScheduledTasks();

  // Шаг 1: Получаем всех активных пользователей из MongoDB
  const users = await getAllActiveUsers();
  console.log(`📋 Найдено активных пользователей: ${users.length}`);

  if (users.length === 0) {
    console.log("⚠️ Нет активных пользователей для планирования уведомлений");
    return;
  }

  // Шаг 2: Группируем пользователей по locationCode (оптимизация API запросов)
  const usersByLocation = {};
  users.forEach((user) => {
    if (!usersByLocation[user.locationCode]) {
      usersByLocation[user.locationCode] = [];
    }
    usersByLocation[user.locationCode].push({
      userId: user.userId,
      minutesBefore: user.minutesBefore || 15
    });
  });

  const uniqueLocations = Object.keys(usersByLocation);
  console.log(
    `📍 Уникальных локаций: ${uniqueLocations.length} (вместо ${users.length} запросов к API)`
  );

  // Шаг 3: Для каждой уникальной локации делаем ОДИН запрос к API
  for (const [locationCode, locationUsers] of Object.entries(usersByLocation)) {
    const cityName = getCityName(locationCode);
    console.log(
      `\n🌍 Обработка локации: ${cityName} (код ${locationCode})`
    );
    console.log(`   👥 Пользователей в этом городе: ${locationUsers.length}`);

    // Один запрос к API для всех пользователей этого города
    const times = await getPrayerTimes(parseInt(locationCode));
    console.log(`   ✅ Получены времена намазов:`, times);

    // Шаг 4: Создаем расписание уведомлений для всех пользователей этого города
    console.log(`   📅 Создание расписания для ${locationUsers.length} пользователей...`);

    for (const [name, time] of Object.entries(times)) {
      const targetTime = getDateTimeFromHHMM(time);

      // Для Фаджра - отправляем в точное время (всем пользователям одинаково)
      if (name === "fajr") {
        const cronTime = `${targetTime.getMinutes()} ${targetTime.getHours()} * * *`;

        // Одна крон-задача отправит уведомления ВСЕМ пользователям этого города
        const task = cron.schedule(cronTime, async () => {
          console.log(`🔔 Отправка Фаджр уведомлений (${time})...`);
          for (const user of locationUsers) {
            try {
              await sendFajrNotification(bot.telegram, user.userId, time);
              setTimeout(async () => {
                await sendFajrJamaatInfo(bot.telegram, user.userId);
              }, 2000);
            } catch (error) {
              console.error(
                `❌ Ошибка отправки Фаджр пользователю ${user.userId}:`,
                error.message
              );
            }
          }
        }, {
          timezone: "Asia/Bishkek"
        });

        scheduledTasks.push(task);
        console.log(
          `   ⏰ ${NAMAZ_NAMES[name]}: ${cronTime} (${time}) - точное время`
        );
      }
      // Для остальных намазов - группируем по minutesBefore
      else {
        // Группируем пользователей по их предпочтению minutesBefore
        const usersByMinutes = {};
        locationUsers.forEach((user) => {
          const minutes = user.minutesBefore;
          if (!usersByMinutes[minutes]) {
            usersByMinutes[minutes] = [];
          }
          usersByMinutes[minutes].push(user.userId);
        });

        // Создаем отдельный крон для каждого значения minutesBefore
        for (const [minutesBefore, userIds] of Object.entries(usersByMinutes)) {
          const minutes = parseInt(minutesBefore);
          const notifyTime = getDateTimeFromHHMM(time);
          notifyTime.setMinutes(notifyTime.getMinutes() - minutes);
          const cronTime = `${notifyTime.getMinutes()} ${notifyTime.getHours()} * * *`;

          // Крон-задача для пользователей с одинаковым minutesBefore
          const task = cron.schedule(cronTime, async () => {
            console.log(`🔔 Отправка ${NAMAZ_NAMES[name]} уведомлений (${time}, за ${minutes} мин)...`);
            for (const userId of userIds) {
              try {
                await sendNamazReminder(
                  bot.telegram,
                  userId,
                  name,
                  minutes,
                  time
                );
              } catch (error) {
                console.error(
                  `❌ Ошибка отправки ${name} пользователю ${userId}:`,
                  error.message
                );
              }
            }
          }, {
            timezone: "Asia/Bishkek"
          });

          scheduledTasks.push(task);
          console.log(
            `   ⏰ ${NAMAZ_NAMES[name]}: ${cronTime} (${notifyTime
              .toTimeString()
              .slice(0, 5)}) - за ${minutes} мин (${userIds.length} польз.)`
          );
        }
      }
    }
  }

  console.log(`\n✅ Всего запланировано задач: ${scheduledTasks.length}`);
}
