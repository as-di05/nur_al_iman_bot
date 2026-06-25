// HTTP-сервер: health-проверки и REST API.
// API-слой подготовлен под будущий Telegram Mini App — он переиспользует
// те же сервисы, что и бот, поэтому новый интерфейс не дублирует логику.
import express from "express";
import mongoose from "mongoose";
import { logger } from "./utils/logger.js";
import { getPrayerTimes } from "./services/prayerService.js";
import { ALL_CITIES, getCityName } from "./config/locations.js";

const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

/**
 * Запустить HTTP-сервер.
 * @returns {Promise<import('http').Server>}
 */
export function startServer(port) {
  const app = express();
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({
      status: "running",
      message: "Namaz Bot is running",
      uptime: process.uptime(),
    });
  });

  // Health-проверка с реальным состоянием подключения к БД
  app.get("/health", (req, res) => {
    const dbState = mongoose.connection.readyState; // 1 = connected
    const healthy = dbState === 1;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "healthy" : "degraded",
      db: DB_STATES[dbState] ?? "unknown",
      uptime: process.uptime(),
    });
  });

  // ==================== API для будущего Telegram Mini App ====================

  // Список доступных городов
  app.get("/api/locations", (req, res) => {
    const locations = Object.entries(ALL_CITIES).map(([code, info]) => ({
      code: Number(code),
      name: info.name,
      regionName: info.regionName,
    }));
    res.json(locations);
  });

  // Времена намаза по коду города
  app.get("/api/prayer-times/:locationCode", async (req, res) => {
    const code = Number(req.params.locationCode);
    if (Number.isNaN(code) || !ALL_CITIES[code]) {
      return res.status(404).json({ error: "Неизвестный код города" });
    }

    try {
      const times = await getPrayerTimes(code);
      res.json({ locationCode: code, city: getCityName(code), times });
    } catch (error) {
      logger.error(`API /prayer-times (${code}): ${error.message}`);
      res.status(502).json({ error: "Не удалось получить время намаза" });
    }
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`🌐 HTTP сервер запущен на порту ${port}`);
      resolve(server);
    });
  });
}
