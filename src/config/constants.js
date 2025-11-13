// Константы приложения
import dotenv from 'dotenv';
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN;

export const API_URL = "https://muftiyat.kg/ru/api/v1/calendar/1/";

export const NAMAZ_NAMES = {
  fajr: "Фаджр (Утренний)",
  dhuhr: "Зухр (Обеденный)",
  asr: "Аср (Послеполуденный)",
  maghrib: "Магриб (Вечерний)",
  isha: "Иша (Ночной)",
};

export const NAMAZ_MINUTES_BEFORE = {
  fajr: 0, // Фаджр - в точное время
  dhuhr: 15,
  asr: 15,
  maghrib: 15,
  isha: 15,
};
