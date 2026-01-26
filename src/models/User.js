import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  chatType: {
    type: String,
    enum: ['private', 'group', 'supergroup', 'channel'],
    default: 'private'
  },
  chatTitle: {
    type: String,
    default: null
  },
  locationCode: {
    type: Number,
    required: true
  },
  minutesBefore: {
    type: Number,
    default: 15,
    min: 0,
    max: 120
  },
  // Настройки для хадисов
  hadithsEnabled: {
    type: Boolean,
    default: false,
    // Включены ли уведомления с хадисами
  },
  lastHadithSent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hadith',
    default: null,
    // ID последнего отправленного хадиса
  },
  hadithSendTime: {
    type: String,
    default: "09:00",
    // Время отправки хадиса в формате "HH:MM"
  },
  selectedCollection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HadithCollection',
    default: null,
    // Выбранная коллекция хадисов для отправки
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const User = mongoose.model('User', userSchema);
