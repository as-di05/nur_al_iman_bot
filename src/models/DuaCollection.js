import mongoose from "mongoose";

// Раздел дуа (тематическая категория): "Утренние", "Вечерние",
// "После намаза", "Перед сном" и т.д. Создаётся администратором.
const duaCollectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      // Например: "Утренние азкары", "Дуа перед сном"
    },
    nameAr: {
      type: String,
      // Название на арабском (опционально)
    },
    description: {
      type: String,
      // Краткое описание раздела
    },
    totalDuas: {
      type: Number,
      default: 0,
      // Общее количество дуа в разделе
    },
    isActive: {
      type: Boolean,
      default: true,
      // Виден ли раздел пользователям
    },
  },
  {
    timestamps: true,
  },
);

export const DuaCollection = mongoose.model(
  "DuaCollection",
  duaCollectionSchema,
);
