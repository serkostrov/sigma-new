-- =============================================================================
-- SK Sigma — consolidated initial schema
-- Merged from 18 incremental migrations (May–Jun 2026)
-- =============================================================================

-- =============================================================================
-- 1. Auth & roles
-- =============================================================================

CREATE TYPE public.app_role AS ENUM (
  'director',
  'rop',
  'deputy_director',
  'foreman',
  'tools_keeper'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by all authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "Roles are viewable by all authenticated"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Directors can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'director'));

CREATE POLICY "Directors can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'director'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  SELECT count(*) = 0 FROM public.user_roles INTO is_first;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    CASE WHEN is_first THEN 'director'::public.app_role ELSE 'foreman'::public.app_role END
  );

  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2. Shared utilities
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- 3. Customers & brigades
-- =============================================================================

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.brigades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.brigade_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brigade_id uuid NOT NULL REFERENCES public.brigades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brigade_id, user_id)
);

-- =============================================================================
-- 4. Site objects
-- =============================================================================

CREATE TABLE public.site_objects (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  customer text NOT NULL DEFAULT '',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  responsible text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Заявка',
  foreman text NOT NULL DEFAULT '',
  foreman_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  brigade text NOT NULL DEFAULT '—',
  brigade_id uuid REFERENCES public.brigades(id) ON DELETE SET NULL,
  deadline text NOT NULL DEFAULT '—',
  progress integer NOT NULL DEFAULT 0,
  budget bigint NOT NULL DEFAULT 0,
  health text NOT NULL DEFAULT 'ok',
  risk boolean NOT NULL DEFAULT false,
  current_stage text NOT NULL DEFAULT 'Черновая отделка',
  stages_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_objects_foreman_id ON public.site_objects(foreman_id);
CREATE INDEX idx_site_objects_brigade_id ON public.site_objects(brigade_id);

CREATE TRIGGER set_site_objects_updated_at
  BEFORE UPDATE ON public.site_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 5. Catalogs: stages, statuses, health
-- =============================================================================

CREATE TABLE public.stage_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_days integer NOT NULL DEFAULT 7,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.object_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.object_health_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.object_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id text NOT NULL,
  name text NOT NULL,
  duration_days integer NOT NULL DEFAULT 7,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Не начат',
  assignee_id uuid,
  notes text NOT NULL DEFAULT '',
  started_at date,
  finished_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_object_stages_object ON public.object_stages(object_id);

INSERT INTO public.stage_templates (name, duration_days, sort_order) VALUES
  ('Черновая отделка', 30, 1),
  ('Инженерия', 21, 2),
  ('Предчистовая отделка', 21, 3),
  ('Чистовая отделка', 30, 4),
  ('Дополнительные работы', 14, 5);

INSERT INTO public.object_statuses (name, sort_order) VALUES
  ('Заявка', 1),
  ('Замер', 2),
  ('Смета', 3),
  ('Согласование', 4),
  ('В работе', 5),
  ('Пауза', 6),
  ('Завершен', 7);

INSERT INTO public.object_health_states (key, label, sort_order) VALUES
  ('ok', 'Все в порядке', 1),
  ('questions', 'Есть вопросы', 2),
  ('risk', 'Риск просрочки', 3);

-- =============================================================================
-- 6. Tasks
-- =============================================================================

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  deadline date,
  status text NOT NULL DEFAULT 'Назначена',
  priority text NOT NULL DEFAULT 'Несрочная',
  created_by uuid,
  assignee_id uuid,
  object_id text,
  stage_id uuid,
  review_comment text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_object_idx ON public.tasks(object_id);
CREATE INDEX tasks_stage_idx ON public.tasks(stage_id);
CREATE INDEX tasks_assignee_idx ON public.tasks(assignee_id);

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  text text NOT NULL,
  edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX task_comments_task_idx ON public.task_comments(task_id);

CREATE TABLE public.task_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#64748b',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#64748b',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.task_statuses (name, color, sort_order) VALUES
  ('Назначена', '#64748b', 1),
  ('В работе', '#3b82f6', 2),
  ('Ожидание', '#f59e0b', 3),
  ('Выполнена', '#10b981', 4),
  ('На проверке', '#8b5cf6', 5),
  ('Возвращена', '#ef4444', 6);

INSERT INTO public.task_priorities (name, color, sort_order) VALUES
  ('Несрочная', '#64748b', 1),
  ('Срочная', '#f59e0b', 2),
  ('Важная', '#ef4444', 3);

-- =============================================================================
-- 7. Tools
-- =============================================================================

CREATE TABLE public.tool_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tool_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tool_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  inv_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Свободен',
  condition text NOT NULL DEFAULT 'Рабочее',
  object_id text,
  assignee_id uuid,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tool_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  from_object_id text,
  to_object_id text,
  from_assignee_id uuid,
  to_assignee_id uuid,
  from_status text,
  to_status text,
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_movements_tool ON public.tool_movements(tool_id, created_at DESC);

INSERT INTO public.tool_statuses (name, color, sort_order) VALUES
  ('Свободен', '#10b981', 1),
  ('На объекте', '#3b82f6', 2),
  ('В ремонте', '#f59e0b', 3),
  ('Потерян', '#ef4444', 4),
  ('Списан', '#64748b', 5);

INSERT INTO public.tool_conditions (name, color, sort_order) VALUES
  ('Рабочее', '#10b981', 1),
  ('Требует проверки', '#f59e0b', 2),
  ('Неисправно', '#ef4444', 3);

CREATE OR REPLACE FUNCTION public.log_tool_movement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.object_id IS NOT NULL OR NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.tool_movements(tool_id, to_object_id, to_assignee_id, to_status, note)
      VALUES (NEW.id, NEW.object_id, NEW.assignee_id, NEW.status, 'Создан');
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.object_id IS DISTINCT FROM OLD.object_id)
     OR (NEW.assignee_id IS DISTINCT FROM OLD.assignee_id)
     OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.tool_movements(
      tool_id,
      from_object_id, to_object_id,
      from_assignee_id, to_assignee_id,
      from_status, to_status
    ) VALUES (
      NEW.id,
      OLD.object_id, NEW.object_id,
      OLD.assignee_id, NEW.assignee_id,
      OLD.status, NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_tool_movement
  AFTER INSERT OR UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.log_tool_movement();

-- =============================================================================
-- 8. Photo reports
-- =============================================================================

CREATE TABLE public.photo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id text NOT NULL,
  task_id uuid,
  stage_id uuid,
  author_id uuid,
  author_name text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  review_status text NOT NULL DEFAULT 'Не проверен',
  review_comment text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photo_reports_task_id_idx ON public.photo_reports(task_id);
CREATE INDEX photo_reports_object_id_idx ON public.photo_reports(object_id);
CREATE INDEX photo_reports_stage_id_idx ON public.photo_reports(stage_id);

CREATE TRIGGER update_photo_reports_updated_at
  BEFORE UPDATE ON public.photo_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 9. Documents
-- =============================================================================

CREATE TABLE public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id text NOT NULL,
  parent_id uuid REFERENCES public.document_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_folders_object ON public.document_folders(object_id);
CREATE INDEX idx_document_folders_parent ON public.document_folders(parent_id);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id text NOT NULL,
  folder_id uuid REFERENCES public.document_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  doc_type text NOT NULL DEFAULT 'Прочее',
  uploaded_by uuid,
  uploaded_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_object ON public.documents(object_id);
CREATE INDEX idx_documents_folder ON public.documents(folder_id);
CREATE INDEX idx_documents_type ON public.documents(doc_type);

INSERT INTO public.document_types (name, sort_order) VALUES
  ('Договор', 10),
  ('Смета', 20),
  ('Акт', 30),
  ('Чертёж', 40),
  ('Счёт/накладная', 50),
  ('Прочее', 100);

-- =============================================================================
-- 10. Expenses
-- =============================================================================

CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  spent_on date NOT NULL DEFAULT current_date,
  object_id text NOT NULL REFERENCES public.site_objects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.object_stages(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  comment text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expenses_object_id_idx ON public.expenses(object_id);
CREATE INDEX expenses_spent_on_idx ON public.expenses(spent_on DESC);

CREATE TABLE public.expense_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expense_attachments_expense_id_idx ON public.expense_attachments(expense_id);

INSERT INTO public.expense_categories (name, sort_order)
VALUES ('Закупка материалов', 10);

-- =============================================================================
-- 11. Role permissions (UI-configurable; RLS remains base protection)
-- =============================================================================

CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission_key)
);

