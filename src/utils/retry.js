// Утилиты для повторных попыток и пауз.
import { logger } from "./logger.js";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Выполнить функцию с повторными попытками и экспоненциальной задержкой.
 * @param {() => Promise<any>} fn - асинхронная операция
 * @param {object} options
 * @param {number} options.attempts - максимальное число попыток
 * @param {number} options.baseDelayMs - базовая задержка между попытками
 * @param {string} options.label - подпись для логов
 */
export async function withRetry(
  fn,
  { attempts = 3, baseDelayMs = 1000, label = "операция" } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(
        `Попытка ${attempt}/${attempts} (${label}) не удалась: ${error.message}`,
      );
      if (attempt < attempts) {
        await sleep(baseDelayMs * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError;
}
