-- Доступ к чату: director / deputy_director / rop + явное право chat.view
-- Исправляет отправку сообщений при рассинхроне role_permissions.

CREATE OR REPLACE FUNCTION public.user_can_chat(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_any_role(
      _user_id,
      ARRAY['director', 'deputy_director', 'rop']::public.app_role[]
    )
    OR public.user_has_permission(_user_id, 'chat.view');
$$;

GRANT EXECUTE ON FUNCTION public.user_can_chat(uuid) TO authenticated;

-- VK: пользователи с доступом к чату могут читать любое подключение (общий аккаунт компании)
DROP POLICY IF EXISTS "vk_connections_select_own" ON public.vk_connections;
CREATE POLICY "vk_connections_select_chat" ON public.vk_connections
  FOR SELECT TO authenticated
  USING (public.user_can_chat(auth.uid()));

DROP POLICY IF EXISTS "vk_connections_write_own" ON public.vk_connections;
CREATE POLICY "vk_connections_write_own" ON public.vk_connections
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND public.user_can_chat(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_can_chat(auth.uid())
  );

-- VK диалоги и сообщения
DROP POLICY IF EXISTS "vk_conversations_select" ON public.vk_conversations;
CREATE POLICY "vk_conversations_select" ON public.vk_conversations
  FOR SELECT TO authenticated
  USING (public.user_can_chat(auth.uid()));

DROP POLICY IF EXISTS "vk_conversations_write" ON public.vk_conversations;
CREATE POLICY "vk_conversations_write" ON public.vk_conversations
  FOR ALL TO authenticated
  USING (public.user_can_chat(auth.uid()))
  WITH CHECK (public.user_can_chat(auth.uid()));

DROP POLICY IF EXISTS "vk_messages_select" ON public.vk_messages;
CREATE POLICY "vk_messages_select" ON public.vk_messages
  FOR SELECT TO authenticated
  USING (public.user_can_chat(auth.uid()));

DROP POLICY IF EXISTS "vk_messages_write" ON public.vk_messages;
CREATE POLICY "vk_messages_write" ON public.vk_messages
  FOR ALL TO authenticated
  USING (public.user_can_chat(auth.uid()))
  WITH CHECK (public.user_can_chat(auth.uid()));

-- Avito диалоги и сообщения
DROP POLICY IF EXISTS "avito_conversations_select" ON public.avito_conversations;
CREATE POLICY "avito_conversations_select" ON public.avito_conversations
  FOR SELECT TO authenticated
  USING (public.user_can_chat(auth.uid()));

DROP POLICY IF EXISTS "avito_conversations_write" ON public.avito_conversations;
CREATE POLICY "avito_conversations_write" ON public.avito_conversations
  FOR ALL TO authenticated
  USING (public.user_can_chat(auth.uid()))
  WITH CHECK (public.user_can_chat(auth.uid()));

DROP POLICY IF EXISTS "avito_messages_select" ON public.avito_messages;
CREATE POLICY "avito_messages_select" ON public.avito_messages
  FOR SELECT TO authenticated
  USING (public.user_can_chat(auth.uid()));

DROP POLICY IF EXISTS "avito_messages_write" ON public.avito_messages;
CREATE POLICY "avito_messages_write" ON public.avito_messages
  FOR ALL TO authenticated
  USING (public.user_can_chat(auth.uid()))
  WITH CHECK (public.user_can_chat(auth.uid()));

-- Storage для вложений Авито
DROP POLICY IF EXISTS "avito_chat_storage_insert" ON storage.objects;
CREATE POLICY "avito_chat_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avito-chat'
    AND public.user_can_chat(auth.uid())
  );

DROP POLICY IF EXISTS "avito_chat_storage_delete" ON storage.objects;
CREATE POLICY "avito_chat_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avito-chat'
    AND public.user_can_chat(auth.uid())
  );
