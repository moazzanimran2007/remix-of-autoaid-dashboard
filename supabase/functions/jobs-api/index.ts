import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // GET /jobs - List all jobs
    if (method === 'GET' && pathParts.length === 0) {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          assigned_mechanic:mechanics(id, name, phone, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /jobs/:id - Get single job
    if (method === 'GET' && pathParts.length === 1) {
      const jobId = pathParts[0];
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          assigned_mechanic:mechanics(id, name, phone, status)
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /jobs/:id/assign - Assign mechanic to job
    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'assign') {
      const jobId = pathParts[0];
      const { mechanicId } = await req.json();

      const { data, error } = await supabase
        .from('jobs')
        .update({ 
          assigned_mechanic_id: mechanicId,
          status: 'assigned',
        })
        .eq('id', jobId)
        .select(`
          *,
          assigned_mechanic:mechanics(id, name, phone, status)
        `)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /jobs/:id/status - Update job status
    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'status') {
      const jobId = pathParts[0];
      const { status } = await req.json();

      const { data, error } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', jobId)
        .select(`
          *,
          assigned_mechanic:mechanics(id, name, phone, status)
        `)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /jobs/:id/photos - Upload photo
    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'photos') {
      const jobId = pathParts[0];
      const { photoUrl } = await req.json();

      // Get current job
      const { data: currentJob } = await supabase
        .from('jobs')
        .select('photos')
        .eq('id', jobId)
        .single();

      const currentPhotos = currentJob?.photos || [];
      
      // Update with new photo
      const { data, error } = await supabase
        .from('jobs')
        .update({ 
          photos: [...currentPhotos, photoUrl]
        })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in jobs-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
