// Сервис для работы с API времени намаза
import fetch from "node-fetch";

export async function getPrayerTimes(locationCode = 1) {
  const url = `https://muftiyat.kg/ru/api/v1/calendar/${locationCode}/`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(`Получены данные для локации ${locationCode}:`, data);
  const dataTime = Array.isArray(data) ? data[0] : data;
  const times = dataTime?.prayertimes[0];
  return {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}
