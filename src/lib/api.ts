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
    recommendedTools: string[];
    estimatedTime: string;
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

  // Mechanics
  getMechanics: async () => {
    const { data, error } = await supabase
      .from('mechanics')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    // Transform to match frontend expectations
    return data.map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      distance: Math.floor(Math.random() * 15) + 1, // Mock distance for now
      status: m.status as 'available' | 'busy',
    }));
  },

  // Calls
  initiateCall: async (phoneNumber: string, type: 'customer' | 'mechanic') => {
    const { data, error } = await supabase.functions.invoke('call-outbound', {
      body: { phoneNumber, type },
    });
    
    if (error) throw error;
    return data;
  },
};
