-- Ссылка на объявление / диалог Авито для кликабельных заголовков чата

ALTER TABLE public.avito_conversations
  ADD COLUMN IF NOT EXISTS source_url text;
