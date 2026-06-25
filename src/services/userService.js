// Сервис для работы с пользователями
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';
import { NOTIFICATIONS } from '../config/constants.js';

// Установить местоположение пользователя
export async function setUserLocation(userId, locationCode) {
  try {
    await User.findOneAndUpdate(
      { userId },
      { locationCode, isActive: true, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    logger.info(`✅ Сохранено: пользователь ${userId} выбрал локацию ${locationCode}`);
  } catch (error) {
    logger.error('Ошибка при сохранении пользователя:', error.message);
  }
}

// Установить время уведомления (за сколько минут до намаза)
export async function setUserMinutesBefore(userId, minutesBefore) {
  try {
    await User.findOneAndUpdate(
      { userId },
      { minutesBefore, isActive: true, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    logger.info(`✅ Сохранено: пользователь ${userId} выбрал уведомление за ${minutesBefore} минут`);
  } catch (error) {
    logger.error('Ошибка при сохранении времени уведомления:', error.message);
  }
}

// Получить местоположение пользователя
export async function getUserLocation(userId) {
  try {
    const user = await User.findOne({ userId });
    return user?.locationCode || 1; // По умолчанию Бишкек
  } catch (error) {
    logger.error('Ошибка при получении пользователя:', error.message);
    return 1;
  }
}

// Проверить есть ли у пользователя сохраненное местоположение
export async function hasUserLocation(userId) {
  try {
    const user = await User.findOne({ userId });
    return user?.locationCode !== undefined;
  } catch (error) {
    logger.error('Ошибка при проверке пользователя:', error.message);
    return false;
  }
}

// Получить всех активных пользователей
// Фильтр { $ne: false } включает и старые записи без поля isActive
export async function getAllActiveUsers() {
  try {
    const users = await User.find({ isActive: { $ne: false } });
    return users.map(user => ({
      userId: user.userId,
      locationCode: user.locationCode,
      minutesBefore: user.minutesBefore || NOTIFICATIONS.defaultMinutesBefore
    }));
  } catch (error) {
    logger.error('Ошибка при получении всех пользователей:', error.message);
    return [];
  }
}

// Получить полную информацию о пользователе
export async function getUser(userId) {
  try {
    const user = await User.findOne({ userId });
    return user;
  } catch (error) {
    logger.error('Ошибка при получении пользователя:', error.message);
    return null;
  }
}

// Проверить есть ли у пользователя настройка minutesBefore
export async function hasUserMinutesBefore(userId) {
  try {
    const user = await User.findOne({ userId });
    return user?.minutesBefore !== undefined;
  } catch (error) {
    logger.error('Ошибка при проверке настройки пользователя:', error.message);
    return false;
  }
}

// Деактивировать пользователя (бот заблокирован или чат недоступен)
export async function deactivateUser(userId) {
  try {
    await User.updateOne({ userId }, { isActive: false });
    logger.warn(`🚫 Пользователь ${userId} деактивирован (бот заблокирован/чат недоступен)`);
  } catch (error) {
    logger.error('Ошибка при деактивации пользователя:', error.message);
  }
}

// Регистрация канала/группы автоматически
export async function registerChat(chatId, chatType, chatTitle, locationCode = 1, minutesBefore = NOTIFICATIONS.defaultMinutesBefore) {
  try {
    await User.findOneAndUpdate(
      { userId: chatId },
      {
        userId: chatId,
        chatType,
        chatTitle,
        locationCode,
        minutesBefore,
        isActive: true,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    logger.info(`✅ Зарегистрирован ${chatType}: ${chatTitle} (ID: ${chatId})`);
    return true;
  } catch (error) {
    logger.error('Ошибка при регистрации чата:', error.message);
    return false;
  }
}
