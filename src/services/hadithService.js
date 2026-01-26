// Сервис для работы с хадисами
import { Hadith } from "../models/Hadith.js";
import { HadithCollection } from "../models/HadithCollection.js";
import { User } from "../models/User.js";

// ==================== КОЛЛЕКЦИИ ====================

/**
 * Создать новую коллекцию хадисов
 */
export async function createCollection(name, nameAr = null, description = null) {
  const collection = new HadithCollection({
    name,
    nameAr,
    description,
  });
  await collection.save();
  return collection;
}

/**
 * Получить все коллекции
 */
export async function getAllCollections() {
  return await HadithCollection.find().sort({ name: 1 });
}

/**
 * Получить коллекцию по ID
 */
export async function getCollectionById(collectionId) {
  return await HadithCollection.findById(collectionId);
}

/**
 * Обновить счетчик хадисов в коллекции
 */
async function updateCollectionCount(collectionId) {
  const count = await Hadith.countDocuments({ collectionId, isActive: true });
  await HadithCollection.findByIdAndUpdate(collectionId, {
    totalHadiths: count,
  });
}

// ==================== ХАДИСЫ ====================

/**
 * Добавить новый хадис (минимум: номер + содержание на русском)
 */
export async function addHadith(collectionId, number, contentRu) {
  // Получаем максимальный order для автоинкремента
  const lastHadith = await Hadith.findOne({ collectionId })
    .sort({ order: -1 })
    .limit(1);

  const order = lastHadith ? lastHadith.order + 1 : 1;

  const hadith = new Hadith({
    collectionId,
    number,
    contentRu,
    order,
  });

  await hadith.save();
  await updateCollectionCount(collectionId);

  return hadith;
}

/**
 * Обновить хадис (любые поля кроме collectionId и order)
 */
export async function updateHadith(hadithId, updates) {
  const allowedUpdates = [
    "number",
    "contentRu",
    "contentAr",
    "narrators",
    "scholarsExplanation",
    "isActive",
  ];

  const filteredUpdates = {};
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  const hadith = await Hadith.findByIdAndUpdate(hadithId, filteredUpdates, {
    new: true,
  });

  if (updates.isActive !== undefined) {
    await updateCollectionCount(hadith.collectionId);
  }

  return hadith;
}

/**
 * Получить хадис по ID
 */
export async function getHadithById(hadithId) {
  return await Hadith.findById(hadithId).populate("collectionId");
}

/**
 * Получить все хадисы коллекции
 */
export async function getHadithsByCollection(collectionId, activeOnly = true) {
  const filter = { collectionId };
  if (activeOnly) {
    filter.isActive = true;
  }

  return await Hadith.find(filter).sort({ order: 1 });
}

/**
 * Найти хадис по коллекции и номеру
 */
export async function findHadithByNumber(collectionId, number) {
  return await Hadith.findOne({ collectionId, number }).populate(
    "collectionId"
  );
}

/**
 * Удалить хадис
 */
export async function deleteHadith(hadithId) {
  const hadith = await Hadith.findById(hadithId);
  if (!hadith) {
    throw new Error("Хадис не найден");
  }

  const collectionId = hadith.collectionId;
  await Hadith.findByIdAndDelete(hadithId);
  await updateCollectionCount(collectionId);

  return true;
}

// ==================== ОТПРАВКА ПОЛЬЗОВАТЕЛЯМ ====================

/**
 * Получить следующий хадис для пользователя
 */
export async function getNextHadithForUser(userId) {
  const user = await User.findOne({ userId }).populate("selectedCollection");

  if (!user || !user.hadithsEnabled || !user.selectedCollection) {
    return null;
  }

  const collectionId = user.selectedCollection._id;

  // Если пользователь еще не получал хадисы, начинаем с первого
  if (!user.lastHadithSent) {
    return await Hadith.findOne({ collectionId, isActive: true }).sort({
      order: 1,
    });
  }

  // Ищем следующий хадис после последнего отправленного
  const lastHadith = await Hadith.findById(user.lastHadithSent);
  if (!lastHadith) {
    // Если последний хадис был удален, начинаем сначала
    return await Hadith.findOne({ collectionId, isActive: true }).sort({
      order: 1,
    });
  }

  const nextHadith = await Hadith.findOne({
    collectionId,
    isActive: true,
    order: { $gt: lastHadith.order },
  }).sort({ order: 1 });

  // Если следующего нет, начинаем сначала (круговая отправка)
  if (!nextHadith) {
    return await Hadith.findOne({ collectionId, isActive: true }).sort({
      order: 1,
    });
  }

  return nextHadith;
}

/**
 * Обновить последний отправленный хадис пользователю
 */
export async function markHadithAsSent(userId, hadithId) {
  await User.findOneAndUpdate({ userId }, { lastHadithSent: hadithId });
}

/**
 * Получить всех пользователей с включенными хадисами
 */
export async function getUsersWithHadithsEnabled() {
  return await User.find({ hadithsEnabled: true }).populate(
    "selectedCollection"
  );
}

/**
 * Форматировать хадис для отправки
 */
export function formatHadithMessage(hadith, collection) {
  let message = `📖 *${collection.name}*\n`;
  message += `*Хадис №${hadith.number}*\n\n`;

  // Арабский текст (если есть)
  if (hadith.contentAr) {
    message += `${hadith.contentAr}\n\n`;
  }

  // Русский текст
  message += `${hadith.contentRu}\n`;

  // Передатчики (если есть)
  if (hadith.narrators) {
    message += `\n_Передатчики:_ ${hadith.narrators}\n`;
  }

  // Разъяснения (если есть)
  if (hadith.scholarsExplanation) {
    message += `\n💡 *Разъяснение:*\n${hadith.scholarsExplanation}`;
  }

  return message;
}
