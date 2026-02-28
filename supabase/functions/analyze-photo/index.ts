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
    const { jobId, imageUrl, vehicleContext } = await req.json();

    if (!jobId || !imageUrl) {
      throw new Error('jobId and imageUrl are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const rekaApiKey = Deno.env.get('REKA_API_KEY')!;

    if (!rekaApiKey) {
      throw new Error('REKA_API_KEY secret is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Analyzing photo with Reka Vision for job:', jobId, 'image:', imageUrl);

    const vehicleInfo = vehicleContext
      ? `Vehicle: ${vehicleContext}`
      : 'Vehicle details not provided.';

    const rekaResponse = await fetch('https://api.reka.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rekaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'reka-core',
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

    if (!rekaResponse.ok) {
      const errorText = await rekaResponse.text();
      console.error('Reka Vision API error:', rekaResponse.status, errorText);
      throw new Error(`Reka Vision API error: ${rekaResponse.status} - ${errorText}`);
    }

    const rekaData = await rekaResponse.json();
    const analysisText = rekaData.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No analysis returned from Reka Vision');
    }

    console.log('Reka Vision analysis complete');

    // Fetch current photo_analysis array and append the new result
    const { data: jobData } = await supabase
      .from('jobs')
      .select('photo_analysis')
      .eq('id', jobId)
      .single();

    const existing = (jobData?.photo_analysis as any[]) || [];
    const newEntry = {
      imageUrl,
      analysis: analysisText,
      analyzedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ photo_analysis: [...existing, newEntry] })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job with photo analysis:', updateError);
      throw updateError;
    }

    console.log('Job updated with Reka Vision analysis');

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
