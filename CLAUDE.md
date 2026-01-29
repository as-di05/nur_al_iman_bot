# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram bot for prayer time notifications (namaz/salah) and daily hadith delivery in Kyrgyzstan. The bot:
- Fetches prayer times from muftiyat.kg API
- Sends scheduled notifications to users via Telegram
- Supports multiple cities with user-specific locations
- **NEW:** Sends daily hadiths from curated collections (Sahih Bukhari, etc.)
- Uses MongoDB for user data persistence
- Implements cron-based scheduling for daily notifications and hadith delivery

## Development Commands

### Initial Setup
```bash
npm install
```

Configure `.env` file with:
- `BOT_TOKEN` - Telegram bot token from @BotFather
- `MONGODB_URI` - MongoDB connection string (optional, defaults to local)
- `PORT` - Web server port (optional, defaults to 3000)

### Running the Bot

**Development mode** (with auto-restart):
```bash
npm run dev
```
Nodemon watches `src/` and `index.js` for changes.

**Production mode** (background process):
```bash
./run.sh start     # Start bot in background
./run.sh stop      # Stop bot
./run.sh restart   # Restart bot
./run.sh status    # Check if bot is running
./run.sh logs      # View logs in real-time
```

**Simple run** (foreground):
```bash
npm start
```

## Architecture

### Entry Point Flow
`index.js` → `src/bot.js` → initializes Telegraf, connects to MongoDB, schedules notifications

### Core Services Layer

**schedulerService.js** - The heart of the notification system:
- Groups users by `locationCode` to minimize API calls (optimization)
- Fetches prayer times once per city, not per user
- Creates cron jobs for each prayer time
- Re-schedules all notifications daily at 00:30

**prayerService.js** - API integration:
- Fetches prayer times from `https://muftiyat.kg/ru/api/v1/calendar/{locationCode}/`
- Returns times for 5 daily prayers: fajr, dhuhr, asr, maghrib, isha

**notificationService.js** - Telegram message formatting:
- `sendFajrNotification()` - sends at exact Fajr time
- `sendFajrJamaatInfo()` - sends Fajr jamaat info 10 minutes later
- `sendNamazReminder()` - sends for other prayers (15 minutes before by default)

**userService.js** - MongoDB operations:
- `getAllActiveUsers()` - fetches all users for scheduling
- `registerChat()` - saves user location preferences

### Configuration

**src/config/constants.js**:
- Prayer names in Russian
- Default notification timing (Fajr: 0 min before, others: 15 min before)

**src/config/locations.js**:
- Maps location codes to city names in Kyrgyzstan

**src/config/database.js**:
- MongoDB connection setup with Mongoose

### Data Model

**src/models/User.js**:
- `userId` - Telegram chat ID
- `locationCode` - City code for API
- `minutesBefore` - Custom notification timing
- `isActive` - Subscription status
- `hadithsEnabled` - Daily hadith subscription status
- `lastHadithSent` - Track hadith progress
- `hadithSendTime` - Time for daily hadith (default: 09:00)
- `selectedCollection` - Chosen hadith collection

**src/models/HadithCollection.js**:
- Collections like "Sahih Bukhari", "Sahih Muslim"
- Tracks total hadiths and active status

**src/models/Hadith.js**:
- `number` - Hadith number in collection
- `contentRu` - Russian text (required)
- `contentAr` - Arabic text (optional)
- `narrators` - Chain of narrators (optional)
- `scholarsExplanation` - Scholar commentary (optional)
- `order` - Sequential order for delivery

### Handlers

**src/handlers/commandHandlers.js**:
- `/start` - Registration and location selection
- `/location` - Change location
- `/fajr`, `/dhuhr`, `/asr`, `/maghrib`, `/isha` - Test notification messages
- Callback query handlers for inline keyboards

**src/handlers/hadithHandlers.js** (NEW):
- `/hadith_admin` - Admin panel (only @as_di05)
  - Create/edit/search hadith collections
  - Add/edit hadiths with step-by-step input
- `/hadith` - User subscription management
  - Enable/disable daily hadiths
  - Choose hadith collection

### Utilities

**src/utils/timeUtils.js**:
- Time conversion helpers for cron scheduling

## API Optimization Strategy

**Critical concept**: The bot groups users by location to minimize API requests.

Instead of making N API requests for N users, it:
1. Fetches all users from MongoDB
2. Groups them by `locationCode`
3. Makes ONE API request per unique city
4. Creates shared cron jobs per location

Example: 1000 users in 3 cities = 3 API requests (not 1000)

See `OPTIMIZATION_LOGIC.md` for detailed explanation with examples.

## Scheduling Logic

### Prayer Times
1. **On bot startup**: `scheduleAllUsersNotifications()` loads all users and creates cron jobs
2. **Daily at 00:30**: Automatic re-scheduling with fresh prayer times
3. **Fajr timing**: Notification at exact prayer time + jamaat info 10 min later
4. **Other prayers**: Notification 15 minutes before (configurable per user)

### Hadith Delivery (NEW)
1. **On bot startup**: `scheduleHadithSending()` initializes cron job
2. **Daily at 09:00**: Sends next hadith to all subscribed users
3. **Sequential delivery**: Each user gets hadiths in order from their selected collection
4. **Circular rotation**: After last hadith, restarts from first
5. **Individual progress**: Each user tracks their own position via `lastHadithSent`

## Testing Prayer Notifications

Use test commands to preview notification messages:
- `/fajr` - See Fajr notification format
- `/dhuhr` - See Dhuhr notification format
- `/asr` - See Asr notification format
- `/maghrib` - See Maghrib notification format
- `/isha` - See Isha notification format

These commands send the actual notification message that would be sent at prayer times.

## Important Notes

- The bot uses ES modules (`"type": "module"` in package.json)
- All imports must use `.js` extensions
- Cron jobs are timezone-aware (Asia/Bishkek timezone)
- MongoDB connection is required for multi-user support
- The Express server runs for health checks on the configured PORT

## Hadith Management (NEW)

### Admin Access
Only user with username `as_di05` can manage hadiths via `/hadith_admin`. This is enforced by `isMainAdmin` middleware in `src/middleware/adminCheck.js`.

### Adding Hadiths - Two-Step Process
1. **Minimum required**: Number + Russian content
2. **Later additions**: Arabic text, narrators, scholar explanations via edit function

### User Workflow
Users run `/hadith` to:
- Subscribe to daily hadiths
- Choose from available collections
- Receive hadiths at 09:00 daily

See `HADITH_FEATURE.md` for detailed documentation.
