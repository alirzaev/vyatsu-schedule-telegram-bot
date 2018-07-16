# VyatSU schedule Telegram bot

## Description

This app provides students that use Telegram a convenient way to view group schedules.

What can this bot do:

- Schedule for today

- URL link to full schedule

- Rings schedule

- VyatSU buildings addresses

- Convenient way to choose group

The link for starting converstion with bot can be found on [vyatsuschedule.ru](https://vyatsuschedule.ru)

## Running app

### Telegram bot commands

- `/start` - Show help

- `/help` - Show help too

- `/schedule` - Show schedule for today

- `/link` - Show URL link to full schedule

- `/group` - Perform group choosing

- `/where` - Perform building choosing for viewing address

### Required environment variables

`MONGODB_URI` - defines the URI for MongoDB cluster.

`PORT` - port on which listen requests.

`TG_BOT_TOKEN` - token for Telegram bot.

`URL` - URL to which Telegram will send requests.

`BASE_API` - URL of VyatSU schedule API server.

### Server

`npm start`

