// Сервис для работы с пользователями
import { User } from '../models/User.js';

// Установить местоположение пользователя
export async function setUserLocation(userId, locationCode) {
  try {
    await User.findOneAndUpdate(
      { userId },
      { locationCode, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    console.log(`✅ Сохранено: пользователь ${userId} выбрал локацию ${locationCode}`);
  } catch (error) {
    console.error('Ошибка при сохранении пользователя:', error);
  }
}

// Установить время уведомления (за сколько минут до намаза)
export async function setUserMinutesBefore(userId, minutesBefore) {
  try {
    await User.findOneAndUpdate(
      { userId },
      { minutesBefore, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    console.log(`✅ Сохранено: пользователь ${userId} выбрал уведомление за ${minutesBefore} минут`);
  } catch (error) {
    console.error('Ошибка при сохранении времени уведомления:', error);
  }
}

// Получить местоположение пользователя
export async function getUserLocation(userId) {
  try {
    const user = await User.findOne({ userId });
    return user?.locationCode || 1; // По умолчанию Бишкек
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    return 1;
  }
}

// Проверить есть ли у пользователя сохраненное местоположение
export async function hasUserLocation(userId) {
  try {
    const user = await User.findOne({ userId });
    return user?.locationCode !== undefined;
  } catch (error) {
    console.error('Ошибка при проверке пользователя:', error);
    return false;
  }
}

// Получить всех активных пользователей
export async function getAllActiveUsers() {
  try {
    const users = await User.find({});
    return users.map(user => ({
      userId: user.userId,
      locationCode: user.locationCode,
      minutesBefore: user.minutesBefore || 15
    }));
  } catch (error) {
    console.error('Ошибка при получении всех пользователей:', error);
    return [];
  }
}

// Получить полную информацию о пользователе
export async function getUser(userId) {
  try {
    const user = await User.findOne({ userId });
    return user;
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    return null;
  }
}

// Проверить есть ли у пользователя настройка minutesBefore
export async function hasUserMinutesBefore(userId) {
  try {
    const user = await User.findOne({ userId });
    return user?.minutesBefore !== undefined;
  } catch (error) {
    console.error('Ошибка при проверке настройки пользователя:', error);
    return false;
  }
}
