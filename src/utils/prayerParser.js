// Чистая функция парсинга ответа API времени намаза.
// Вынесена отдельно от prayerService, чтобы покрывать тестами без зависимостей от БД/сети.

export const REQUIRED_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/**
 * Извлечь времена намазов из ответа muftiyat.kg.
 * Поддерживает как формат-массив, так и формат-объект.
 * @param {any} data - распарсенный JSON ответа API
 * @returns {{fajr:string,dhuhr:string,asr:string,maghrib:string,isha:string}}
 */
export function parsePrayerTimes(data) {
  const root = Array.isArray(data) ? data[0] : data;
  const times = root?.prayertimes?.[0];

  if (!times) {
    throw new Error("Неожиданный формат ответа API времени намаза");
  }

  const result = {};
  for (const key of REQUIRED_PRAYERS) {
    if (!times[key]) {
      throw new Error(`В ответе API отсутствует время намаза: ${key}`);
    }
    result[key] = times[key];
  }

  return result;
}