-- =============================================================================
-- 12. Access helper functions (security definer, no RLS recursion)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_elevated_object_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(
    _user_id,
    ARRAY['director', 'deputy_director', 'rop']::public.app_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.can_review_work(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_elevated_object_access(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_see_finances(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(
    _user_id,
    ARRAY['director', 'deputy_director']::public.app_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_objects(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(
    _user_id,
    ARRAY['director', 'deputy_director', 'rop']::public.app_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_object(_user_id uuid, _object_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _object_id IS NOT NULL
    AND (
      public.has_elevated_object_access(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.site_objects o
        WHERE o.id = _object_id
          AND (
            o.foreman_id = _user_id
            OR EXISTS (
              SELECT 1 FROM public.brigade_members bm
              WHERE bm.user_id = _user_id AND bm.brigade_id = o.brigade_id
            )
          )
      )
      OR (
        public.has_role(_user_id, 'tools_keeper')
        AND EXISTS (
          SELECT 1 FROM public.tools t
          WHERE t.object_id = _object_id
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = _task_id
      AND (
        public.has_elevated_object_access(_user_id)
        OR (
          NOT public.has_role(_user_id, 'tools_keeper')
          AND (
            t.object_id IS NULL
              AND (t.assignee_id = _user_id OR t.created_by = _user_id)
            OR (
              t.object_id IS NOT NULL
              AND public.can_access_object(_user_id, t.object_id)
              AND (
                public.has_elevated_object_access(_user_id)
                OR t.assignee_id = _user_id
                OR t.created_by = _user_id
              )
            )
          )
        )
      )
  );
$$;

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

GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_elevated_object_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_work(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_finances(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_objects(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_object(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_task(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.role_permission_default(public.app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_permission_locked(public.app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_tool_row(uuid, uuid) TO authenticated;

-- =============================================================================
-- 13. Grants & updated_at triggers for catalog tables
-- =============================================================================

-- customers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- brigades
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brigades TO authenticated;
GRANT ALL ON public.brigades TO service_role;
ALTER TABLE public.brigades ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER brigades_updated_at BEFORE UPDATE ON public.brigades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- brigade_members
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brigade_members TO authenticated;
GRANT ALL ON public.brigade_members TO service_role;
ALTER TABLE public.brigade_members ENABLE ROW LEVEL SECURITY;

-- site_objects
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_objects TO authenticated;
GRANT ALL ON public.site_objects TO service_role;
ALTER TABLE public.site_objects ENABLE ROW LEVEL SECURITY;

-- catalogs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_templates TO authenticated;
GRANT ALL ON public.stage_templates TO service_role;
ALTER TABLE public.stage_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_stage_templates_updated BEFORE UPDATE ON public.stage_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.object_statuses TO authenticated;
GRANT ALL ON public.object_statuses TO service_role;
ALTER TABLE public.object_statuses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_object_statuses_updated BEFORE UPDATE ON public.object_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.object_health_states TO authenticated;
GRANT ALL ON public.object_health_states TO service_role;
ALTER TABLE public.object_health_states ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_object_health_states_updated BEFORE UPDATE ON public.object_health_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.object_stages TO authenticated;
GRANT ALL ON public.object_stages TO service_role;
ALTER TABLE public.object_stages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_object_stages_updated BEFORE UPDATE ON public.object_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- tasks
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_statuses TO authenticated;
GRANT ALL ON public.task_statuses TO service_role;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_task_statuses_updated BEFORE UPDATE ON public.task_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_priorities TO authenticated;
GRANT ALL ON public.task_priorities TO service_role;
ALTER TABLE public.task_priorities ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_task_priorities_updated BEFORE UPDATE ON public.task_priorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- tools
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_categories TO authenticated;
GRANT ALL ON public.tool_categories TO service_role;
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tool_categories_updated BEFORE UPDATE ON public.tool_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_statuses TO authenticated;
GRANT ALL ON public.tool_statuses TO service_role;
ALTER TABLE public.tool_statuses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tool_statuses_updated BEFORE UPDATE ON public.tool_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_conditions TO authenticated;
GRANT ALL ON public.tool_conditions TO service_role;
ALTER TABLE public.tool_conditions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tool_conditions_updated BEFORE UPDATE ON public.tool_conditions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tools TO authenticated;
GRANT ALL ON public.tools TO service_role;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tools_updated BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_movements TO authenticated;
GRANT ALL ON public.tool_movements TO service_role;
ALTER TABLE public.tool_movements ENABLE ROW LEVEL SECURITY;

-- photo_reports
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_reports TO authenticated;
GRANT ALL ON public.photo_reports TO service_role;
ALTER TABLE public.photo_reports ENABLE ROW LEVEL SECURITY;

-- documents
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_types TO authenticated;
GRANT ALL ON public.document_types TO service_role;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_document_types_updated_at BEFORE UPDATE ON public.document_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_folders TO authenticated;
GRANT ALL ON public.document_folders TO service_role;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_document_folders_updated_at BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- expenses
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_attachments TO authenticated;
GRANT ALL ON public.expense_attachments TO service_role;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- role_permissions
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_role_permissions_updated BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 14. Row Level Security policies
-- =============================================================================

-- site_objects
CREATE POLICY "objects_select" ON public.site_objects
  FOR SELECT TO authenticated
  USING (public.can_access_object(auth.uid(), id));

CREATE POLICY "objects_insert" ON public.site_objects
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_objects(auth.uid()));

CREATE POLICY "objects_update" ON public.site_objects
  FOR UPDATE TO authenticated
  USING (public.can_manage_objects(auth.uid()))
  WITH CHECK (public.can_manage_objects(auth.uid()));

CREATE POLICY "objects_delete" ON public.site_objects
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['director', 'deputy_director']::public.app_role[]));

-- object_stages
CREATE POLICY "object_stages_select" ON public.object_stages
  FOR SELECT TO authenticated
  USING (public.can_access_object(auth.uid(), object_id));

CREATE POLICY "object_stages_insert" ON public.object_stages
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_objects(auth.uid()) AND public.can_access_object(auth.uid(), object_id));

CREATE POLICY "object_stages_update" ON public.object_stages
  FOR UPDATE TO authenticated
  USING (public.can_manage_objects(auth.uid()) AND public.can_access_object(auth.uid(), object_id));

CREATE POLICY "object_stages_delete" ON public.object_stages
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['director', 'deputy_director']::public.app_role[]));

-- tasks
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.has_elevated_object_access(auth.uid())
    OR (
      NOT public.has_role(auth.uid(), 'tools_keeper')
      AND (
        (object_id IS NULL AND (assignee_id = auth.uid() OR created_by = auth.uid()))
        OR (
          object_id IS NOT NULL
          AND public.can_access_object(auth.uid(), object_id)
          AND (assignee_id = auth.uid() OR created_by = auth.uid())
        )
      )
    )
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_review_work(auth.uid())
    OR (
      NOT public.has_role(auth.uid(), 'tools_keeper')
      AND object_id IS NOT NULL
      AND public.can_access_object(auth.uid(), object_id)
      AND assignee_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.can_review_work(auth.uid())
    OR (
      NOT public.has_role(auth.uid(), 'tools_keeper')
      AND assignee_id = auth.uid()
      AND (object_id IS NULL OR public.can_access_object(auth.uid(), object_id))
    )
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['director', 'deputy_director', 'rop']::public.app_role[]));

-- task_comments
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT TO authenticated
  USING (public.can_access_task(auth.uid(), task_id));

CREATE POLICY "auth insert own task_comments" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "auth update own task_comments" ON public.task_comments
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "auth delete own task_comments" ON public.task_comments
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- photo_reports
CREATE POLICY "photo_reports_select" ON public.photo_reports
  FOR SELECT TO authenticated
  USING (public.can_access_object(auth.uid(), object_id));

CREATE POLICY "photo_reports_insert" ON public.photo_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_object(auth.uid(), object_id)
    AND (author_id IS NULL OR author_id = auth.uid())
  );

CREATE POLICY "photo_reports_update" ON public.photo_reports
  FOR UPDATE TO authenticated
  USING (
    public.can_access_object(auth.uid(), object_id)
    AND (
      public.can_review_work(auth.uid())
      OR author_id = auth.uid()
    )
  );

CREATE POLICY "photo_reports_delete" ON public.photo_reports
  FOR DELETE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['director', 'deputy_director', 'rop']::public.app_role[])
    OR author_id = auth.uid()
  );

-- documents
CREATE POLICY "auth view document_types" ON public.document_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "director manage document_types insert" ON public.document_types
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'director'));

CREATE POLICY "director manage document_types update" ON public.document_types
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'director'));

CREATE POLICY "director manage document_types delete" ON public.document_types
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'director'));

CREATE POLICY "document_folders_select" ON public.document_folders
  FOR SELECT TO authenticated
  USING (public.can_access_object(auth.uid(), object_id));

CREATE POLICY "document_folders_insert" ON public.document_folders
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_object(auth.uid(), object_id));

