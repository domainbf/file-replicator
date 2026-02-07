-- Schedule keep-alive function to run every 5 minutes to prevent database hibernation
SELECT cron.schedule(
  'keep-alive-ping',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://yevopoxwclhobpftewzb.supabase.co/functions/v1/keep-alive',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlldm9wb3h3Y2xob2JwZnRld3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzM3MTEsImV4cCI6MjA4NjA0OTcxMX0.QgM-kWZPWNEGcBTQ8yiV6fhpp_P33e1eDtxk3Q9FOyU'
    ),
    body := '{}'::jsonb
  );
  $$
);