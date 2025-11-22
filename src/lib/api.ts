// API helper functions for backend integration

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Jobs
  getJobs: () => fetchAPI<Job[]>('/jobs'),
  
  getJob: (id: string) => fetchAPI<Job>(`/jobs/${id}`),
  
  assignJob: (id: string, mechanicId: string) =>
    fetchAPI<Job>(`/jobs/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ mechanicId }),
    }),

  updateJobStatus: (id: string, status: Job['status']) =>
    fetchAPI<Job>(`/jobs/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Mechanics
  getMechanics: () => fetchAPI<Mechanic[]>('/mechanics'),

  // Calls
  initiateCall: (phoneNumber: string, type: 'customer' | 'mechanic') =>
    fetchAPI('/calls/outbound', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, type }),
    }),
};
