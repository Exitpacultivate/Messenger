// Переводы интерфейса. Ключи — короткие строки, fallback — русский.
export const LANGS = [
  { id: "ru", name: "Русский" },
  { id: "en", name: "English" },
  { id: "uk", name: "Українська" },
  { id: "es", name: "Español" },
  { id: "de", name: "Deutsch" },
];

const DICT = {
  en: {
    "Сообщение": "Message", "Войти": "Sign in", "Выйти": "Log out",
    "Настройки": "Settings", "Профиль": "Profile", "Тема приложения": "App theme",
    "Светлая": "Light", "Тёмная": "Dark", "Контакты": "Contacts", "Звонки": "Calls",
    "Избранное": "Saved", "Новая группа": "New group", "Новый канал": "New channel",
    "Статистика": "Statistics", "Конструктор": "Builder", "Маркет тем": "Themes market",
    "Обратная связь": "Feedback", "Ночной режим": "Night mode", "Закрыть": "Close",
    "Отмена": "Cancel", "Сохранить": "Save", "Готово": "Done", "Поиск": "Search",
    "Участники": "Members", "Без звука": "Mute", "Все сообщения": "All messages",
    "Только упоминания": "Mentions only", "Аккаунт": "Account", "Язык": "Language",
    "Приватность": "Privacy", "Скрывать мой онлайн": "Hide my online status",
    "Скрытое прочтение": "Hide read receipts", "Автоответчик": "Auto-reply",
    "Невидимка": "Invisible mode", "Вложения": "Attachments", "Стикеры": "Stickers",
  },
  uk: {
    "Сообщение": "Повідомлення", "Войти": "Увійти", "Выйти": "Вийти",
    "Настройки": "Налаштування", "Профиль": "Профіль", "Контакты": "Контакти",
    "Звонки": "Дзвінки", "Избранное": "Збережене", "Закрыть": "Закрити",
    "Отмена": "Скасувати", "Сохранить": "Зберегти", "Поиск": "Пошук", "Язык": "Мова",
    "Приватность": "Приватність", "Автоответчик": "Автовідповідач", "Стикеры": "Стікери",
    "Вложения": "Вкладення", "Невидимка": "Режим невидимки",
  },
  es: {
    "Сообщение": "Mensaje", "Войти": "Entrar", "Выйти": "Salir",
    "Настройки": "Ajustes", "Профиль": "Perfil", "Контакты": "Contactos",
    "Звонки": "Llamadas", "Избранное": "Guardado", "Закрыть": "Cerrar",
    "Отмена": "Cancelar", "Сохранить": "Guardar", "Поиск": "Buscar", "Язык": "Idioma",
    "Приватность": "Privacidad", "Автоответчик": "Respuesta automática",
    "Стикеры": "Stickers", "Вложения": "Adjuntos", "Невидимка": "Modo invisible",
  },
  de: {
    "Сообщение": "Nachricht", "Войти": "Anmelden", "Выйти": "Abmelden",
    "Настройки": "Einstellungen", "Профиль": "Profil", "Контакты": "Kontakte",
    "Звонки": "Anrufe", "Избранное": "Gespeichert", "Закрыть": "Schließen",
    "Отмена": "Abbrechen", "Сохранить": "Speichern", "Поиск": "Suche", "Язык": "Sprache",
    "Приватность": "Datenschutz", "Автоответчик": "Automatische Antwort",
    "Стикеры": "Sticker", "Вложения": "Anhänge", "Невидимка": "Unsichtbar",
  },
};

export function makeT(lang) {
  const d = DICT[lang] || null;
  return (s) => (d && d[s]) || s;
}