CREATE POLICY "document_folders_update" ON public.document_folders
  FOR UPDATE TO authenticated
  USING (
    public.can_access_object(auth.uid(), object_id)
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
  );

CREATE POLICY "document_folders_delete" ON public.document_folders
  FOR DELETE TO authenticated
  USING (
    public.can_access_object(auth.uid(), object_id)
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
  );

CREATE POLICY "documents_select" ON public.documents
  FOR SELECT TO authenticated
  USING (public.can_access_object(auth.uid(), object_id));

CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_object(auth.uid(), object_id));

CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    public.can_access_object(auth.uid(), object_id)
    AND (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
  );

CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE TO authenticated
  USING (
    public.can_access_object(auth.uid(), object_id)
    AND (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
  );

-- expenses
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    public.can_see_finances(auth.uid())
    AND public.can_access_object(auth.uid(), object_id)
  );

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_see_finances(auth.uid())
    AND auth.uid() = created_by
    AND public.can_access_object(auth.uid(), object_id)
  );

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    public.can_see_finances(auth.uid())
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
  );

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    public.can_see_finances(auth.uid())
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
  );

CREATE POLICY "expense_attachments_select" ON public.expense_attachments
  FOR SELECT TO authenticated
  USING (
    public.can_see_finances(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND public.can_access_object(auth.uid(), e.object_id)
    )
  );

