# VyatSU schedule Telegram bot

This application provides students that use Telegram a convenient way to view group schedules.

What can this bot do:

- Schedule for today.

- URL link to full schedule.

- Rings schedule.

- VyatSU buildings addresses.

- Convenient way to choose group.

The link for starting conversation with bot can be found here: [vyatsuschedule.github.io](https://vyatsuschedule.github.io)

Designed for [Vyatka State University](https://www.vyatsu.ru)

## Running app

### Telegram bot commands

- `/start` - Show help.

- `/help` - Show help too.

- `/schedule` - Show schedule for today.

- `/link` - Show URL link to full schedule.

- `/group` - Perform group choosing.

- `/where` - Perform building choosing for viewing address.

### Required environment variables

`MONGODB_URI=<uri>` - URI to MongoDB database of format `mongodb://<user>:<password>@<host>:<port>/<database>`. You have to specify the database name.

`PORT` - port on which listen requests.

`TOKEN` - token for Telegram bot.

`WEBHOOK_URL` - Webhook for Telegram bot.

`API_URL` - URL to VyatSU schedule API server.

`WEBAPP_URL` - URL to VyatSU schedule web application.

### Server

`npm start`

