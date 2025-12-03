# Система проверки прав администратора

## Описание

В группах и каналах только **владелец (owner)** может использовать команды и кнопки бота. В личных чатах все команды работают без ограничений.

## Как работает

Используется **глобальный middleware** `onlyOwnerInGroups`, который автоматически проверяет все команды и callback-кнопки.

### Что блокируется:
- Все команды (начинающиеся с `/`)
- Все callback queries (нажатия на кнопки)

### Что НЕ блокируется:
- Обычные текстовые сообщения
- События добавления бота в группу
- Автоматические уведомления о намазе

## Реализация

### Код в `src/bot.js`:

```javascript
import { onlyOwnerInGroups } from "./middleware/adminCheck.js";

const bot = new Telegraf(BOT_TOKEN);

// Глобальный middleware - применяется ко ВСЕМ обработчикам
bot.use(onlyOwnerInGroups);

// Команды регистрируются как обычно, без дополнительных проверок
bot.start((ctx) => handleStart(ctx, setChatId));
bot.command("location", handleLocation);
```

### Middleware в `src/middleware/adminCheck.js`:

```javascript
export async function onlyOwnerInGroups(ctx, next) {
  const chatType = ctx.chat?.type;

  // В личных чатах - разрешаем все
  if (chatType === "private") return next();

  // Проверяем только команды и callback queries
  const isCommand = ctx.message?.text?.startsWith('/');
  const isCallback = !!ctx.callbackQuery;

  if (!isCommand && !isCallback) {
    return next(); // Обычные сообщения пропускаем
  }

  // Проверяем статус пользователя
  const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (chatMember.status === "creator") {
    return next(); // Владелец - разрешаем
  }

  // Не владелец - блокируем
  if (isCallback) {
    await ctx.answerCbQuery("⚠️ Доступно только владельцу группы", { show_alert: true });
  }
}
```

## Поведение при отказе

**Для команд**: Команда игнорируется (бот молча не реагирует)

**Для кнопок**: Появляется всплывающее уведомление:
```
⚠️ Доступно только владельцу группы
```

## Изменение на проверку всех администраторов

Если нужно разрешить команды **всем администраторам** (не только владельцу):

В `src/middleware/adminCheck.js` измените строку:
```javascript
// Было:
if (chatMember.status === "creator") {

// Станет:
if (["creator", "administrator"].includes(chatMember.status)) {
```

## Преимущества глобального подхода

✅ Один раз написал - работает для всех команд
✅ Не нужно помнить добавлять проверку к каждой новой команде
✅ Легко изменить логику в одном месте
✅ Чистый код без дублирования

## Тестирование

1. Добавьте бота в тестовую группу
2. Попробуйте вызвать `/start` от обычного участника → команда игнорируется
3. Вызовите `/start` от владельца → работает нормально
4. Нажмите на кнопку от обычного участника → появится предупреждение
5. Нажмите на кнопку от владельца → работает нормально
