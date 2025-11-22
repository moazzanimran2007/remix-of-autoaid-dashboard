// WebSocket connection management using Supabase Realtime
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type WebSocketEvent =
  | { type: 'transcript'; jobId: string; text: string }
  | { type: 'photo_received'; jobId: string; photoUrl: string }
  | { type: 'location_update'; jobId: string; lat: number; lng: number }
  | { type: 'diagnosis_update'; jobId: string; diagnosis: any }
  | { type: 'job_created'; job: any }
  | { type: 'job_updated'; job: any }
  | { type: 'job_completed'; jobId: string };

type WebSocketCallback = (event: WebSocketEvent) => void;

class WebSocketManager {
  private channel: RealtimeChannel | null = null;
  private callbacks: Set<WebSocketCallback> = new Set();

  connect() {
    if (this.channel) {
      return;
    }

    console.log('Connecting to Supabase Realtime...');
    
    this.channel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('Job created:', payload.new);
          this.callbacks.forEach((callback) => 
            callback({ type: 'job_created', job: payload.new })
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('Job updated:', payload.new);
          this.callbacks.forEach((callback) => 
            callback({ type: 'job_updated', job: payload.new })
          );
          
          // Check for specific updates
          const newJob = payload.new as any;
          const oldJob = payload.old as any;
          
          if (newJob.diagnosis && !oldJob.diagnosis) {
            this.callbacks.forEach((callback) =>
              callback({ type: 'diagnosis_update', jobId: newJob.id, diagnosis: newJob.diagnosis })
            );
          }
          
          if (newJob.photos && oldJob.photos && newJob.photos.length > oldJob.photos.length) {
            const newPhoto = newJob.photos[newJob.photos.length - 1];
            this.callbacks.forEach((callback) =>
              callback({ type: 'photo_received', jobId: newJob.id, photoUrl: newPhoto })
            );
          }
          
          if (newJob.location_lat && !oldJob.location_lat) {
            this.callbacks.forEach((callback) =>
              callback({ 
                type: 'location_update', 
                jobId: newJob.id, 
                lat: newJob.location_lat, 
                lng: newJob.location_lng 
              })
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Supabase Realtime connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Supabase Realtime error');
        } else if (status === 'TIMED_OUT') {
          console.error('Supabase Realtime timed out');
        } else if (status === 'CLOSED') {
          console.log('Supabase Realtime closed');
          this.channel = null;
        }
      });
  }

  subscribe(callback: WebSocketCallback) {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.callbacks.clear();
  }

  send(data: any) {
    console.log('Supabase Realtime does not support sending messages directly');
  }
}

export const wsManager = new WebSocketManager();
