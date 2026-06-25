import mongoose from "mongoose";

// Кэш времён намаза по городу и дате.
// Нужен как фолбэк, если API muftiyat.kg недоступен в момент планирования.
const prayerTimeCacheSchema = new mongoose.Schema(
  {
    locationCode: { type: Number, required: true },
    // Дата в формате YYYY-MM-DD по таймзоне Asia/Bishkek
    date: { type: String, required: true },
    times: {
      fajr: { type: String, required: true },
      dhuhr: { type: String, required: true },
      asr: { type: String, required: true },
      maghrib: { type: String, required: true },
      isha: { type: String, required: true },
    },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

prayerTimeCacheSchema.index({ locationCode: 1, date: 1 }, { unique: true });

export const PrayerTimeCache = mongoose.model(
  "PrayerTimeCache",
  prayerTimeCacheSchema,
);
