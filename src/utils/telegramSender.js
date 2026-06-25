// Централизованная отправка сообщений в Telegram:
//  - глобальный throttle (чтобы не упираться в лимит ~30 сообщений/сек),
//  - обработка 429 (Too Many Requests) с уважением retry_after,
//  - автодеактивация пользователей, заблокировавших бота (403 / chat not found).
import { logger } from "./logger.js";
import { sleep } from "./retry.js";
import { RATE_LIMIT } from "../config/constants.js";
import { deactivateUser } from "../services/userService.js";

const queue = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    try {
      const result = await job.fn();
      job.resolve(result);
    } catch (error) {
      job.reject(error);
    }
    // Пауза между отправками держит нас под лимитом Telegram
    await sleep(RATE_LIMIT.minIntervalMs);
  }

  processing = false;
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    processQueue();
  });
}

function isUserUnavailable(error) {
  const code = error?.response?.error_code;
  const desc = (error?.response?.description || error?.message || "").toLowerCase();
  return (
    code === 403 ||
    desc.includes("bot was blocked") ||
    desc.includes("user is deactivated") ||
    desc.includes("chat not found") ||
    desc.includes("bot was kicked")
  );
}

function getRetryAfter(error) {
  return error?.response?.parameters?.retry_after;
}

async function sendWithHandling(sendFn, chatId, isRetry = false) {
  try {
    return await enqueue(sendFn);
  } catch (error) {
    const retryAfter = getRetryAfter(error);
    if (retryAfter && !isRetry) {
      logger.warn(
        `⏳ Лимит Telegram (429) для чата ${chatId}, повтор через ${retryAfter}s`,
      );
      await sleep((retryAfter + 1) * 1000);
      return sendWithHandling(sendFn, chatId, true);
    }

    if (isUserUnavailable(error)) {
      logger.warn(`Чат ${chatId} недоступен: ${error.message}`);
      await deactivateUser(chatId);
      return null;
    }

    logger.error(`❌ Ошибка отправки в чат ${chatId}: ${error.message}`);
    return null;
  }
}

/**
 * Безопасно отправить текстовое сообщение.
 * Возвращает результат Telegram API либо null при неустранимой ошибке.
 */
export function safeSendMessage(telegram, chatId, text, extra = {}) {
  return sendWithHandling(
    () => telegram.sendMessage(chatId, text, extra),
    chatId,
  );
}
