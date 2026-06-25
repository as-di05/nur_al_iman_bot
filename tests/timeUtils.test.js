import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getDateTimeFromHHMM,
  getTimeMinusMinutes,
  getBishkekDateString,
} from "../src/utils/timeUtils.js";

test("getDateTimeFromHHMM разбирает часы и минуты", () => {
  const d = getDateTimeFromHHMM("05:58");
  assert.equal(d.getHours(), 5);
  assert.equal(d.getMinutes(), 58);
});

test("getTimeMinusMinutes вычитает минуты", () => {
  assert.equal(getTimeMinusMinutes("12:30", 15), "12:15");
});

test("getTimeMinusMinutes корректно переходит через час", () => {
  assert.equal(getTimeMinusMinutes("12:05", 10), "11:55");
});

test("getBishkekDateString возвращает формат YYYY-MM-DD", () => {
  assert.match(
    getBishkekDateString(new Date("2026-06-24T00:00:00Z")),
    /^\d{4}-\d{2}-\d{2}$/,
  );
});

test("getBishkekDateString учитывает таймзону (+6)", () => {
  // 23:00 UTC = 05:00 следующего дня в Бишкеке
  assert.equal(
    getBishkekDateString(new Date("2026-06-24T23:00:00Z")),
    "2026-06-25",
  );
});
