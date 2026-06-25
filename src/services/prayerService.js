// Сервис для работы с API времени намаза
import fetch from "node-fetch";
import { API } from "../config/constants.js";
import { withRetry } from "../utils/retry.js";
import { logger } from "../utils/logger.js";
import { parsePrayerTimes } from "../utils/prayerParser.js";
import { getBishkekDateString } from "../utils/timeUtils.js";
import { PrayerTimeCache } from "../models/PrayerTimeCache.js";

// Один запрос к API с таймаутом
async function fetchFromApi(locationCode) {
  const url = `${API.baseUrl}/${locationCode}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API.timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} от ${url}`);
    }
    const data = await res.json();
    return parsePrayerTimes(data);
  } finally {
    clearTimeout(timer);
  }
}

// Сохранить времена в кэш (на случай недоступности API)
async function cacheTimes(locationCode, date, times) {
  try {
    await PrayerTimeCache.findOneAndUpdate(
      { locationCode, date },
      { locationCode, date, times, fetchedAt: new Date() },
      { upsert: true },
    );
  } catch (error) {
    logger.warn(`Не удалось закэшировать время намаза (${locationCode}): ${error.message}`);
  }
}

// Получить времена из кэша: сначала на сегодня, иначе самые свежие для города
async function getCachedTimes(locationCode, date) {
  try {
    const today = await PrayerTimeCache.findOne({ locationCode, date });
    if (today) return today;
    return await PrayerTimeCache.findOne({ locationCode }).sort({ fetchedAt: -1 });
  } catch (error) {
    logger.error(`Ошибка чтения кэша времени намаза (${locationCode}): ${error.message}`);
    return null;
  }
}

/**
 * Получить времена намаза для города.
 * При сбое API использует кэш; бросает ошибку только если нет ни API, ни кэша.
 */
export async function getPrayerTimes(locationCode = 1) {
  const code = parseInt(locationCode);
  const date = getBishkekDateString();

  try {
    const times = await withRetry(() => fetchFromApi(code), {
      attempts: API.retryAttempts,
      baseDelayMs: API.retryBaseDelayMs,
      label: `API намаза (локация ${code})`,
    });
    await cacheTimes(code, date, times);
    return times;
  } catch (error) {
    logger.error(
      `Не удалось получить время намаза из API для локации ${code}: ${error.message}. Пробую кэш.`,
    );

    const cached = await getCachedTimes(code, date);
    if (cached) {
      logger.warn(
        `Использую кэш времени намаза для локации ${code} (за ${cached.date}).`,
      );
      return cached.times;
    }

    throw new Error(
      `Нет данных о времени намаза для локации ${code}: API недоступен и кэш пуст`,
    );
  }
}
