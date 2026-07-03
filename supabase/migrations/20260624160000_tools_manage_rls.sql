-- Синхронизация RLS инструмента с матрицей прав (tools.manage / tools.view)

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

CREATE OR REPLACE FUNCTION public.is_permission_locked(_role public.app_role, _key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _role = 'foreman' AND _key IN ('objects.view_scoped', 'tasks.view_own', 'tools.view_assigned') THEN true
    WHEN _role = 'director' AND _key IN ('users.manage_roles', 'settings.access') THEN true
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

CREATE OR REPLACE FUNCTION public.can_manage_tool_row(_user_id uuid, _assignee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_permission(_user_id, 'tools.manage')
    AND (
      public.user_has_permission(_user_id, 'tools.view')
      OR _assignee_id = _user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.role_permission_default(public.app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_permission_locked(public.app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_tool_row(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "tools_insert" ON public.tools;
CREATE POLICY "tools_insert" ON public.tools
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_permission(auth.uid(), 'tools.manage'));

DROP POLICY IF EXISTS "tools_update" ON public.tools;
CREATE POLICY "tools_update" ON public.tools
  FOR UPDATE TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'tools.manage')
    OR assignee_id = auth.uid()
  );

DROP POLICY IF EXISTS "tools_delete" ON public.tools;
CREATE POLICY "tools_delete" ON public.tools
  FOR DELETE TO authenticated
  USING (public.can_manage_tool_row(auth.uid(), assignee_id));

DROP POLICY IF EXISTS "tool_movements_insert" ON public.tool_movements;
CREATE POLICY "tool_movements_insert" ON public.tool_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_permission(auth.uid(), 'tools.manage'));
