-- VK Chat: хранение диалогов и сообщений, подключение аккаунта

CREATE TABLE public.vk_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  vk_user_id bigint NOT NULL,
  access_token text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vk_conversations (
  peer_id bigint PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  photo_url text,
  last_message_text text,
  last_message_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vk_messages (
  vk_message_id bigint NOT NULL,
  peer_id bigint NOT NULL,
  from_id bigint NOT NULL,
  text text NOT NULL DEFAULT '',
  is_outgoing boolean NOT NULL DEFAULT false,
  vk_date bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (peer_id, vk_message_id)
);

CREATE INDEX vk_messages_peer_date_idx ON public.vk_messages (peer_id, vk_date DESC);

ALTER TABLE public.vk_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vk_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vk_messages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.vk_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vk_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vk_messages TO authenticated;
GRANT ALL ON public.vk_conversations TO service_role;
GRANT ALL ON public.vk_messages TO service_role;

CREATE TRIGGER trg_vk_connections_updated
  BEFORE UPDATE ON public.vk_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Права chat.view: директор и заместитель по умолчанию
CREATE OR REPLACE FUNCTION public.role_permission_default(_role public.app_role, _key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _role = 'director' THEN true
    WHEN _role = 'deputy_director' THEN _key NOT IN ('users.manage_roles', 'settings.access')
    WHEN _role = 'rop' THEN _key IN (
      'objects.view_all', 'objects.create', 'objects.edit',
      'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.review',
      'photos.view', 'photos.create', 'photos.edit', 'photos.review',
      'tools.view', 'tools.manage',
      'documents.view', 'documents.manage',
      'customers.view', 'customers.manage',
      'brigades.view', 'brigades.manage',
      'settings.view', 'settings.catalogs'
    )
    WHEN _role = 'foreman' THEN _key IN (
      'objects.view_scoped', 'tasks.view_own', 'tasks.edit', 'tasks.submit_review',
      'photos.view', 'photos.create', 'photos.edit',
      'tools.view_assigned', 'brigades.view'
    )
    WHEN _role = 'tools_keeper' THEN _key IN (
      'objects.view_scoped', 'tools.view', 'tools.manage',
      'customers.view', 'brigades.view', 'settings.view'
    )
    ELSE false
  END;
$$;

CREATE POLICY "vk_conversations_select" ON public.vk_conversations
  FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'chat.view'));

CREATE POLICY "vk_conversations_write" ON public.vk_conversations
  FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'chat.view'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'chat.view'));

CREATE POLICY "vk_messages_select" ON public.vk_messages
  FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'chat.view'));

CREATE POLICY "vk_messages_write" ON public.vk_messages
  FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'chat.view'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'chat.view'));