CREATE POLICY "expense_attachments_insert" ON public.expense_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_see_finances(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND (e.created_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
    )
  );

CREATE POLICY "expense_attachments_delete" ON public.expense_attachments
  FOR DELETE TO authenticated
  USING (
    public.can_see_finances(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND (e.created_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
    )
  );

CREATE POLICY "auth view expense_categories" ON public.expense_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "director manage expense_categories insert" ON public.expense_categories
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "director manage expense_categories update" ON public.expense_categories
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "director manage expense_categories delete" ON public.expense_categories
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'director'::app_role));

-- tools
CREATE POLICY "tools_select" ON public.tools
  FOR SELECT TO authenticated
  USING (
    public.has_elevated_object_access(auth.uid())
    OR public.has_role(auth.uid(), 'tools_keeper')
    OR assignee_id = auth.uid()
    OR (object_id IS NOT NULL AND public.can_access_object(auth.uid(), object_id))
  );

CREATE POLICY "tools_insert" ON public.tools
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_permission(auth.uid(), 'tools.manage'));

CREATE POLICY "tools_update" ON public.tools
  FOR UPDATE TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'tools.manage')
    OR assignee_id = auth.uid()
  );

CREATE POLICY "tools_delete" ON public.tools
  FOR DELETE TO authenticated
  USING (public.can_manage_tool_row(auth.uid(), assignee_id));

