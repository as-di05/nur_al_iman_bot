// Обработчики команд бота
import { Markup } from "telegraf";
import { getPrayerTimes } from "../services/prayerService.js";
import {
  sendFajrNotification,
  sendFajrJamaatInfo,
  sendNamazReminder,
} from "../services/notificationService.js";
import { getTimeMinusMinutes } from "../utils/timeUtils.js";
import { NAMAZ_NAMES, NAMAZ_MINUTES_BEFORE } from "../config/constants.js";
import { REGIONS, getCityName, ALL_CITIES } from "../config/locations.js";
import {
  setUserLocation,
  getUserLocation,
  hasUserLocation,
  setUserMinutesBefore,
  hasUserMinutesBefore,
  getUser,
} from "../services/userService.js";

// Временное хранилище для состояния пользователя (ожидание ввода minutesBefore)
const userStates = new Map();

// Обработчик команды /start
export async function handleStart(ctx, setChatId) {
  const chatId = ctx.chat.id;
  setChatId(chatId);
  console.log(`✅ Бот активирован для chatId: ${chatId}`);

  // Если у пользователя нет сохраненного местоположения, показываем выбор
  if (!(await hasUserLocation(chatId))) {
    return await showLocationSelection(ctx);
  }

  // Показываем расписание для сохраненного города
  await showSchedule(ctx, chatId);
}

// Показать выбор местоположения
async function showLocationSelection(ctx) {
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("🏙 Бишкек", "location_1"),
      Markup.button.callback("🏙 Ош", "location_2"),
    ],
    [Markup.button.callback("📍 Еще...", "show_regions")],
  ]);

  await ctx.reply(
    `🕌 *Ассаламу алейкум!*\n\n` +
      `Добро пожаловать в бот для оповещения о времени намаза.\n\n` +
      `Пожалуйста, выберите ваш город:`,
    {
      parse_mode: "Markdown",
      ...keyboard,
    }
  );
}

// Показать расписание
async function showSchedule(ctx, chatId) {
  const user = await getUser(chatId);
  const locationCode = user?.locationCode || 1;
  const minutesBefore = user?.minutesBefore || 15;
  const cityName = getCityName(locationCode);
  const times = await getPrayerTimes(locationCode);
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let message = `🕌 *Расписание оповещений о намазе*\n\n`;
  message += `📅 Сегодня: ${today}\n`;
  message += `📍 Город: ${cityName}\n\n`;
  message += `⏰ *Вы получите уведомления:*\n\n`;

  for (const [key, time] of Object.entries(times)) {
    let notifyTime, notifyText;
    if (key === "fajr") {
      notifyTime = time;
      notifyText = `  Намаз: ${time} | Уведомление: ${notifyTime} (точное время)`;
    } else {
      notifyTime = getTimeMinusMinutes(time, minutesBefore);
      notifyText = `  Намаз: ${time} | Уведомление: ${notifyTime} (за ${minutesBefore} мин)`;
    }
    message += `• ${NAMAZ_NAMES[key]}\n`;
    message += `${notifyText}\n\n`;
  }

  message += `_Фаджр - в точное время, остальные намазы - за ${minutesBefore} минут_\n\n`;
  message += `Чтобы изменить город: /location`;

  await ctx.reply(message, { parse_mode: "Markdown" });
}

// Команда для изменения местоположения
export async function handleLocation(ctx) {
  await showLocationSelection(ctx);
}

// Обработчик выбора региона
export async function handleShowRegions(ctx) {
  const keyboard = Markup.inlineKeyboard(
    [
      [Markup.button.callback("Баткенская область", "region_batken")],
      [Markup.button.callback("Жалал-Абадская область", "region_jalal_abad")],
      [Markup.button.callback("Иссык-Кульская область", "region_issyk_kul")],
      [Markup.button.callback("Нарынская область", "region_naryn")],
      [Markup.button.callback("Ошская область", "region_osh_region")],
      [Markup.button.callback("Таласская область", "region_talas")],
      [Markup.button.callback("Чуйская область", "region_chui")],
      [Markup.button.callback("🔙 Назад", "back_to_main")],
    ],
    { columns: 1 }
  );

  await ctx.editMessageText(`📍 *Выберите область:*`, {
    parse_mode: "Markdown",
    ...keyboard,
  });
}

// Обработчик выбора конкретного региона
export async function handleRegionSelection(ctx, regionKey) {
  const region = REGIONS[regionKey];
  if (!region) return;

  // Создаем кнопки для каждого города
  const cityButtons = Object.entries(region.cities).map(([code, name]) => {
    return [Markup.button.callback(name, `location_${code}`)];
  });

  // Добавляем кнопку "Назад"
  cityButtons.push([
    Markup.button.callback("🔙 Назад к областям", "show_regions"),
  ]);

  const keyboard = Markup.inlineKeyboard(cityButtons);

  await ctx.editMessageText(`📍 *${region.name}*\n\nВыберите город:`, {
    parse_mode: "Markdown",
    ...keyboard,
  });
}

