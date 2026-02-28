import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Neo4j Helpers ────────────────────────────────────────────────────────────

function neo4jAuthHeader(): string {
  const user = Deno.env.get('NEO4J_USERNAME') || 'neo4j';
  const pass = Deno.env.get('NEO4J_PASSWORD') || '';
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

function neo4jHttpUrl(): string {
  const uri = Deno.env.get('NEO4J_URI') || '';
  return uri.replace(/^neo4j\+s:\/\//, 'https://').replace(/^bolt\+s:\/\//, 'https://') + '/db/neo4j/tx/commit';
}

async function neo4jRun(statements: { statement: string; parameters?: Record<string, any> }[]): Promise<any> {
  const url = neo4jHttpUrl();
  if (!url || url === '/db/neo4j/tx/commit') {
    console.warn('NEO4J_URI not set, skipping Neo4j operation');
    return null;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': neo4jAuthHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ statements }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('Neo4j HTTP error:', response.status, text);
    return null;
  }
  return response.json();
}

async function queryNeo4jPatterns(make: string, model: string, symptoms: string): Promise<string> {
  const result = await neo4jRun([{
    statement: `
      MATCH (v:Vehicle)-[:HAD_SYMPTOM]->(s:Symptom)-[:RESULTED_IN]->(d:Diagnosis)
      WHERE toLower(v.make) = toLower($make)
        AND toLower(v.model) = toLower($model)
      RETURN s.description AS symptom, d.issue AS diagnosis,
             d.severity AS severity, d.confidence AS confidence,
             count(*) AS frequency
      ORDER BY frequency DESC
      LIMIT 5
    `,
    parameters: { make, model, symptoms },
  }]);

  if (!result || !result.results?.[0]?.data?.length) return '';

  const patterns = result.results[0].data.map((row: any) => {
    const [symptom, diagnosis, severity, confidence, frequency] = row.row;
    return `- Symptom: "${symptom}" → Diagnosis: "${diagnosis}" (severity: ${severity}, confidence: ${confidence}%, seen ${frequency}x)`;
  });

  return patterns.length
    ? `\n\nHISTORICAL PATTERNS FROM KNOWLEDGE GRAPH (${make} ${model}):\n${patterns.join('\n')}`
    : '';
}

async function storeNeo4jPattern(
  make: string, model: string, year: string,
  symptoms: string, diagnosis: any
): Promise<void> {
  await neo4jRun([{
    statement: `
      MERGE (v:Vehicle {make: $make, model: $model, year: $year})
      MERGE (s:Symptom {description: $symptoms})
      MERGE (d:Diagnosis {issue: $issue})
        ON CREATE SET d.severity = $severity, d.confidence = $confidence
      MERGE (v)-[:HAD_SYMPTOM]->(s)
      MERGE (s)-[:RESULTED_IN]->(d)
      WITH d
      UNWIND $parts AS partName
        MERGE (p:Part {name: partName})
        MERGE (d)-[:REQUIRES]->(p)
    `,
    parameters: {
      make,
      model,
      year,
      symptoms,
      issue: diagnosis.issue,
      severity: diagnosis.severity,
      confidence: diagnosis.confidenceLevel || 0,
      parts: (diagnosis.requiredParts || []).map((p: any) => p.partName),
    },
  }]);
  console.log(`Neo4j: stored pattern for ${year} ${make} ${model}`);
}

// ─── OpenAI API Helper ────────────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  tools: any[],
  toolName: string
): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error(`No tool call in OpenAI response: ${JSON.stringify(data)}`);
  }
  return JSON.parse(toolCall.function.arguments);
}

