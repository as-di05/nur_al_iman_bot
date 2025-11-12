// Сервис для отправки уведомлений
import { NAMAZ_NAMES } from "../config/constants.js";

export function sendFajrNotification(telegram, chatId, time) {
  return telegram.sendMessage(
    chatId,
    `🕌 *Наступило время Фаджр намаза*\n\n` +
      `Время: ${time}\n\n` +
      `🤲 Да примет Аллах ваш намаз!`,
    { parse_mode: "Markdown" }
  );
}

export function sendFajrJamaatInfo(telegram, chatId) {
  return telegram.sendMessage(
    chatId,
    `ℹ️ *Информация о джамаате*\n\n` +
      `Джамаат начинает намаз примерно через 30-40 минут после наступления времени Фаджра`,
    { parse_mode: "Markdown" }
  );
}

export function sendNamazReminder(telegram, chatId, namazName, minutesBefore, time) {
  return telegram.sendMessage(
    chatId,
    `🕌 *Напоминание о намазе*\n\n` +
      `Через ${minutesBefore} минут начинается *${NAMAZ_NAMES[namazName]}*\n` +
      `Время намаза: ${time}\n\n` +
      `🤲 Да примет Аллах ваш намаз!`,
    { parse_mode: "Markdown" }
  );
}
