/**
 * Supabase Realtime Service
 * Listens to real-time database changes for checkins table
 *
 * IMPORTANT: Before using this service, you need to enable Realtime on your Supabase tables:
 * 1. Go to Supabase Dashboard → Database → Replication
 * 2. Enable replication for 'checkins' and 'users' tables
 * 3. Set publication to include INSERT, UPDATE, DELETE events
 */

// Load environment variables first
require('dotenv').config();

const { supabase } = require('./database.service');

// Track if realtime is available
let realtimeAvailable = false;

/**
 * Initialize realtime listener for checkins
 */
function initRealtimeListener() {
  console.log('🔄 Initializing realtime listener for checkins...');

  const channel = supabase
    .channel('realtime-checkins')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'checkins' },
      (payload) => {
        console.log('🟢 New check-in (realtime):', {
          id: payload.new.id,
          user_id: payload.new.user_id,
          type: payload.new.type,
          timestamp: payload.new.timestamp
        });

        // You can add custom logic here, such as:
        // - Sending notifications
        // - Updating cache
        // - Triggering analytics
        // - Invalidating cached history
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'checkins' },
      (payload) => {
        console.log('🟡 Updated check-in (realtime):', {
          id: payload.new.id,
          user_id: payload.new.user_id,
          type: payload.new.type,
          old_timestamp: payload.old?.timestamp,
          new_timestamp: payload.new.timestamp
        });

        // Handle update logic (e.g., edited timestamps)
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'checkins' },
      (payload) => {
        console.log('🔴 Deleted check-in (realtime):', {
          id: payload.old.id,
          user_id: payload.old.user_id,
          type: payload.old.type
        });

        // Handle delete logic
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        realtimeAvailable = true;
        console.log('✅ Subscribed to realtime-checkins channel');
      } else if (status === 'CHANNEL_ERROR') {
        realtimeAvailable = false;
        console.error('❌ Error subscribing to realtime-checkins:', err);
        console.log('💡 Make sure Realtime is enabled in Supabase Dashboard → Database → Replication');
      } else if (status === 'TIMED_OUT') {
        realtimeAvailable = false;
        console.warn('⏱️ Realtime subscription timed out - Realtime may not be enabled');
        console.log('💡 To enable: Supabase Dashboard → Database → Replication → Enable for "checkins" table');
      } else if (status === 'CLOSED') {
        realtimeAvailable = false;
        console.log('🔌 Realtime channel closed');
      } else {
        console.log('📡 Realtime status:', status);
      }
    });

  return channel;
}

/**
 * Initialize realtime listener for users table
 */
function initUsersRealtimeListener() {
  console.log('🔄 Initializing realtime listener for users...');

  const channel = supabase
    .channel('realtime-users')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload) => {
        console.log('👤 User table change (realtime):', {
          event: payload.eventType,
          id: payload.new?.id || payload.old?.id,
          name: payload.new?.name || payload.old?.name
        });
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to realtime-users channel');
      } else if (status === 'TIMED_OUT') {
        console.warn('⏱️ Realtime subscription timed out for users table');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to realtime-users:', err);
      }
    });

  return channel;
}

/**
 * Check if realtime is available
 */
function isRealtimeAvailable() {
  return realtimeAvailable;
}

/**
 * Broadcast custom event
 * @param {string} event - Event name
 * @param {object} payload - Event payload
 */
async function broadcastEvent(event, payload) {
  const channel = supabase.channel('custom-events');

  await channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.send({
        type: 'broadcast',
        event: event,
        payload: payload
      });
      console.log(`📤 Broadcast event: ${event}`, payload);
    }
  });

  return channel;
}

module.exports = {
  initRealtimeListener,
  initUsersRealtimeListener,
  isRealtimeAvailable,
  broadcastEvent
};
