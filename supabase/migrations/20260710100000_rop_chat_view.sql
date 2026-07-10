-- Доступ к чату для роли РОП

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
