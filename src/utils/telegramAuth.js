// Валидация Telegram WebApp initData — фундамент для будущего Telegram Mini App.
// Спецификация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import crypto from "node:crypto";
import { BOT_TOKEN } from "../config/constants.js";

/**
 * Проверить подпись initData, полученного от Telegram Mini App.
 * @param {string} initData - строка window.Telegram.WebApp.initData
 * @param {string} botToken - токен бота
 * @returns {{ valid: boolean, user: object|null }}
 */
export function validateInitData(initData, botToken = BOT_TOKEN) {
  if (!initData || !botToken) return { valid: false, user: null };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false, user: null };

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const valid = computedHash === hash;

  let user = null;
  const rawUser = params.get("user");
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      // некорректный JSON пользователя — оставляем null
    }
  }

  return { valid, user };
}
