-- Stable message ordering within the same second

ALTER TABLE public.avito_messages
  ADD COLUMN IF NOT EXISTS message_seq integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS avito_messages_chat_order_idx
  ON public.avito_messages (chat_id, avito_created ASC, message_seq ASC);
