import { getSupabase, isSupabaseConfigured, initDatabaseConfig } from './supabaseClient.js';

/**
 * Log an audit or clinical access action
 */
export async function logAccess({
  patientId,
  patientHwId = null,
  userId = null,
  userName = null,
  accessorId = null,
  accessorRole = 'user',
  action,
  purpose = 'Clinical Care',
  details = ''
}) {
  try {
    await initDatabaseConfig();
    const effectiveUserId = userId || accessorId;
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('audit_logs')
        .insert({
          patient_id: patientId,
          user_id: effectiveUserId,
          role: accessorRole,
          action,
          purpose
        })
        .select()
        .single();
      return data;
    }

    if (typeof window !== 'undefined') {
      const res = await fetch('/api/db/audit_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          patient_hw_id: patientHwId,
          user_id: effectiveUserId,
          user_name: userName,
          role: accessorRole,
          action,
          purpose,
          details
        })
      });
      if (res.ok) return await res.json();
    } else {
      const { getDb } = await import('../../serverDb.js');
      const crypto = await import('node:crypto');
      const db = getDb();
      const logId = crypto.randomUUID();

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, patient_hw_id, patient_id, action, purpose, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        now,
        effectiveUserId ?? null,
        userName ?? null,
        accessorRole ?? 'user',
        patientHwId ?? null,
        patientId ?? null,
        action ?? 'ACCESS',
        purpose ?? '',
        details ?? '',
        now
      );
      return { id: logId, action, purpose, timestamp: now };
    }
  } catch (err) {
    console.warn('Audit access log non-blocking warning:', err.message);
  }
  return null;
}

export async function getAccessLogs(patientId) {
  try {
    await initDatabaseConfig();
    if (typeof window !== 'undefined') {
      const url = patientId 
        ? `/api/db/audit_logs?patient_id=${encodeURIComponent(patientId)}`
        : '/api/db/audit_logs';
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } else {
      const { getDb } = await import('../../serverDb.js');
      const db = getDb();
      if (patientId) {
        return db.prepare('SELECT * FROM audit_logs WHERE patient_id = ? OR patient_hw_id = ? ORDER BY timestamp DESC').all(patientId, patientId);
      }
      return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50').all();
    }
  } catch (err) {
    console.warn('Could not fetch audit logs:', err.message);
  }
  return [];
}
