-- Create table to store WHOIS servers list
CREATE TABLE public.whois_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tld TEXT NOT NULL UNIQUE,
  server TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read, no public write)
ALTER TABLE public.whois_servers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read WHOIS servers (public data)
CREATE POLICY "WHOIS servers are publicly readable" 
ON public.whois_servers 
FOR SELECT 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_whois_servers_tld ON public.whois_servers(tld);

-- Create trigger for updated_at
CREATE TRIGGER update_whois_servers_updated_at
BEFORE UPDATE ON public.whois_servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;