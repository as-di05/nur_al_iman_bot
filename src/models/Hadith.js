import mongoose from 'mongoose';

const hadithSchema = new mongoose.Schema({
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HadithCollection',
    required: true,
    index: true
  },
  number: {
    type: String,
    required: true,
    // Номер хадиса в коллекции (может быть "1", "1234", "1/234" и т.д.)
  },
  contentRu: {
    type: String,
    required: true,
    // Содержание хадиса на русском - ОБЯЗАТЕЛЬНОЕ поле
  },
  contentAr: {
    type: String,
    default: null,
    // Содержание хадиса на арабском - можно добавить позже
  },
  narrators: {
    type: String,
    default: null,
    // Цепочка передатчиков (иснад) - можно добавить позже
  },
  scholarsExplanation: {
    type: String,
    default: null,
    // Разъяснения ученых о хадисе - можно добавить позже
  },
  order: {
    type: Number,
    required: true,
    // Порядковый номер для отправки (автоинкремент)
  },
  isActive: {
    type: Boolean,
    default: true,
    // Активен ли хадис для отправки
  }
}, {
  timestamps: true
});

// Составной индекс для уникальности (коллекция + номер)
hadithSchema.index({ collectionId: 1, number: 1 }, { unique: true });

// Индекс для сортировки при отправке
hadithSchema.index({ collectionId: 1, order: 1 });

export const Hadith = mongoose.model('Hadith', hadithSchema);
