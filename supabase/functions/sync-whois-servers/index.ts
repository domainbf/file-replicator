import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GITHUB_WHOIS_SERVERS_URL = 'https://raw.githubusercontent.com/WooMai/whois-servers/master/list.json';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting WHOIS servers sync...');
    
    // Fetch WHOIS servers list from GitHub
    const response = await fetch(GITHUB_WHOIS_SERVERS_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DomainLookup/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch WHOIS servers: ${response.status}`);
    }
    
    const whoisServers: Record<string, string | null> = await response.json();
    console.log(`Fetched ${Object.keys(whoisServers).length} TLD entries from GitHub`);
    
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Prepare data for upsert
    const records = Object.entries(whoisServers).map(([tld, server]) => ({
      tld: tld.toLowerCase(),
      server: server || null,
      updated_at: new Date().toISOString()
    }));
    
    // Batch upsert in chunks of 500
    const chunkSize = 500;
    let insertedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      
      const { error } = await supabase
        .from('whois_servers')
        .upsert(chunk, { 
          onConflict: 'tld',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`Error upserting chunk ${i / chunkSize + 1}:`, error);
        errorCount += chunk.length;
      } else {
        insertedCount += chunk.length;
        console.log(`Upserted chunk ${i / chunkSize + 1}: ${chunk.length} records`);
      }
    }
    
    const result = {
      success: true,
      message: `WHOIS servers sync completed`,
      stats: {
        totalFetched: Object.keys(whoisServers).length,
        insertedOrUpdated: insertedCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Sync completed:', JSON.stringify(result));
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
