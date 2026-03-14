import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) return response;
      if (attempt < retries) {
        console.warn(`AI gateway returned ${response.status}, retrying (${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      } else {
        return response;
      }
    } catch (err) {
      if (attempt < retries) {
        console.warn(`Network error, retrying (${attempt + 1}/${retries})...`, err);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Exhausted retries');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, imageUrl, vehicleContext } = await req.json();

    if (!jobId || !imageUrl) {
      throw new Error('jobId and imageUrl are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Analyzing photo with Lovable AI for job:', jobId, 'image:', imageUrl);

    const vehicleInfo = vehicleContext
      ? `Vehicle: ${vehicleContext}`
      : 'Vehicle details not provided.';

    // Use Gemini 2.5 Pro for image analysis with retry logic
    const aiResponse = await fetchWithRetry(AI_GATEWAY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
              {
                type: 'text',
                text: `You are an expert automotive technician performing a visual inspection.
${vehicleInfo}

Analyze this image and provide a detailed visual inspection report. Include:
1. What you can see in the image (describe the part/area visible)
2. Any visible damage, wear, leaks, corrosion, or abnormalities
3. Severity of what you observe (none / minor / moderate / severe)
4. Recommended action based on what you see
5. Any safety concerns

Be specific and technical. If the image is unclear or not automotive-related, state that clearly.`,
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI Vision error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI Vision error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No analysis returned from AI Vision');
    }

    console.log('AI Vision analysis complete');

    // Atomic read + update: fetch both photos and photo_analysis, append to both
    const { data: jobData } = await supabase
      .from('jobs')
      .select('photos, photo_analysis')
      .eq('id', jobId)
      .single();

    const existingPhotos = (jobData?.photos as string[]) || [];
    const existingAnalysis = (jobData?.photo_analysis as any[]) || [];

    const newAnalysisEntry = {
      imageUrl,
      analysis: analysisText,
      analyzedAt: new Date().toISOString(),
    };

    // Build update payload: append imageUrl to photos (if not already there) and analysis
    const updatedPhotos = existingPhotos.includes(imageUrl)
      ? existingPhotos
      : [...existingPhotos, imageUrl];

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        photos: updatedPhotos,
        photo_analysis: [...existingAnalysis, newAnalysisEntry],
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job with photo analysis:', updateError);
      throw updateError;
    }

    console.log('Job updated with AI Vision analysis');

    return new Response(
      JSON.stringify({ success: true, analysis: analysisText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-photo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
