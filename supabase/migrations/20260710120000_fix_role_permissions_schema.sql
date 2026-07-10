-- Исправление legacy-схемы role_permissions (role_id/permission_id → role/permission_key/enabled)
-- и восстановление user_has_permission для чата и остальных модулей.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'role_permissions'
      AND column_name = 'role_id'
  ) THEN
    DROP TABLE public.role_permissions CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission_key)
);

ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_role_permissions_updated ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_updated
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
CREATE POLICY "role_permissions_select" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "role_permissions_insert" ON public.role_permissions;
CREATE POLICY "role_permissions_insert" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'director'));

DROP POLICY IF EXISTS "role_permissions_update" ON public.role_permissions;
CREATE POLICY "role_permissions_update" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'director'))
  WITH CHECK (public.has_role(auth.uid(), 'director'));

DROP POLICY IF EXISTS "role_permissions_delete" ON public.role_permissions;
CREATE POLICY "role_permissions_delete" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'director'));

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
      'settings.view', 'settings.catalogs',
      'chat.view'
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

CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        CASE
          WHEN public.is_permission_locked(ur.role, _key) THEN
            public.role_permission_default(ur.role, _key)
          ELSE COALESCE(
            (
              SELECT rp.enabled
              FROM public.role_permissions rp
              WHERE rp.role = ur.role AND rp.permission_key = _key
            ),
            public.role_permission_default(ur.role, _key)
          )
        END
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.role_permission_default(public.app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
