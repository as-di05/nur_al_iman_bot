#!/bin/bash

# Скрипт для управления ботом

case "$1" in
  start)
    echo "🚀 Запуск бота..."
    pkill -9 -f "node index.js" 2>/dev/null
    sleep 1
    nohup node index.js > bot.log 2>&1 &
    echo "✅ Бот запущен! PID: $!"
    echo "📋 Логи: tail -f bot.log"
    ;;
  stop)
    echo "🛑 Остановка бота..."
    pkill -9 -f "node index.js"
    echo "✅ Бот остановлен"
    ;;
  restart)
    echo "🔄 Перезапуск бота..."
    pkill -9 -f "node index.js" 2>/dev/null
    sleep 1
    nohup node index.js > bot.log 2>&1 &
    echo "✅ Бот перезапущен! PID: $!"
    ;;
  status)
    if pgrep -f "node index.js" > /dev/null; then
      echo "✅ Бот работает"
      echo "PID: $(pgrep -f 'node index.js')"
    else
      echo "❌ Бот не запущен"
    fi
    ;;
  logs)
    tail -f bot.log
    ;;
  *)
    echo "Использование: ./run.sh {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
