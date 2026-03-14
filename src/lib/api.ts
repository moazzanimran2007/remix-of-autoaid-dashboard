// API helper functions using Supabase edge functions
import { supabase } from "@/integrations/supabase/client";

export interface Job {
  id: string;
  customerName: string;
  customerPhone: string;
  carModel: string;
  carMake?: string;
  carYear?: string;
  symptoms: string;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'assigned' | 'in-progress' | 'resolved';
  createdAt: string;
  assignedMechanic?: string;
  location?: {
    lat: number;
    lng: number;
  };
  photos?: string[];
  transcript?: string;
  diagnosis?: {
    issue: string;
    rootCause?: string;
    makeModelSpecifics?: string;
    severity: 'low' | 'medium' | 'high';
    confidenceLevel?: number;
    diagnosticSteps?: string[];
    recommendedTools: string[];
    estimatedTime: string;
    requiredParts?: Array<{
      partName: string;
      estimatedCost: string;
      isCommon: boolean;
    }>;
    commonIssuesForModel?: string[];
    safetyWarnings?: string[];
    alternativeDiagnoses?: Array<{
      issue: string;
      probability: 'low' | 'medium' | 'high';
      distinguishingFactors: string;
    }>;
    preventiveMeasures?: string[];
    mechanicNotes?: string;
  };
  toxicityFlag?: boolean;
  toxicityReason?: string | null;
  photoAnalysis?: Array<{
    imageUrl: string;
    analysis: string;
    analyzedAt: string;
  }>;
  partsSearchResults?: {
    results: Array<{
      partName: string;
      suppliers: Array<{
        supplierName: string;
        partNumber: string;
        price: number;
        currency: string;
        purchaseLink: string;
        inStock: boolean;
        shipping: string;
        rating?: number;
      }>;
      searchedAt: string;
      error?: string;
    }>;
    lastUpdated: string;
    vehicleSearched: string;
  };
}

export interface Mechanic {
  id: string;
  name: string;
  phone: string;
  distance: number;
  status: 'available' | 'busy';
}

// Map database fields to frontend format
function mapJobFromDb(dbJob: any): Job {
  return {
    id: dbJob.id,
    customerName: dbJob.customer_name || 'Unknown',
    customerPhone: dbJob.customer_phone || '',
    carModel: dbJob.car_model || '',
    carMake: dbJob.car_make,
    carYear: dbJob.car_year,
    symptoms: dbJob.symptoms || '',
    severity: dbJob.severity,
    status: dbJob.status,
    createdAt: dbJob.created_at,
    assignedMechanic: dbJob.assigned_mechanic?.name,
    location: dbJob.location_lat && dbJob.location_lng
      ? { lat: dbJob.location_lat, lng: dbJob.location_lng }
      : undefined,
    photos: dbJob.photos,
    transcript: dbJob.transcript,
    diagnosis: dbJob.diagnosis,
    toxicityFlag: dbJob.toxicity_flag ?? false,
    toxicityReason: dbJob.toxicity_reason ?? null,
    photoAnalysis: dbJob.photo_analysis ?? [],
    partsSearchResults: dbJob.parts_search_results,
  };
}

export const api = {
  // Jobs
  getJobs: async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        assigned_mechanic:mechanics(id, name, phone, status)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(mapJobFromDb);
  },
  
  getJob: async (id: string) => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        assigned_mechanic:mechanics(id, name, phone, status)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return mapJobFromDb(data);
  },
  
  assignJob: async (id: string, mechanicId: string) => {
    const { data, error } = await supabase
      .from('jobs')
      .update({ 
        assigned_mechanic_id: mechanicId,
        status: 'assigned',
      })
      .eq('id', id)
      .select(`
        *,
        assigned_mechanic:mechanics(id, name, phone, status)
      `)
      .single();
    
    if (error) throw error;
    return mapJobFromDb(data);
  },

  updateJobStatus: async (id: string, status: Job['status']) => {
    const { data, error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        assigned_mechanic:mechanics(id, name, phone, status)
      `)
      .single();
    
    if (error) throw error;
    return mapJobFromDb(data);
  },

  // Photo upload + Reka Vision analysis
  uploadPhoto: async (jobId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${jobId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('job-photos')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('job-photos').getPublicUrl(path);
    return data.publicUrl;
  },

  analyzePhoto: async (jobId: string, imageUrl: string, vehicleContext?: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('analyze-photo', {
      body: { jobId, imageUrl, vehicleContext },
    });
    if (error) throw error;
    return data.analysis as string;
  },

  // Mechanics
  getMechanics: async () => {
    const { data, error } = await supabase
      .from('mechanics')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return data.map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      distance: Math.floor(Math.random() * 15) + 1,
      status: m.status as 'available' | 'busy',
    }));
  },

  // Knowledge Base
  saveToKnowledgeBase: async (entry: {
    carMake: string;
    carModel: string;
    carYear?: string;
    symptomKeywords: string;
    verifiedDiagnosis: string;
    fixDescription?: string;
    partsUsed?: any[];
    actualTime?: string;
    severity?: 'low' | 'medium' | 'high';
    sourceJobId?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in');

    const { data, error } = await supabase
      .from('diagnostic_knowledge_base')
      .insert({
        car_make: entry.carMake,
        car_model: entry.carModel,
        car_year: entry.carYear,
        symptom_keywords: entry.symptomKeywords,
        verified_diagnosis: entry.verifiedDiagnosis,
        fix_description: entry.fixDescription,
        parts_used: entry.partsUsed || [],
        actual_time: entry.actualTime,
        severity: entry.severity,
        verified_by: user.id,
        source_job_id: entry.sourceJobId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getKnowledgeBase: async (filters?: { make?: string; model?: string; search?: string }) => {
    let query = supabase
      .from('diagnostic_knowledge_base')
      .select('*')
      .order('upvotes', { ascending: false });

    if (filters?.make) query = query.ilike('car_make', filters.make);
    if (filters?.model) query = query.ilike('car_model', filters.model);
    if (filters?.search) query = query.ilike('symptom_keywords', `%${filters.search}%`);

    const { data, error } = await query.limit(50);
    if (error) throw error;
    return data;
  },

  upvoteKnowledgeBase: async (id: string) => {
    const { data: current, error: fetchErr } = await supabase
      .from('diagnostic_knowledge_base')
      .select('upvotes')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const { error } = await supabase
      .from('diagnostic_knowledge_base')
      .update({ upvotes: (current.upvotes || 0) + 1 })
      .eq('id', id);
    if (error) throw error;
  },
};
