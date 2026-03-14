import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// --- Brand alias normalization ---
const BRAND_ALIASES: Record<string, string> = {
  'chevy': 'Chevrolet',
  'chevvy': 'Chevrolet',
  'merc': 'Mercedes-Benz',
  'benz': 'Mercedes-Benz',
  'mercedes': 'Mercedes-Benz',
  'beemer': 'BMW',
  'beamer': 'BMW',
  'bimmer': 'BMW',
  'vw': 'Volkswagen',
  'volks': 'Volkswagen',
  'caddy': 'Cadillac',
  'olds': 'Oldsmobile',
  'pontiac': 'Pontiac',
  'landy': 'Land Rover',
  'rover': 'Land Rover',
  'jag': 'Jaguar',
  'alfa': 'Alfa Romeo',
  'aston': 'Aston Martin',
  'lambo': 'Lamborghini',
  'rolls': 'Rolls-Royce',
  'rr': 'Rolls-Royce',
};

function normalizeBrand(brand: string): string {
  if (!brand) return brand;
  const lower = brand.trim().toLowerCase();
  if (BRAND_ALIASES[lower]) return BRAND_ALIASES[lower];
  // Title-case fallback
  return brand.trim().replace(/\b\w/g, c => c.toUpperCase());
}

// --- Transcript quality gate ---
function assessTranscriptQuality(transcript: string): { ok: boolean; reason?: string } {
  if (!transcript || transcript.trim().length < 20) {
    return { ok: false, reason: 'Transcript too short (under 20 characters)' };
  }
  // Count meaningful user turns — look for patterns like "User:", "Customer:", or lines with "?" 
  const lines = transcript.split('\n').filter(l => l.trim().length > 0);
  const userTurns = lines.filter(l =>
    /^(user|customer|caller|client)\s*:/i.test(l.trim()) ||
    /\b(my car|my vehicle|it('s| is)|problem|issue|noise|light|won't|doesn't|broke|leak|smell|shake|vibrat)/i.test(l)
  );
  if (userTurns.length < 2 && lines.length < 4) {
    return { ok: false, reason: `Insufficient content — only ${userTurns.length} meaningful turn(s) detected` };
  }
  return { ok: true };
}

// --- Retry wrapper for AI calls ---
async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  label = 'AI call'
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err instanceof Error && (
        err.message.includes('500') || err.message.includes('502') ||
        err.message.includes('503') || err.message.includes('504') ||
        err.message.includes('network') || err.message.includes('fetch')
      );
      if (attempt < retries && isRetryable) {
        const delay = 1000 * (attempt + 1);
        console.warn(`${label} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err.message);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`${label} failed after ${retries + 1} attempts`);
}

async function callLovableAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  tools: any[],
  toolName: string
): Promise<any> {
  const response = await fetch(AI_GATEWAY, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      tools,
      tool_choice: { type: 'function', function: { name: toolName } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error(`No tool call in AI response: ${JSON.stringify(data)}`);
  }
  return JSON.parse(toolCall.function.arguments);
}

async function fetchKnowledgeBaseContext(
  supabase: any,
  carMake: string,
  carModel: string,
  symptoms: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_knowledge_base')
      .select('verified_diagnosis, fix_description, parts_used, severity, upvotes, car_year, actual_time')
      .ilike('car_make', carMake)
      .ilike('car_model', carModel)
      .order('upvotes', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      console.log('No knowledge base matches found');
      return '';
    }

    console.log(`Found ${data.length} knowledge base entries for ${carMake} ${carModel}`);

    const entries = data.map((entry: any, i: number) =>
      `${i + 1}. [${entry.upvotes} upvotes${entry.car_year ? `, Year: ${entry.car_year}` : ''}] ${entry.verified_diagnosis}${entry.fix_description ? `\n   Fix: ${entry.fix_description}` : ''}${entry.actual_time ? `\n   Actual repair time: ${entry.actual_time}` : ''}${entry.parts_used?.length ? `\n   Parts used: ${entry.parts_used.map((p: any) => p.partName || p).join(', ')}` : ''}`
    ).join('\n\n');

    return `\n\nVERIFIED PAST DIAGNOSES FROM MECHANIC KNOWLEDGE BASE (use these as reference — they are real, mechanic-verified fixes for this make/model):\n${entries}`;
  } catch (err) {
    console.error('Error fetching knowledge base:', err);
    return '';
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MechanicApp/1.0' },
    });
    const data = await res.json();
    if (data?.[0]?.lat && data?.[0]?.lon) {
      console.log('Geocoded address:', address, '→', data[0].lat, data[0].lon);
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    console.log('Geocoding returned no results for:', address);
    return null;
  } catch (err) {
    console.error('Geocoding failed:', err);
    return null;
  }
}

async function fetchCorrectionsContext(
  supabase: any,
  carMake: string,
  carModel: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('diagnosis_corrections')
      .select('corrected_issue, corrected_root_cause, corrected_severity, corrected_time, mechanic_feedback, accuracy_rating, job_id')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) return '';

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, car_make, car_model')
      .in('id', data.map((d: any) => d.job_id))
      .ilike('car_make', carMake)
      .ilike('car_model', carModel);

    if (!jobs || jobs.length === 0) return '';

    const jobIds = new Set(jobs.map((j: any) => j.id));
    const relevant = data.filter((d: any) => jobIds.has(d.job_id));

    if (relevant.length === 0) return '';

    console.log(`Found ${relevant.length} mechanic corrections for ${carMake} ${carModel}`);

    const entries = relevant.slice(0, 5).map((c: any, i: number) =>
      `${i + 1}. [Accuracy: ${c.accuracy_rating}/5] ${c.corrected_issue || 'No issue correction'}${c.corrected_root_cause ? `\n   Root cause: ${c.corrected_root_cause}` : ''}${c.mechanic_feedback ? `\n   Mechanic feedback: ${c.mechanic_feedback}` : ''}${c.corrected_time ? `\n   Actual time: ${c.corrected_time}` : ''}`
    ).join('\n\n');

    return `\n\nMECHANIC CORRECTIONS (these are real corrections from mechanics who found the AI diagnosis inaccurate — learn from these mistakes and avoid repeating them):\n${entries}`;
  } catch (err) {
    console.error('Error fetching corrections:', err);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, transcript } = await req.json();

    if (!jobId || !transcript) {
      throw new Error('jobId and transcript are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Quality gate ---
    const quality = assessTranscriptQuality(transcript);
    if (!quality.ok) {
      console.warn('Transcript quality gate failed:', quality.reason);
      await supabase
        .from('jobs')
        .update({
          symptoms: `Insufficient transcript — manual review needed. Reason: ${quality.reason}`,
          severity: 'low',
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({
        success: false,
        qualityGate: false,
        reason: quality.reason,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting AI diagnosis for job:', jobId);

    // Step 1: Extract customer and vehicle information (with retry)
    console.log('Step 1: Extracting call info with gemini-2.5-flash...');
    const callInfo = await callWithRetry(
      () => callLovableAI(
        lovableApiKey,
        'google/gemini-2.5-flash',
        'Extract customer and vehicle information from this call transcript. Be precise and extract exactly what was said.',
        transcript,
        [{
          type: 'function',
          function: {
            name: 'extract_call_info',
            description: 'Extract structured information from the call transcript',
            parameters: {
              type: 'object',
              properties: {
                customerName: { type: 'string', description: 'Customer full name' },
                carMake: { type: 'string', description: 'Vehicle manufacturer/brand (e.g., Toyota, Ford)' },
                carModel: { type: 'string', description: 'Vehicle model (e.g., Camry, F-150)' },
                carYear: { type: 'string', description: 'Vehicle year (e.g., 2018, 2020)' },
                symptoms: { type: 'string', description: 'Clear summary of the vehicle problem described' },
                locationAddress: { type: 'string', description: 'Customer location or address if mentioned' },
              },
              required: ['customerName', 'carMake', 'carModel', 'carYear', 'symptoms'],
              additionalProperties: false,
            },
          },
        }],
        'extract_call_info'
      ),
      2,
      'Extract call info'
    );

    // Normalize brand aliases
    callInfo.carMake = normalizeBrand(callInfo.carMake);
    console.log('Extracted call info (normalized):', callInfo);

    // Step 1.5: Query knowledge base + corrections for RAG (already parallel)
    console.log('Step 1.5: Querying diagnostic knowledge base and corrections...');
    const [knowledgeBaseContext, correctionsContext] = await Promise.all([
      fetchKnowledgeBaseContext(supabase, callInfo.carMake, callInfo.carModel, callInfo.symptoms),
      fetchCorrectionsContext(supabase, callInfo.carMake, callInfo.carModel),
    ]);

    // Step 2: Get AI diagnosis (with retry)
    console.log('Step 2: Running AI diagnosis with gemini-2.5-pro...');
    const diagnosis = await callWithRetry(
      () => callLovableAI(
        lovableApiKey,
        'google/gemini-2.5-pro',
        `You are an expert master automotive diagnostic technician with 20+ years of experience across all makes and models.

CRITICAL INSTRUCTIONS:
1. Consider this SPECIFIC vehicle's known issues, recalls, TSBs (Technical Service Bulletins), and common failure patterns
2. Reference make/model-specific components and known problems where relevant
3. Provide detailed root cause analysis, not just symptoms
4. Include step-by-step diagnostic procedures specific to this vehicle
5. Consider parts availability and estimated costs for this specific make/model
6. Identify safety concerns specific to this repair on this vehicle
7. Provide alternative diagnoses with probability assessments
8. Include preventive measures specific to this vehicle

If vehicle details are unavailable (N/A), still provide thorough symptom-based analysis but note the limitation.

If VERIFIED PAST DIAGNOSES are provided below, strongly consider them as they come from real mechanic experience with this exact make/model. Weight them higher than generic knowledge, especially entries with many upvotes.

If MECHANIC CORRECTIONS are provided below, pay close attention — these are cases where the AI was wrong and mechanics had to correct it. Avoid making the same mistakes. Adjust your diagnosis accordingly.

Provide comprehensive, actionable diagnostic information that will help mechanics work efficiently and safely.`,
        `VEHICLE CONTEXT:
- Make: ${callInfo.carMake}
- Model: ${callInfo.carModel}
- Year: ${callInfo.carYear}

SYMPTOMS: ${callInfo.symptoms}${knowledgeBaseContext}${correctionsContext}

Provide a comprehensive diagnostic analysis for this specific vehicle.`,
        [{
          type: 'function',
          function: {
            name: 'provide_diagnosis',
            description: 'Provide comprehensive automotive diagnosis with vehicle-specific analysis',
            parameters: {
              type: 'object',
              properties: {
                issue: { type: 'string', description: 'Detailed description of the probable issue (3-5 sentences with technical detail)' },
                rootCause: { type: 'string', description: 'Deep analysis of why this is happening' },
                makeModelSpecifics: { type: 'string', description: 'Known issues, recalls, TSBs specific to this make/model/year' },
                severity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Severity level' },
                confidenceLevel: { type: 'number', description: 'Confidence 0-100' },
                diagnosticSteps: { type: 'array', items: { type: 'string' }, description: 'Step-by-step diagnostic procedure' },
                recommendedTools: { type: 'array', items: { type: 'string' }, description: 'Tools needed' },
                estimatedTime: { type: 'string', description: 'Time estimate (e.g., "3-5 hours")' },
                requiredParts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      partName: { type: 'string' },
                      estimatedCost: { type: 'string' },
                      isCommon: { type: 'boolean' },
                    },
                    required: ['partName', 'estimatedCost', 'isCommon'],
                    additionalProperties: false,
                  },
                },
                commonIssuesForModel: { type: 'array', items: { type: 'string' } },
                safetyWarnings: { type: 'array', items: { type: 'string' } },
                alternativeDiagnoses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      issue: { type: 'string' },
                      probability: { type: 'string', enum: ['low', 'medium', 'high'] },
                      distinguishingFactors: { type: 'string' },
                    },
                    required: ['issue', 'probability', 'distinguishingFactors'],
                    additionalProperties: false,
                  },
                },
                preventiveMeasures: { type: 'array', items: { type: 'string' } },
                mechanicNotes: { type: 'string' },
              },
              required: [
                'issue', 'rootCause', 'makeModelSpecifics', 'severity', 'confidenceLevel',
                'diagnosticSteps', 'recommendedTools', 'estimatedTime', 'requiredParts',
                'commonIssuesForModel', 'safetyWarnings', 'alternativeDiagnoses',
                'preventiveMeasures', 'mechanicNotes',
              ],
              additionalProperties: false,
            },
          },
        }],
        'provide_diagnosis'
      ),
      2,
      'AI diagnosis'
    );

    console.log('Parsed diagnosis, severity:', diagnosis.severity);

    // Step 3: Build update data
    const updateData: any = {
      customer_name: callInfo.customerName,
      car_make: callInfo.carMake,
      car_model: callInfo.carModel,
      car_year: callInfo.carYear,
      symptoms: callInfo.symptoms,
      diagnosis: diagnosis,
      severity: diagnosis.severity,
    };

    // Geocode location if available
    if (callInfo.locationAddress) {
      console.log('Geocoding address:', callInfo.locationAddress);
      const coords = await geocodeAddress(callInfo.locationAddress);
      if (coords) {
        updateData.location_lat = coords.lat;
        updateData.location_lng = coords.lng;
      } else {
        updateData.symptoms = `${callInfo.symptoms}\n\nLocation: ${callInfo.locationAddress}`;
      }
    }

    // Step 4: Update DB + trigger parts search IN PARALLEL
    const dbUpdatePromise = supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .then(({ error: updateError }: any) => {
        if (updateError) {
          console.error('Error updating job:', updateError);
          throw updateError;
        }
        console.log('Job updated with diagnosis');
      });

    const partsSearchPromise = (diagnosis.requiredParts && diagnosis.requiredParts.length > 0)
      ? supabase.functions.invoke('search-parts', {
          body: {
            jobId,
            vehicleInfo: {
              year: callInfo.carYear,
              make: callInfo.carMake,
              model: callInfo.carModel,
            },
            parts: diagnosis.requiredParts,
          },
        }).catch((error: any) => {
          console.error('Error invoking search-parts:', error);
        })
      : Promise.resolve();

    await Promise.all([dbUpdatePromise, partsSearchPromise]);

    return new Response(JSON.stringify({ success: true, diagnosis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-diagnosis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
