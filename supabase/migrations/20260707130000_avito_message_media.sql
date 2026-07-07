-- Avito messages: media fields for images and links

ALTER TABLE public.avito_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS link_title text;
