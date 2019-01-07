# Telegram-бот для VyatSU schedule

Telegram-бот для просмотра расписания занятий студентов [Вятского государственного университета](https://www.vyatsu.ru).

Что может этот бот:

- Показать расписание на сегодняшний день.

- Выдать ссылку на полное расписание.

- Показать расписание звонков.

- Выбрать в 4 клика нужную группу.

- Показать адреса учебных корпусов.

## Для пользователей

Тык: [vyatsuschedule.github.io](https://vyatsuschedule.github.io/#/bots)

## Для разработчиков

Параметры приложения задаются через переменные окружения.

### Список команд, на которые отвечает бот

  - `/start`, `/help` - показать справку.

  - `/schedule` - показать расписание на сегодняшний день.

  - `/link` - выдать ссылку на полное расписание.

  - `/group` - запустить процедуру выбора группы.

  - `/where` - выдать пользователю список учебных корпусов для просмотра их адресов.

### Необходимые переменные окружения

`MONGODB_URI` - URI базы данных MongoDB в формате `mongodb://<user>:<password>@<host>:<port>/<database>`. 
Поле `<database>` обязательно.

`PORT` - порт, который приложение будет слушать, по умолчанию `80`.

`TOKEN` - токен для Telegram-бота.

`WEBHOOK_URL` - webhook для Telegram-бота.

`API_URL` - URL [backend-сервера](https://gitlab.com/vyatsu-schedule/backend).

`WEBAPP_URL` - URL [веб-приложения](https://gitlab.com/vyatsu-schedule/frontend).

### Запуск

```
npm start
```

### Docker

1. Собираем образ

   ```
   docker build -t imagename .
   ```

2. Запускаем
   
   ```
   docker run --name somename -d -p 8080:80 \
     -e MONGODB_URI=<URI> \
     -e TOKEN=<TOKEN> \
     -e WEBHOOK_URL=<WEBHOOK_URL> \
     -e API_URL=<API_URL> \
     -e WEBAPP_URL=<WEBAPP_URL> \
     imagename
   ```
