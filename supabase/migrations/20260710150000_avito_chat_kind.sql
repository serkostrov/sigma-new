-- Тип диалога Авито: u2i (по объявлению) | u2u (личные сообщения)

ALTER TABLE public.avito_conversations
  ADD COLUMN IF NOT EXISTS chat_kind text NOT NULL DEFAULT 'u2i';

CREATE INDEX IF NOT EXISTS avito_conversations_kind_idx
  ON public.avito_conversations (chat_kind);
