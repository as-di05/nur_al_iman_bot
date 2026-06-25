import mongoose from "mongoose";

const duaSchema = new mongoose.Schema(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DuaCollection",
      required: true,
      index: true,
    },
    titleRu: {
      type: String,
      required: true,
      // Название дуа: "Дуа перед сном" — ОБЯЗАТЕЛЬНОЕ поле
    },
    contentAr: {
      type: String,
      required: true,
      // Арабский текст — ОБЯЗАТЕЛЬНОЕ поле
    },
    transcription: {
      type: String,
      required: true,
      // Транскрипция кириллицей (чтобы прочитать) — ОБЯЗАТЕЛЬНОЕ поле
    },
    translationRu: {
      type: String,
      required: true,
      // Перевод/смысл на русском — ОБЯЗАТЕЛЬНОЕ поле
    },
    source: {
      type: String,
      default: null,
      // Источник (Бухари, Муслим, аят Корана) — можно добавить позже
    },
    benefit: {
      type: String,
      default: null,
      // Достоинство/фадиль — можно добавить позже
    },
    order: {
      type: Number,
      required: true,
      // Порядковый номер внутри раздела (автоинкремент)
    },
    isActive: {
      type: Boolean,
      default: true,
      // Видна ли дуа пользователям
    },
  },
  {
    timestamps: true,
  },
);

// Индекс для сортировки/листания внутри раздела
duaSchema.index({ collectionId: 1, order: 1 });

export const Dua = mongoose.model("Dua", duaSchema);