CREATE POLICY "tool_movements_select" ON public.tool_movements
  FOR SELECT TO authenticated
  USING (
    public.has_elevated_object_access(auth.uid())
    OR public.has_role(auth.uid(), 'tools_keeper')
    OR (from_object_id IS NOT NULL AND public.can_access_object(auth.uid(), from_object_id))
    OR (to_object_id IS NOT NULL AND public.can_access_object(auth.uid(), to_object_id))
  );

CREATE POLICY "tool_movements_insert" ON public.tool_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_permission(auth.uid(), 'tools.manage'));

-- customers & brigades
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.can_manage_objects(auth.uid())
    OR public.has_role(auth.uid(), 'tools_keeper')
  );

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_objects(auth.uid()));

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.can_manage_objects(auth.uid()));

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['director', 'deputy_director']::public.app_role[]));

CREATE POLICY "brigades_select" ON public.brigades
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "brigades_insert" ON public.brigades
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_objects(auth.uid()));

CREATE POLICY "brigades_update" ON public.brigades
  FOR UPDATE TO authenticated
  USING (public.can_manage_objects(auth.uid()));

CREATE POLICY "brigades_delete" ON public.brigades
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['director', 'deputy_director']::public.app_role[]));

CREATE POLICY "brigade_members_select" ON public.brigade_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "brigade_members_insert" ON public.brigade_members
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_objects(auth.uid()));

