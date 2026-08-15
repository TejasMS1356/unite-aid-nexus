
CREATE TYPE public.app_role AS ENUM ('admin','agency','responder');
CREATE TYPE public.agency_status AS ENUM ('pending','verified','rejected');
CREATE TYPE public.availability AS ENUM ('available','on_mission','offline');
CREATE TYPE public.incident_status AS ENUM ('reported','assigned','in_progress','resolved');
CREATE TYPE public.mission_status AS ENUM ('pending','accepted','declined','completed');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agency') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  agency_type text NOT NULL,
  description text,
  contact_person text,
  contact_phone text,
  contact_email text,
  address text,
  district text,
  state text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  capabilities text[] NOT NULL DEFAULT '{}',
  personnel_count integer NOT NULL DEFAULT 0,
  status public.agency_status NOT NULL DEFAULT 'pending',
  availability public.availability NOT NULL DEFAULT 'available',
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencies TO authenticated;
GRANT ALL ON public.agencies TO service_role;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agencies_select_verified" ON public.agencies FOR SELECT TO authenticated
  USING (status = 'verified' OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "agencies_insert_own" ON public.agencies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "agencies_update_own" ON public.agencies FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "agencies_delete_admin" ON public.agencies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER agencies_updated BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.owns_agency(_agency_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.agencies WHERE id = _agency_id AND owner_id = auth.uid());
$$;

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  status public.availability NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources_select" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "resources_write_own" ON public.resources FOR ALL TO authenticated
  USING (public.owns_agency(agency_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_agency(agency_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER resources_updated BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  title text NOT NULL,
  disaster_type text NOT NULL,
  severity integer NOT NULL DEFAULT 3,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  people_affected integer NOT NULL DEFAULT 0,
  photo_url text,
  status public.incident_status NOT NULL DEFAULT 'reported',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents_select" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "incidents_insert" ON public.incidents FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "incidents_update" ON public.incidents FOR UPDATE TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "incidents_delete_admin" ON public.incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER incidents_updated BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
  status public.mission_status NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incident_id, agency_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions_select" ON public.missions FOR SELECT TO authenticated USING (true);
CREATE POLICY "missions_insert" ON public.missions FOR INSERT TO authenticated
  WITH CHECK (public.owns_agency(agency_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "missions_update" ON public.missions FOR UPDATE TO authenticated
  USING (public.owns_agency(agency_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_agency(agency_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "missions_delete" ON public.missions FOR DELETE TO authenticated
  USING (public.owns_agency(agency_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER missions_updated BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX missions_active_resource_idx ON public.missions (resource_id)
  WHERE resource_id IS NOT NULL AND status IN ('pending','accepted');

CREATE OR REPLACE FUNCTION public.sync_resource_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.resource_id IS NOT NULL THEN
    UPDATE public.resources SET status = CASE WHEN NEW.status = 'accepted' THEN 'on_mission'::public.availability ELSE 'available'::public.availability END
    WHERE id = NEW.resource_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER missions_sync_resource AFTER INSERT OR UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.sync_resource_status();

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  from_agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  to_agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select" ON public.alerts FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR to_agency_id IS NULL OR public.owns_agency(to_agency_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "alerts_insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
