import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrayerTimes } from "../src/utils/prayerParser.js";

const expected = {
  fajr: "05:00",
  dhuhr: "12:30",
  asr: "15:45",
  maghrib: "18:00",
  isha: "19:30",
};

const sample = {
  prayertimes: [{ ...expected, sunrise: "06:30" }],
};

test("парсит ответ-объект", () => {
  assert.deepEqual(parsePrayerTimes(sample), expected);
});

test("парсит ответ-массив", () => {
  assert.deepEqual(parsePrayerTimes([sample]), expected);
});

test("игнорирует лишние поля (sunrise)", () => {
  const result = parsePrayerTimes(sample);
  assert.equal(result.sunrise, undefined);
});

test("бросает ошибку при пустом/некорректном ответе", () => {
  assert.throws(() => parsePrayerTimes(null));
  assert.throws(() => parsePrayerTimes({}));
  assert.throws(() => parsePrayerTimes({ prayertimes: [] }));
});

test("бросает ошибку при отсутствии намаза", () => {
  assert.throws(() =>
    parsePrayerTimes({ prayertimes: [{ fajr: "05:00", dhuhr: "12:30" }] }),
  );
});
