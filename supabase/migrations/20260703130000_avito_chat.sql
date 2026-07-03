-- Avito Chat: диалоги и сообщения из мессенджера Авито

CREATE TABLE public.avito_conversations (
  chat_id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  photo_url text,
  item_title text,
  last_message_text text,
  last_message_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.avito_messages (
  chat_id text NOT NULL,
  message_id text NOT NULL,
  author_id bigint,
  text text NOT NULL DEFAULT '',
  is_outgoing boolean NOT NULL DEFAULT false,
  avito_created bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, message_id)
);

CREATE INDEX avito_messages_chat_date_idx ON public.avito_messages (chat_id, avito_created DESC);

ALTER TABLE public.avito_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avito_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avito_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avito_messages TO authenticated;
GRANT ALL ON public.avito_conversations TO service_role;
GRANT ALL ON public.avito_messages TO service_role;

CREATE POLICY "avito_conversations_select" ON public.avito_conversations
  FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'chat.view'));

CREATE POLICY "avito_conversations_write" ON public.avito_conversations
  FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'chat.view'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'chat.view'));

CREATE POLICY "avito_messages_select" ON public.avito_messages
  FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'chat.view'));

CREATE POLICY "avito_messages_write" ON public.avito_messages
  FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'chat.view'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'chat.view'));
