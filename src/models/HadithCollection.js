import mongoose from 'mongoose';

const hadithCollectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    // Например: "Сахих Бухари", "Сахих Муслим", "Сунан Абу Давуд" и т.д.
  },
  nameAr: {
    type: String,
    // Название на арабском (опционально)
  },
  description: {
    type: String,
    // Краткое описание коллекции
  },
  totalHadiths: {
    type: Number,
    default: 0,
    // Общее количество хадисов в коллекции
  },
  isActive: {
    type: Boolean,
    default: true,
    // Активна ли коллекция для отправки
  }
}, {
  timestamps: true
});

export const HadithCollection = mongoose.model('HadithCollection', hadithCollectionSchema);
