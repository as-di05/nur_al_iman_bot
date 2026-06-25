// Простой структурированный логгер с уровнями и таймстампами.
// Без внешних зависимостей — легковесный и предсказуемый.
// Уровень настраивается через переменную окружения LOG_LEVEL (error|warn|info|debug).

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel =
  LEVELS[(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info;

function emit(level, args) {
  if (LEVELS[level] > currentLevel) return;

  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const sink =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  sink(prefix, ...args);
}

export const logger = {
  error: (...args) => emit("error", args),
  warn: (...args) => emit("warn", args),
  info: (...args) => emit("info", args),
  debug: (...args) => emit("debug", args),
};
