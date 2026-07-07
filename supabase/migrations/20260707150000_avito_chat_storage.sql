-- Public storage for Avito chat file links (audio, video, documents)

INSERT INTO storage.buckets (id, name, public)
VALUES ('avito-chat', 'avito-chat', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE POLICY "avito_chat_storage_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avito-chat');

CREATE POLICY "avito_chat_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avito-chat'
    AND public.user_has_permission(auth.uid(), 'chat.view')
  );

CREATE POLICY "avito_chat_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avito-chat'
    AND public.user_has_permission(auth.uid(), 'chat.view')
  );
