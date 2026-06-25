// Сервис для работы с дуа
import { Dua } from "../models/Dua.js";
import { DuaCollection } from "../models/DuaCollection.js";

// ==================== РАЗДЕЛЫ ====================

/**
 * Создать новый раздел дуа
 */
export async function createCollection(name, nameAr = null, description = null) {
  const collection = new DuaCollection({ name, nameAr, description });
  await collection.save();
  return collection;
}

/**
 * Получить все разделы
 */
export async function getAllCollections() {
  return await DuaCollection.find().sort({ name: 1 });
}

/**
 * Получить только разделы, в которых есть активные дуа (для пользователей)
 */
export async function getVisibleCollections() {
  return await DuaCollection.find({
    isActive: true,
    totalDuas: { $gt: 0 },
  }).sort({ name: 1 });
}

/**
 * Получить раздел по ID
 */
export async function getCollectionById(collectionId) {
  return await DuaCollection.findById(collectionId);
}

/**
 * Обновить счётчик дуа в разделе
 */
async function updateCollectionCount(collectionId) {
  const count = await Dua.countDocuments({ collectionId, isActive: true });
  await DuaCollection.findByIdAndUpdate(collectionId, { totalDuas: count });
}

// ==================== ДУА ====================

/**
 * Добавить новую дуа.
 * Минимум: название, арабский текст, транскрипция, перевод.
 */
export async function addDua(collectionId, fields) {
  const lastDua = await Dua.findOne({ collectionId })
    .sort({ order: -1 })
    .limit(1);

  const order = lastDua ? lastDua.order + 1 : 1;

  const dua = new Dua({
    collectionId,
    titleRu: fields.titleRu,
    contentAr: fields.contentAr,
    transcription: fields.transcription,
    translationRu: fields.translationRu,
    order,
  });

  await dua.save();
  await updateCollectionCount(collectionId);

  return dua;
}

/**
 * Обновить дуа (любые поля кроме collectionId и order)
 */
export async function updateDua(duaId, updates) {
  const allowedUpdates = [
    "titleRu",
    "contentAr",
    "transcription",
    "translationRu",
    "source",
    "benefit",
    "isActive",
  ];

  const filteredUpdates = {};
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  const dua = await Dua.findByIdAndUpdate(duaId, filteredUpdates, {
    new: true,
  });

  if (updates.isActive !== undefined) {
    await updateCollectionCount(dua.collectionId);
  }

  return dua;
}

/**
 * Получить дуа по ID
 */
export async function getDuaById(duaId) {
  return await Dua.findById(duaId).populate("collectionId");
}

/**
 * Получить все дуа раздела (по умолчанию только активные, по порядку)
 */
export async function getDuasByCollection(collectionId, activeOnly = true) {
  const filter = { collectionId };
  if (activeOnly) {
    filter.isActive = true;
  }
  return await Dua.find(filter).sort({ order: 1 });
}

/**
 * Удалить дуа
 */
export async function deleteDua(duaId) {
  const dua = await Dua.findById(duaId);
  if (!dua) {
    throw new Error("Дуа не найдена");
  }

  const collectionId = dua.collectionId;
  await Dua.findByIdAndDelete(duaId);
  await updateCollectionCount(collectionId);

  return true;
}

/**
 * Форматировать дуа для отправки
 */
export function formatDuaMessage(dua, collection, position = null) {
  let message = `🤲 *${dua.titleRu}*\n`;
  if (collection?.name) {
    const pos = position ? ` (${position})` : "";
    message += `_${collection.name}${pos}_\n`;
  }
  message += `\n${dua.contentAr}\n`;

  message += `\n📝 _Транскрипция:_\n*${dua.transcription}*\n`;

  message += `\n💬 _Перевод:_\n${dua.translationRu}\n`;

  if (dua.source) {
    message += `\n📚 _Источник:_ ${dua.source}\n`;
  }

  if (dua.benefit) {
    message += `\n💡 *Достоинство:*\n${dua.benefit}`;
  }

  return message;
}
