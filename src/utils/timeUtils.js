// Утилиты для работы со временем
import { TIMEZONE } from "../config/constants.js";

// Преобразуем "05:58" → Date
export function getDateTimeFromHHMM(hhmm) {
  const now = new Date();
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
}

// Вычитаем нужное количество минут
export function getTimeMinusMinutes(hhmm, minutes) {
  const time = getDateTimeFromHHMM(hhmm);
  time.setMinutes(time.getMinutes() - minutes);
  return time.toTimeString().slice(0, 5); // "HH:MM"
}

// Текущая дата в формате YYYY-MM-DD по таймзоне Asia/Bishkek
export function getBishkekDateString(date = new Date()) {
  // en-CA даёт формат YYYY-MM-DD
  return date.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}
