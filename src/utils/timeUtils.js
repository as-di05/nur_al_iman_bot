// Утилиты для работы со временем

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