// Обработчик текстового сообщения с кодом города
export async function handleCityCode(ctx, setChatId) {
  const text = ctx.message.text.trim();
  const code = parseInt(text);

  if (isNaN(code) || !ALL_CITIES[code]) {
    await ctx.reply(
      `❌ Неверный код города. Используйте /location для выбора города.`
    );
    return;
  }

  const chatId = ctx.chat.id;
  setChatId(chatId);
  await setUserLocation(chatId, code);

  const cityName = getCityName(code);
  await ctx.reply(
    `✅ Вы выбрали: *${cityName}*\n\nПолучаю расписание намазов...`,
    { parse_mode: "Markdown" }
  );

  await showSchedule(ctx, chatId);
}

// Обработчик выбора города через callback
export async function handleLocationCallback(ctx, locationCode, setChatId) {
  const chatId = ctx.from.id; // Для callback_query используем ctx.from.id
  setChatId(chatId);
  await setUserLocation(chatId, locationCode);

  const cityName = getCityName(locationCode);
  await ctx.editMessageText(
    `✅ Вы выбрали: *${cityName}*`,
    { parse_mode: "Markdown" }
  );

  // Спрашиваем за сколько минут отправлять уведомления
  await askMinutesBefore(ctx, chatId);
}

// Спросить пользователя за сколько минут отправлять уведомления
async function askMinutesBefore(ctx, chatId) {
  userStates.set(chatId, { waitingForMinutes: true });

  await ctx.reply(
    `⏰ *За сколько минут до намаза вы хотите получать уведомление?*\n\n` +
    `Введите число (например: 15)\n\n` +
    `_Примечание: Для Фаджра уведомление всегда приходит в точное время намаза._`,
    { parse_mode: "Markdown" }
  );
}

// Обработчик ввода minutesBefore
export async function handleMinutesBeforeInput(ctx, setChatId) {
  const chatId = ctx.chat.id;
  const userState = userStates.get(chatId);

  if (!userState || !userState.waitingForMinutes) {
    return false; // Не обрабатываем, если не ждем ввода
  }

  const text = ctx.message.text.trim();
  const minutes = parseInt(text);

  // Валидация
  if (isNaN(minutes) || minutes < 0 || minutes > 120) {
    await ctx.reply(
      `❌ *Неправильный формат*\n\n` +
      `Пожалуйста, введите число от 0 до 120`,
      { parse_mode: "Markdown" }
    );
    return true; // Обработали, но с ошибкой
  }

  // Сохраняем
  await setUserMinutesBefore(chatId, minutes);
  userStates.delete(chatId); // Очищаем состояние

  await ctx.reply(
    `✅ Сохранено! Вы будете получать уведомления за *${minutes} минут* до намаза.\n\n` +
    `Получаю расписание намазов...`,
    { parse_mode: "Markdown" }
  );

  // Показываем расписание
  await showSchedule(ctx, chatId);
  return true; // Успешно обработали
}

// Обработчик команды /fajr
export async function handleFajrTest(ctx) {
  const times = await getPrayerTimes();
  await sendFajrNotification(ctx.telegram, ctx.chat.id, times.fajr);
  setTimeout(async () => {
    await sendFajrJamaatInfo(ctx.telegram, ctx.chat.id);
  }, 2000);
}

// Обработчик команды /dhuhr
export async function handleDhuhrTest(ctx) {
  const times = await getPrayerTimes();
  const minutesBefore = NAMAZ_MINUTES_BEFORE.dhuhr;
  await sendNamazReminder(
    ctx.telegram,
    ctx.chat.id,
    "dhuhr",
    minutesBefore,
    times.dhuhr
  );
}

// Обработчик команды /asr
export async function handleAsrTest(ctx) {
  const times = await getPrayerTimes();
  const minutesBefore = NAMAZ_MINUTES_BEFORE.asr;
  await sendNamazReminder(
    ctx.telegram,
    ctx.chat.id,
    "asr",
    minutesBefore,
    times.asr
  );
}

// Обработчик команды /maghrib
export async function handleMaghribTest(ctx) {
  const times = await getPrayerTimes();
  const minutesBefore = NAMAZ_MINUTES_BEFORE.maghrib;
  await sendNamazReminder(
    ctx.telegram,
    ctx.chat.id,
    "maghrib",
    minutesBefore,
    times.maghrib
  );
}

// Обработчик команды /isha
export async function handleIshaTest(ctx) {
  const times = await getPrayerTimes();
  const minutesBefore = NAMAZ_MINUTES_BEFORE.isha;
  await sendNamazReminder(
    ctx.telegram,
    ctx.chat.id,
    "isha",
    minutesBefore,
    times.isha
  );
}
