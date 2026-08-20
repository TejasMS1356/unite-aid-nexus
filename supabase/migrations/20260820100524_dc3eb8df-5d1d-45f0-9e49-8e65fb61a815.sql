ALTER TABLE public.resources REPLICA IDENTITY FULL;
ALTER TABLE public.agencies REPLICA IDENTITY FULL;
ALTER TABLE public.incidents REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='resources') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
  END IF;
END $$;