-- RLS для vk_connections: доступ только к своей записи (без service_role на сервере)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vk_connections TO authenticated;

CREATE POLICY "vk_connections_select_own" ON public.vk_connections
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND public.user_has_permission(auth.uid(), 'chat.view')
  );

CREATE POLICY "vk_connections_write_own" ON public.vk_connections
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND public.user_has_permission(auth.uid(), 'chat.view')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_has_permission(auth.uid(), 'chat.view')
  );
