// Константы приложения
import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN;

// Таймзона для всех cron-задач и расчёта дат
export const TIMEZONE = "Asia/Bishkek";

export const NAMAZ_NAMES = {
  fajr: "Фаджр",
  dhuhr: "Зухр",
  asr: "Аср",
  maghrib: "Магриб",
  isha: "Иша",
};

export const NAMAZ_MINUTES_BEFORE = {
  fajr: 0, // Фаджр - в точное время
  dhuhr: 15,
  asr: 15,
  maghrib: 15,
  isha: 15,
};

// Расписание cron-задач
export const SCHEDULE = {
  // Ежедневное перепланирование уведомлений (00:30 Bishkek)
  reschedule: "30 0 * * *",
  // Ежедневная отправка хадисов (11:00 Bishkek)
  hadith: "0 11 * * *",
};

// Настройки уведомлений
export const NOTIFICATIONS = {
  defaultMinutesBefore: 15,
  // Через сколько минут после Фаджра отправлять инфо о джамаате
  fajrJamaatDelayMinutes: 10,
  // Лимит длины сообщения Telegram
  maxMessageLength: 4096,
};

// Ограничение скорости отправки сообщений в Telegram (~25 сообщений/сек)
export const RATE_LIMIT = {
  minIntervalMs: 40,
};

// Настройки API времени намаза (muftiyat.kg)
export const API = {
  baseUrl: "https://muftiyat.kg/ru/api/v1/calendar",
  retryAttempts: 3,
  retryBaseDelayMs: 1000,
  timeoutMs: 10000,
};