// ─────────────────────────────────────────────────────────────────────────────

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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY secret is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting AI diagnosis for job:', jobId);

    // Step 1: Extract customer and vehicle information from transcript
    console.log('Step 1: Extracting call info with gpt-4o-mini...');
    const callInfo = await callOpenAI(
      openaiApiKey,
      'gpt-4o-mini',
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
    );

    console.log('Extracted call info:', callInfo);

    // Step 2: Query Neo4j for historical patterns on this vehicle
    const historicalPatterns = await queryNeo4jPatterns(
      callInfo.carMake,
      callInfo.carModel,
      callInfo.symptoms
    ).catch(err => {
      console.error('Neo4j query error (non-fatal):', err);
      return '';
    });

    if (historicalPatterns) {
      console.log('Neo4j: found historical patterns, enriching AI prompt');
    }

    // Step 3: Get AI diagnosis with gpt-4o (enriched with Neo4j patterns)
    console.log('Step 3: Running AI diagnosis with gpt-4o...');
    const diagnosis = await callOpenAI(
      openaiApiKey,
      'gpt-4o',
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
9. If historical patterns are provided, use them to increase confidence and refine your diagnosis

If vehicle details are unavailable (N/A), still provide thorough symptom-based analysis but note the limitation.

Provide comprehensive, actionable diagnostic information that will help mechanics work efficiently and safely.`,
      `VEHICLE CONTEXT:
- Make: ${callInfo.carMake}
- Model: ${callInfo.carModel}
- Year: ${callInfo.carYear}

SYMPTOMS: ${callInfo.symptoms}${historicalPatterns}

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
              rootCause: { type: 'string', description: 'Deep analysis of why this is happening, considering physics, mechanics, and failure modes' },
              makeModelSpecifics: { type: 'string', description: 'Known issues, recalls, TSBs, and common problems specific to this exact make/model/year.' },
              severity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Severity level of the issue' },
              confidenceLevel: { type: 'number', description: 'Confidence in this diagnosis from 0-100' },
              diagnosticSteps: { type: 'array', items: { type: 'string' }, description: 'Step-by-step diagnostic procedure' },
              recommendedTools: { type: 'array', items: { type: 'string' }, description: 'Tools needed for diagnosis and repair' },
              estimatedTime: { type: 'string', description: 'Realistic time estimate (e.g., "3-5 hours")' },
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
                description: 'Parts likely needed with cost estimates',
              },
              commonIssuesForModel: { type: 'array', items: { type: 'string' }, description: 'Historical common problems for this make/model/year' },
              safetyWarnings: { type: 'array', items: { type: 'string' }, description: 'Safety concerns specific to this repair' },
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
                description: 'Alternative possible diagnoses',
              },
              preventiveMeasures: { type: 'array', items: { type: 'string' }, description: 'Prevention specific to this vehicle' },
              mechanicNotes: { type: 'string', description: 'Special tips or warnings for the mechanic' },
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
    );

    console.log('Parsed diagnosis, severity:', diagnosis.severity);

    // Step 4: Update job with all extracted information
    const updateData: any = {
      customer_name: callInfo.customerName,
      car_make: callInfo.carMake,
      car_model: callInfo.carModel,
      car_year: callInfo.carYear,
      symptoms: callInfo.symptoms,
      diagnosis: diagnosis,
      severity: diagnosis.severity,
    };

    if (callInfo.locationAddress) {
      updateData.symptoms = `${callInfo.symptoms}\n\nLocation: ${callInfo.locationAddress}`;
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }

    console.log('Job updated with diagnosis');

    // Store repair pattern in Neo4j (fire and forget)
    storeNeo4jPattern(
      callInfo.carMake,
      callInfo.carModel,
      callInfo.carYear,
      callInfo.symptoms,
      diagnosis
    ).catch(err => console.error('Neo4j store error (non-fatal):', err));

    // Trigger parts search asynchronously
    if (diagnosis.requiredParts && diagnosis.requiredParts.length > 0) {
      console.log('Triggering parts search for', diagnosis.requiredParts.length, 'parts');
      supabase.functions.invoke('search-parts', {
        body: {
          jobId: jobId,
          vehicleInfo: {
            year: callInfo.carYear,
            make: callInfo.carMake,
            model: callInfo.carModel,
          },
          parts: diagnosis.requiredParts,
        }
      }).catch(error => {
        console.error('Error invoking search-parts:', error);
      });
    }

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
