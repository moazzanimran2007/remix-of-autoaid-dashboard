import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function searchPartWithTavily(
  tavilyApiKey: string,
  lovableApiKey: string,
  partName: string,
  vehicleString: string
): Promise<{ suppliers: any[]; error?: string }> {
  // Step 1: Search with Tavily
  const tavilyResponse = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: tavilyApiKey,
      query: `buy ${vehicleString} ${partName} OEM aftermarket price in stock`,
      search_depth: 'advanced',
      include_answer: true,
      include_domains: [
        'rockauto.com', 'autozone.com', 'oreillyauto.com',
        'amazon.com', 'ebay.com', 'napaonline.com', 'advanceautoparts.com'
      ],
      max_results: 6,
    }),
  });

  if (!tavilyResponse.ok) {
    throw new Error(`Tavily search failed: ${tavilyResponse.status}`);
  }

  const tavilyData = await tavilyResponse.json();
  const searchResults = tavilyData.results || [];
  const tavilyAnswer = tavilyData.answer || '';

  console.log(`Tavily returned ${searchResults.length} results for ${partName}`);

  if (searchResults.length === 0) {
    return { suppliers: [], error: 'No results found' };
  }

  // Step 2: Use AI to extract structured supplier data from Tavily results
  const resultsText = searchResults
    .map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\nContent: ${r.content}`)
    .join('\n\n---\n\n');

  const extractResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are extracting automotive parts supplier data from web search results.
Extract the top 3 best supplier options. If a price is not clearly stated, use "Price varies".
Only include entries where you can extract a real supplier name and URL.`
        },
        {
          role: 'user',
          content: `Vehicle: ${vehicleString}
Part: ${partName}

Tavily summary: ${tavilyAnswer}

Search results:
${resultsText}

Extract the top 3 supplier options.`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_suppliers',
            description: 'Extract structured supplier data from search results',
            parameters: {
              type: 'object',
              properties: {
                suppliers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      supplierName: { type: 'string' },
                      partNumber: { type: 'string' },
                      price: { type: 'number' },
                      currency: { type: 'string' },
                      purchaseLink: { type: 'string' },
                      inStock: { type: 'boolean' },
                      shipping: { type: 'string' },
                    },
                    required: ['supplierName', 'partNumber', 'price', 'currency', 'purchaseLink', 'inStock', 'shipping']
                  }
                }
              },
              required: ['suppliers'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'extract_suppliers' } }
    }),
  });

  if (!extractResponse.ok) {
    throw new Error(`AI extraction failed: ${extractResponse.status}`);
  }

  const extractData = await extractResponse.json();
  const toolCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return { suppliers: [] };

  const { suppliers } = JSON.parse(toolCall.function.arguments);
  return { suppliers: suppliers.slice(0, 3) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, vehicleInfo, parts } = await req.json();

    if (!jobId || !vehicleInfo || !parts || !Array.isArray(parts)) {
      throw new Error('jobId, vehicleInfo, and parts array are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tavilyApiKey = Deno.env.get('TAVILY_API_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const vehicleString = `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`;
    console.log(`Starting Tavily parts search for job ${jobId} — vehicle: ${vehicleString}`);

    const searchResults = [];

    for (const part of parts) {
      console.log(`Searching Tavily for: ${part.partName}`);
      try {
        const result = await searchPartWithTavily(
          tavilyApiKey,
          lovableApiKey,
          part.partName,
          vehicleString
        );
        searchResults.push({
          partName: part.partName,
          suppliers: result.suppliers,
          searchedAt: new Date().toISOString(),
          ...(result.error ? { error: result.error } : {}),
        });
      } catch (err) {
        console.error(`Error searching for ${part.partName}:`, err);
        searchResults.push({
          partName: part.partName,
          suppliers: [],
          searchedAt: new Date().toISOString(),
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const partsSearchData = {
      results: searchResults,
      lastUpdated: new Date().toISOString(),
      vehicleSearched: vehicleString,
      source: 'tavily',
    };

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ parts_search_results: partsSearchData })
      .eq('id', jobId);

    if (updateError) throw updateError;

    console.log('Tavily parts search completed for job:', jobId);

    return new Response(
      JSON.stringify({ success: true, searchResults, vehicleSearched: vehicleString }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-parts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