CREATE POLICY "brigade_members_delete" ON public.brigade_members
  FOR DELETE TO authenticated
  USING (public.can_manage_objects(auth.uid()));

-- open catalogs (unchanged from original migrations)
CREATE POLICY "auth view stage_templates" ON public.stage_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert stage_templates" ON public.stage_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update stage_templates" ON public.stage_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete stage_templates" ON public.stage_templates FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth view object_statuses" ON public.object_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert object_statuses" ON public.object_statuses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update object_statuses" ON public.object_statuses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete object_statuses" ON public.object_statuses FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth view object_health_states" ON public.object_health_states FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert object_health_states" ON public.object_health_states FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update object_health_states" ON public.object_health_states FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete object_health_states" ON public.object_health_states FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth view task_statuses" ON public.task_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert task_statuses" ON public.task_statuses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update task_statuses" ON public.task_statuses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete task_statuses" ON public.task_statuses FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth view task_priorities" ON public.task_priorities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert task_priorities" ON public.task_priorities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update task_priorities" ON public.task_priorities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete task_priorities" ON public.task_priorities FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth view tool_categories" ON public.tool_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert tool_categories" ON public.tool_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update tool_categories" ON public.tool_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete tool_categories" ON public.tool_categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth view tool_statuses" ON public.tool_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert tool_statuses" ON public.tool_statuses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update tool_statuses" ON public.tool_statuses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete tool_statuses" ON public.tool_statuses FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth view tool_conditions" ON public.tool_conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert tool_conditions" ON public.tool_conditions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update tool_conditions" ON public.tool_conditions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete tool_conditions" ON public.tool_conditions FOR DELETE TO authenticated USING (true);

-- role_permissions
CREATE POLICY "role_permissions_select" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_permissions_insert" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'director'));

CREATE POLICY "role_permissions_update" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'director'))
  WITH CHECK (public.has_role(auth.uid(), 'director'));

CREATE POLICY "role_permissions_delete" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'director'));

-- =============================================================================
-- 15. Storage policies
-- =============================================================================

CREATE POLICY "photos_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.can_access_object(auth.uid(), split_part(name, '/', 1))
  );

CREATE POLICY "photos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND public.can_access_object(auth.uid(), split_part(name, '/', 1))
  );

CREATE POLICY "photos_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.can_access_object(auth.uid(), split_part(name, '/', 1))
  );

CREATE POLICY "photos_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.can_access_object(auth.uid(), split_part(name, '/', 1))
  );

CREATE POLICY "auth view documents storage" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

CREATE POLICY "auth insert documents storage" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

CREATE POLICY "auth delete documents storage" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents');
