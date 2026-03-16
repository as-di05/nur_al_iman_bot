// Сервис для отправки уведомлений
import { NAMAZ_NAMES } from "../config/constants.js";

export function sendFajrNotification(telegram, chatId, time) {
  return telegram.sendMessage(
    chatId,
    `🕌 *Наступило время Фаджр намаза*\n` + `🔘 Время: ${time}`,
    { parse_mode: "Markdown" },
  );
}

export function sendFajrJamaatInfo(telegram, chatId) {
  return telegram.sendMessage(
    chatId,
    `ℹ️ *Информация о джамаате*\n\n` +
      `Джамаат начинает намаз примерно через 30-40 минут после наступления времени Фаджра`,
    { parse_mode: "Markdown" },
  );
}

export function sendNamazReminder(
  telegram,
  chatId,
  namazName,
  minutesBefore,
  time,
) {
  return telegram.sendMessage(
    chatId,
    `🕌 *${NAMAZ_NAMES[namazName]} — через ${minutesBefore} минут*\n` +
      `🔘 Время намаза: ${time}`,
    { parse_mode: "Markdown" },
  );
}
