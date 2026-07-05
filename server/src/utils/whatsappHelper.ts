import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import pool from '../config/db.js';
import { getPaymentPhaseAmount, cleanPhaseName } from './emailHelper.js';

const execAsync = promisify(exec);

const OPENWA_API_URL = process.env.OPENWA_API_URL || 'http://localhost:2785';
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || '';
const OPENWA_SESSION_NAME = process.env.OPENWA_SESSION_NAME || 'sms-send-updates';

// SSH config for clearing auth files on the remote OpenWA server
const OPENWA_SSH_KEY = process.env.OPENWA_SSH_KEY || '';
const OPENWA_SSH_HOST = process.env.OPENWA_SSH_HOST || '';
const OPENWA_SSH_USER = process.env.OPENWA_SSH_USER || 'ubuntu';
const OPENWA_DOCKER_CONTAINER = process.env.OPENWA_DOCKER_CONTAINER || 'openwa-api';

interface WhatsAppTemplatePayload {
  chatId: string;
  templateName: string;
  vars: Record<string, string>;
}

// Session cache maps keyed by session name
let cachedSessionIds: Record<string, string> = {};
let disconnectedSessions = new Set<string>();

let lastSessionNameCache: string | null = null;
let lastCacheTime = 0;

/**
 * Gets the active WhatsApp session name from database settings table,
 * falling back to the configured environment variable.
 */
export async function getActiveSessionName(): Promise<string> {
  const now = Date.now();
  if (lastSessionNameCache && (now - lastCacheTime < 2000)) {
    return lastSessionNameCache;
  }

  try {
    const [rows]: any = await pool.execute('SELECT setting_value FROM settings WHERE setting_key = "whatsapp_session_name"');
    if (rows && rows.length > 0) {
      const dbValue = rows[0].setting_value;
      if (dbValue && dbValue.trim() !== '') {
        lastSessionNameCache = dbValue.trim();
        lastCacheTime = now;
        return lastSessionNameCache;
      }
    }
  } catch (error) {
    console.error('[WhatsApp Service] Error reading session name from DB:', error);
  }

  lastSessionNameCache = OPENWA_SESSION_NAME;
  lastCacheTime = now;
  return lastSessionNameCache;
}

/**
 * Saves a setting in the database settings table.
 */
async function saveSetting(key: string, value: string): Promise<void> {
  try {
    await pool.execute(
      'INSERT INTO settings (setting_key, value_type, setting_value) VALUES (?, "string", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      [key, value, value]
    );
  } catch (err) {
    console.error(`[WhatsApp Service] Error saving setting ${key}:`, err);
  }
}

/**
 * Reads a setting from the database settings table.
 */
async function getSetting(key: string): Promise<string | null> {
  try {
    const [rows]: any = await pool.execute('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
    if (rows && rows.length > 0) {
      return rows[0].setting_value;
    }
  } catch (err) {
    console.error(`[WhatsApp Service] Error reading setting ${key}:`, err);
  }
  return null;
}

/**
 * Resolves session name to its active OpenWA session ID.
 * If not found, attempts to create the session first.
 */
async function getSessionId(autoCreate = true): Promise<string> {
  const sessionName = await getActiveSessionName();
  if (cachedSessionIds[sessionName]) return cachedSessionIds[sessionName];

  const url = `${OPENWA_API_URL}/api/sessions`;
  const headers = {
    'Content-Type': 'application/json',
    ...(OPENWA_API_KEY ? { 'X-API-Key': OPENWA_API_KEY } : {})
  };

  try {
    let response = await fetch(url, { headers });
    if (response.ok) {
      let sessions = await response.json();
      let session = sessions.find((s: any) => s.name === sessionName || s.id === sessionName);
      
      if (!session && autoCreate && !disconnectedSessions.has(sessionName)) {
        // Try creating session only if not intentionally disconnected
        console.log(`[WhatsApp Service] Session "${sessionName}" not found. Creating...`);
        const createRes = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: sessionName })
        });
        if (createRes.ok || createRes.status === 409) {
          response = await fetch(url, { headers });
          if (response.ok) {
            sessions = await response.json();
            session = sessions.find((s: any) => s.name === sessionName);
          }
        }
      }
      
      if (session) {
        cachedSessionIds[sessionName] = session.id;
        console.log(`[WhatsApp Service] Resolved session "${sessionName}" to ID "${session.id}"`);
        return session.id;
      }
    }
  } catch (error: any) {
    console.error('[WhatsApp Service] Error resolving session ID:', error.message || error);
  }

  return sessionName; // fallback to session name
}

/**
 * Sanitizes phone numbers into the format OpenWA expects (e.g. 91XXXXXXXXXX@c.us)
 */
export function formatWhatsAppChatId(phone: string): string {
  let cleanNumber = phone.replace(/\D/g, '');

  if (cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }

  return `${cleanNumber}@c.us`;
}

/**
 * Internal fetch wrapper for OpenWA API calls
 */
async function openwaFetch(path: string, options: RequestInit = {}): Promise<any> {
  let resolvedPath = path;
  const sessionName = await getActiveSessionName();
  const placeholder = `/api/sessions/${OPENWA_SESSION_NAME}`;
  
  if (path.includes(placeholder)) {
    const sessionId = await getSessionId();
    resolvedPath = path.replace(placeholder, `/api/sessions/${sessionId}`);
  }

  const url = `${OPENWA_API_URL}${resolvedPath}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(OPENWA_API_KEY ? { 'X-API-Key': OPENWA_API_KEY } : {}),
    ...(options.headers as Record<string, string> || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('image/')) {
      const buffer = await response.arrayBuffer();
      return { ok: response.ok, status: response.status, contentType, buffer };
    }

    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    return { ok: response.ok, status: response.status, data };
  } catch (error: any) {
    console.error(`[WhatsApp Service] Fetch error at path ${path} (resolved: ${resolvedPath}):`, error.message || error);
    return { ok: false, status: 500, data: error.message || 'Fetch error' };
  }
}

/**
 * Fetches status of the WhatsApp session
 */
export async function getSessionStatus(): Promise<{ connected: boolean; status: any; phone?: string | null }> {
  const sessionName = await getActiveSessionName();
  if (disconnectedSessions.has(sessionName)) {
    const lastPhone = await getSetting('whatsapp_connected_phone');
    return { connected: false, status: 'DISCONNECTED', phone: lastPhone };
  }

  const url = `${OPENWA_API_URL}/api/sessions`;
  const headers = {
    'Content-Type': 'application/json',
    ...(OPENWA_API_KEY ? { 'X-API-Key': OPENWA_API_KEY } : {})
  };

  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const sessions = await response.json();
      const session = sessions.find((s: any) => s.name === sessionName || s.id === sessionName);
      if (session) {
        const connected = ['ready', 'connected', 'authenticated'].includes(session.status?.toLowerCase());
        cachedSessionIds[sessionName] = session.id;
        
        if (connected && session.phone) {
          await saveSetting('whatsapp_connected_phone', session.phone);
        }
        
        const displayPhone = session.phone || await getSetting('whatsapp_connected_phone');
        return { connected, status: session.status, phone: displayPhone };
      }
    }
  } catch (error: any) {
    console.error('[WhatsApp Service] Status fetch error:', error.message || error);
  }
  
  const lastPhone = await getSetting('whatsapp_connected_phone');
  return { connected: false, status: 'DISCONNECTED', phone: lastPhone };
}

/**
 * Fetches QR code of the session
 */
export async function getSessionQR(): Promise<any> {
  const sessionName = await getActiveSessionName();
  // Clear disconnected flag since user is trying to connect
  disconnectedSessions.delete(sessionName);

  let statusCheck = await getSessionStatus();
  
  // If already connected, no QR needed
  if (statusCheck.connected) {
    return { ok: false, status: 200, data: { alreadyConnected: true, message: 'Session is already connected. No QR code needed.' } };
  }
  
  // Start session if not started
  if (statusCheck.status === 'NOT_FOUND' || statusCheck.status === 'stopped' || statusCheck.status === 'DISCONNECTED' || statusCheck.status === 'created') {
    console.log(`[WhatsApp Service] Session inactive during QR fetch. Starting session first...`);
    await startSession();
  }

  // Poll status up to 15 times (15 seconds total) waiting for initialization
  for (let i = 0; i < 15; i++) {
    statusCheck = await getSessionStatus();
    console.log(`[WhatsApp Service] Polling status during QR fetch: ${statusCheck.status} (attempt ${i + 1}/15)`);
    
    if (statusCheck.connected) {
      return { ok: false, status: 200, data: { alreadyConnected: true, message: 'Session connected automatically. No QR code needed.' } };
    }
    
    if (statusCheck.status === 'qr_ready') {
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/qr`);
}

/**
 * Starts or restarts the WhatsApp session
 */
export async function startSession(): Promise<{ success: boolean; data?: any; error?: string }> {
  const sessionName = await getActiveSessionName();
  // Clear disconnected flag — user is explicitly starting
  disconnectedSessions.delete(sessionName);
  
  // Ensure the session exists in OpenWA before starting it
  await getSessionId(true);
  
  const res = await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/start`, { method: 'POST' });
  if (res.ok) {
    return { success: true, data: res.data };
  }
  
  // Handle case where session is already started on the gateway
  if (res.status === 400 && (res.data?.message?.toLowerCase().includes('already started') || String(res.data).toLowerCase().includes('already started'))) {
    console.log(`[WhatsApp Service] Session "${sessionName}" is already started.`);
    return { success: true, data: res.data };
  }
  
  return { success: false, error: res.data || 'Failed to start session' };
}

/**
 * Gets all saved templates
 */
export async function getTemplates(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const [rows]: any = await pool.execute('SELECT * FROM whatsapp_templates ORDER BY created_at ASC');
    return { success: true, data: rows };
  } catch (err: any) {
    console.error('[WhatsApp Service] Error getting local templates:', err.message || err);
    return { success: false, error: err.message || 'Failed to get templates' };
  }
}

/**
 * Automatically creates default templates (Phase-Complete and Phase-Complete-Payment)
 * locally and in the active session if they don't already exist.
 */
export async function ensureDefaultTemplates(): Promise<void> {
  try {
    // 1. Check if default templates exist locally in our MySQL DB
    const [rows]: any = await pool.execute('SELECT * FROM whatsapp_templates');
    const localTemplates = rows || [];
    
    const hasComplete = localTemplates.some((t: any) => t.name === 'Phase-Complete');
    const hasPayment = localTemplates.some((t: any) => t.name === 'Phase-Complete-Payment');

    if (!hasComplete) {
      console.log('[WhatsApp Service] Pre-seeding default template Phase-Complete locally...');
      const id = randomUUID();
      await pool.execute(
        'INSERT INTO whatsapp_templates (id, name, header, body, footer) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          'Phase-Complete',
          'Hello {{Customer}},',
          'Your installation for *{{Address}}* has been updated.\n\n✅ *Phase Completed:* {{phase}}\n👷 *Technician:* {{technician}}\n\nThis phase has been completed successfully by our team.\n\nIf you have any questions or notice anything pending, simply reply to this message. We\'ll be happy to assist you.',
          'Thank you for choosing Satguru Engineers. 🙏'
        ]
      );
    }

    if (!hasPayment) {
      console.log('[WhatsApp Service] Pre-seeding default template Phase-Complete-Payment locally...');
      const id = randomUUID();
      await pool.execute(
        'INSERT INTO whatsapp_templates (id, name, header, body, footer) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          'Phase-Complete-Payment',
          'Hello {{customer}},',
          'Your installation for *{{Adress}}* has been updated.\n\n✅ *Phase Completed:* {{phase}}\n👤 *Technician:* {{technician}}\n\nAn outstanding payment amount of *₹{{outstanding}}* is pending for this phase. Please arrange to clear it.',
          'Thank you for choosing Satguru Engineers. 🙏'
        ]
      );
    }

    // 2. Fetch all templates locally again
    const [updatedLocalRows]: any = await pool.execute('SELECT * FROM whatsapp_templates');
    const finalLocalTemplates = updatedLocalRows || [];

    // 3. Fetch templates registered on OpenWA gateway session
    const openwaRes = await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/templates`);
    if (!openwaRes.ok) {
      console.warn('[WhatsApp Service] Could not fetch OpenWA templates for syncing (session might be offline).');
      return;
    }

    const openwaTemplates = openwaRes.data || [];
    
    // 4. Register any local template that is missing from the OpenWA gateway session
    for (const localT of finalLocalTemplates) {
      const existsInOpenwa = openwaTemplates.some((t: any) => t.name === localT.name);
      if (!existsInOpenwa) {
        console.log(`[WhatsApp Service] Syncing template "${localT.name}" to OpenWA session...`);
        try {
          await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/templates`, {
            method: 'POST',
            body: JSON.stringify({
              name: localT.name,
              header: localT.header,
              body: localT.body,
              footer: localT.footer
            })
          });
        } catch (syncErr: any) {
          console.error(`[WhatsApp Service] Failed to sync template "${localT.name}" to OpenWA:`, syncErr.message || syncErr);
        }
      }
    }
  } catch (err: any) {
    console.error('[WhatsApp Service] Error syncing/pre-seeding templates:', err.message || err);
  }
}

/**
 * Helper to find the generated OpenWA template ID by its name
 */
async function getOpenwaTemplateIdByName(templateName: string): Promise<string | null> {
  try {
    const openwaRes = await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/templates`);
    if (openwaRes.ok && Array.isArray(openwaRes.data)) {
      const found = openwaRes.data.find((t: any) => t.name === templateName);
      if (found && found.id) {
        return found.id;
      }
    }
  } catch (err: any) {
    console.warn('[WhatsApp Service] Error mapping template name to OpenWA ID:', err.message || err);
  }
  return null;
}

/**
 * Creates a template
 */
export async function createTemplate(template: { name: string; header?: string; body: string; footer?: string }): Promise<{ success: boolean; data?: any; error?: string }> {
  const id = randomUUID();
  try {
    await pool.execute(
      'INSERT INTO whatsapp_templates (id, name, header, body, footer) VALUES (?, ?, ?, ?, ?)',
      [id, template.name, template.header || null, template.body, template.footer || null]
    );
    
    // Try to push to OpenWA session (without id, so OpenWA generates it)
    try {
      await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/templates`, {
        method: 'POST',
        body: JSON.stringify(template)
      });
    } catch (openwaErr: any) {
      console.warn('[WhatsApp Service] Template saved locally, but failed to push to OpenWA:', openwaErr.message || openwaErr);
    }

    return { success: true, data: { id, ...template } };
  } catch (err: any) {
    console.error('[WhatsApp Service] Error creating local template:', err.message || err);
    return { success: false, error: err.message || 'Failed to create template' };
  }
}

/**
 * Updates a template
 */
export async function updateTemplate(idOrName: string, template: { header?: string; body: string; footer?: string }): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Lookup first to find the record
    const [rows]: any = await pool.execute(
      'SELECT * FROM whatsapp_templates WHERE id = ? OR name = ?',
      [idOrName, idOrName]
    );
    if (rows.length === 0) {
      return { success: false, error: 'Template not found' };
    }
    const dbTemplate = rows[0];

    await pool.execute(
      'UPDATE whatsapp_templates SET header = ?, body = ?, footer = ? WHERE id = ?',
      [template.header || null, template.body, template.footer || null, dbTemplate.id]
    );

    // Try to update in OpenWA session using resolved OpenWA template ID
    try {
      const openwaId = await getOpenwaTemplateIdByName(dbTemplate.name);
      if (openwaId) {
        await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/templates/${openwaId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: dbTemplate.name, ...template })
        });
      } else {
        // Fallback: create if missing
        await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/templates`, {
          method: 'POST',
          body: JSON.stringify({ name: dbTemplate.name, ...template })
        });
      }
    } catch (openwaErr: any) {
      console.warn('[WhatsApp Service] Template updated locally, but failed to sync to OpenWA:', openwaErr.message || openwaErr);
    }

    return { success: true, data: { id: dbTemplate.id, name: dbTemplate.name, ...template } };
  } catch (err: any) {
    console.error('[WhatsApp Service] Error updating local template:', err.message || err);
    return { success: false, error: err.message || 'Failed to update template' };
  }
}

/**
 * Deletes a template
 */
export async function deleteTemplate(idOrName: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Lookup first
    const [rows]: any = await pool.execute(
      'SELECT * FROM whatsapp_templates WHERE id = ? OR name = ?',
      [idOrName, idOrName]
    );
    if (rows.length === 0) {
      return { success: false, error: 'Template not found' };
    }
    const dbTemplate = rows[0];

    await pool.execute('DELETE FROM whatsapp_templates WHERE id = ?', [dbTemplate.id]);

    // Try to delete from OpenWA session using resolved OpenWA template ID
    try {
      const openwaId = await getOpenwaTemplateIdByName(dbTemplate.name);
      if (openwaId) {
        await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/templates/${openwaId}`, {
          method: 'DELETE'
        });
      }
    } catch (openwaErr: any) {
      console.warn('[WhatsApp Service] Template deleted locally, but failed to delete in OpenWA:', openwaErr.message || openwaErr);
    }

    return { success: true, data: { id: dbTemplate.id } };
  } catch (err: any) {
    console.error('[WhatsApp Service] Error deleting local template:', err.message || err);
    return { success: false, error: err.message || 'Failed to delete template' };
  }
}

/**
 * Sends a WhatsApp message via OpenWA send-template endpoint
 */
export async function sendWhatsAppNotification(payload: WhatsAppTemplatePayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!OPENWA_API_KEY) {
    console.error('[WhatsApp Service] Aborting: OPENWA_API_KEY is not configured.');
    return { success: false, error: 'WhatsApp Gateway API key missing' };
  }

  // Ensure default templates are seeded before attempting to send
  await ensureDefaultTemplates();

  // Check if session was connected recently to avoid initial history sync congestion
  try {
    const url = `${OPENWA_API_URL}/api/sessions`;
    const headers = {
      'Content-Type': 'application/json',
      ...(OPENWA_API_KEY ? { 'X-API-Key': OPENWA_API_KEY } : {})
    };
    const response = await fetch(url, { headers });
    if (response.ok) {
      const sessions = await response.json();
      const sessionName = await getActiveSessionName();
      const session = sessions.find((s: any) => s.name === sessionName || s.id === sessionName);
      if (session && session.connectedAt) {
        const connectedTime = new Date(session.connectedAt).getTime();
        const elapsed = Date.now() - connectedTime;
        const minimumSyncBuffer = 45000; // 45 seconds
        if (elapsed > 0 && elapsed < minimumSyncBuffer) {
          const delayTime = minimumSyncBuffer - elapsed;
          console.log(`[WhatsApp Service] Session connected recently (${Math.round(elapsed / 1000)}s ago). Delaying message send by ${Math.round(delayTime / 1000)}s to ensure initial chat sync is complete.`);
          await new Promise(resolve => setTimeout(resolve, delayTime));
        }
      }
    }
  } catch (err: any) {
    console.warn('[WhatsApp Service] Pre-send connection age check failed:', err.message || err);
  }

  const endpoint = `/api/sessions/${OPENWA_SESSION_NAME}/messages/send-template`;
  const res = await openwaFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (res.ok && res.data) {
    console.log('[WhatsApp Service] Notification sent successfully:', res.data.messageId);
    return { success: true, messageId: res.data.messageId };
  }
  
  console.error('[WhatsApp Service] OpenWA error:', res.data);
  return { success: false, error: (res.data && res.data.message) || 'Gateway API error' };
}

/**
 * Clears the Baileys auth files on the remote OpenWA server via SSH.
 * This ensures the next session will require a fresh QR code scan.
 */
async function clearRemoteAuthFiles(): Promise<void> {
  if (!OPENWA_SSH_KEY || !OPENWA_SSH_HOST) {
    return;
  }

  const sessionName = await getActiveSessionName();
  const sshCmd = `ssh -i "${OPENWA_SSH_KEY}" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${OPENWA_SSH_USER}@${OPENWA_SSH_HOST} "docker exec ${OPENWA_DOCKER_CONTAINER} rm -rf /app/data/baileys/${sessionName} 2>/dev/null; echo CLEARED"`;

  try {
    const { stdout, stderr } = await execAsync(sshCmd, { timeout: 20000 });
    if (stdout.includes('CLEARED')) {
      console.log('[WhatsApp Service] Remote auth files cleared successfully.');
    } else {
      console.warn('[WhatsApp Service] Remote auth clear output:', stdout, stderr);
    }
  } catch (err: any) {
    console.error('[WhatsApp Service] Failed to clear remote auth files:', err.message || err);
  }
}

export async function disconnectSession(clearSessionName = false): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionName = await getActiveSessionName();
    const sessionId = await getSessionId(false);
    
    // 1. Try to stop the session first (triggers logout from WhatsApp Web)
    await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}/stop`, { method: 'POST' });
    
    // 2. Clear the Baileys auth files on the remote server so next connect requires fresh QR
    await clearRemoteAuthFiles();
    
    // 3. Delete the session from OpenWA database
    const res = await openwaFetch(`/api/sessions/${OPENWA_SESSION_NAME}`, { method: 'DELETE' });
    
    // 4. Clear cache and mark as intentionally disconnected
    delete cachedSessionIds[sessionName];
    disconnectedSessions.add(sessionName);
    
    // Clear connected phone and session name from DB cache
    await saveSetting('whatsapp_connected_phone', '');
    if (clearSessionName) {
      await saveSetting('whatsapp_session_name', '');
    }
    
    console.log('[WhatsApp Service] Session disconnected and auth cleared. Flag set to prevent auto-reconnection.');
    
    if (res.ok || res.status === 404) {
      return { success: true };
    }
    return { success: false, error: res.data || 'Failed to delete session' };
  } catch (err: any) {
    console.error('[WhatsApp Service] Disconnect error:', err.message || err);
    const sessionName = await getActiveSessionName();
    disconnectedSessions.add(sessionName);
    delete cachedSessionIds[sessionName];
    // Clear connected phone and session name from DB cache on failure/error as well
    await saveSetting('whatsapp_connected_phone', '');
    if (clearSessionName) {
      await saveSetting('whatsapp_session_name', '');
    }
    return { success: false, error: err.message || 'Disconnect error' };
  }
}

/**
 * Resolves the final WhatsApp template name and builds template variables.
 */
function resolveTemplatePayload(
  phaseName: string,
  jobType: string,
  costs: { copperPipingCost: number; outdoorFittingCost: number; commissioningCost: number },
  customerName: string,
  customerAddress: string | null | undefined,
  customerPhone: string,
  technician: string | null | undefined,
  whatsappTemplate: string | null | undefined,
  customPaymentAmount: string | number | null | undefined,
  customDate: string | null | undefined,
  customTxt: string | null | undefined
): { chatId: string; templateName: string; vars: Record<string, string> } {
  const { isPaymentPhase, amount: phaseAmt } = getPaymentPhaseAmount(phaseName, jobType, costs);

  const paymentAmount = customPaymentAmount !== undefined && customPaymentAmount !== null && Number(customPaymentAmount) >= 0 
    ? Number(customPaymentAmount) 
    : (phaseAmt || 0);

  let usePaymentTemplate = isPaymentPhase && paymentAmount > 0;
  if (whatsappTemplate === 'Phase-Complete-Payment' || whatsappTemplate === 'Phases-Complete-Payment') {
    usePaymentTemplate = true;
  } else if (whatsappTemplate === 'Phase-Complete' || whatsappTemplate === 'Phases-Complete') {
    usePaymentTemplate = false;
  }

  const finalTemplateName = (whatsappTemplate && whatsappTemplate !== 'Phase-Complete' && whatsappTemplate !== 'Phase-Complete-Payment' && whatsappTemplate !== 'Phases-Complete' && whatsappTemplate !== 'Phases-Complete-Payment')
    ? whatsappTemplate
    : (usePaymentTemplate ? 'Phase-Complete-Payment' : 'Phase-Complete');

  return {
    chatId: formatWhatsAppChatId(customerPhone),
    templateName: finalTemplateName,
    vars: {
      customer: customerName,
      Customer: customerName,
      Adress: customerAddress || 'Customer Address',
      Address: customerAddress || 'Customer Address',
      phase: cleanPhaseName(phaseName),
      technician: technician ? technician.split('@')[0] : 'Assigned Technician',
      outstanding: String(paymentAmount),
      date: customDate || '',
      Date: customDate || '',
      txt: customTxt || '',
      Txt: customTxt || ''
    }
  };
}

interface PhaseDispatchPayload {
  connection: any;
  phaseId: number;
  isCompleted: boolean;
  silentComplete: boolean;
  sendWhatsApp: boolean;
  whatsappTemplate?: string | null;
  customPaymentAmount?: string | number | null;
  customDate?: string | null;
  customTxt?: string | null;
  customerPhone?: string | null;
  customerName: string;
  customerAddress?: string | null;
  phaseName: string;
  jobType: string;
  technician?: string | null;
  copperPipingCost?: string | number | null;
  outdoorFittingCost?: string | number | null;
  commissioningCost?: string | number | null;
}

/**
 * Handles the WhatsApp side-effect when updating/completing a phase.
 * All DB updates and WhatsApp API calls for the phase are isolated here.
 */
export async function handleWhatsAppPhaseDispatch(payload: PhaseDispatchPayload): Promise<{ success: boolean; error?: string } | null> {
  const {
    connection,
    phaseId,
    isCompleted,
    silentComplete,
    sendWhatsApp,
    whatsappTemplate,
    customPaymentAmount,
    customDate,
    customTxt,
    customerPhone,
    customerName,
    customerAddress,
    phaseName,
    jobType,
    technician,
    copperPipingCost,
    outdoorFittingCost,
    commissioningCost
  } = payload;

  if (!isCompleted) {
    await connection.execute('UPDATE job_phases SET whatsapp_status = NULL WHERE id = ?', [phaseId]);
    return null;
  }

  if (sendWhatsApp && customerPhone) {
    try {
      const waPayload = resolveTemplatePayload(
        phaseName, jobType,
        { copperPipingCost: Number(copperPipingCost || 0), outdoorFittingCost: Number(outdoorFittingCost || 0), commissioningCost: Number(commissioningCost || 0) },
        customerName, customerAddress, customerPhone, technician,
        whatsappTemplate, customPaymentAmount, customDate, customTxt
      );

      const waResult = await sendWhatsAppNotification(waPayload);

      const waStatus = waResult.success ? 'sent' : 'failed';
      await connection.execute(
        'UPDATE job_phases SET whatsapp_status = ?, whatsapp_message_id = ? WHERE id = ?',
        [waStatus, waResult.messageId || null, phaseId]
      );

      if (!waResult.success) {
        return { success: false, error: waResult.error };
      }
      return { success: true };
    } catch (waErr: any) {
      await connection.execute('UPDATE job_phases SET whatsapp_status = "failed" WHERE id = ?', [phaseId]);
      return { success: false, error: waErr.message };
    }
  } else if (!silentComplete) {
    await connection.execute('UPDATE job_phases SET whatsapp_status = "skipped" WHERE id = ?', [phaseId]);
  }

  return null;
}

interface DirectSendPayload {
  phaseId: number;
  whatsappTemplate?: string | null;
  customPaymentAmount?: string | number | null;
  customDate?: string | null;
  customTxt?: string | null;
}

/**
 * Handles sending/resending a WhatsApp message for an already completed phase.
 */
export async function handleWhatsAppDirectSend(payload: DirectSendPayload): Promise<{ success: boolean; whatsappSent: boolean; error?: string; whatsappError?: string }> {
  const { phaseId, whatsappTemplate, customPaymentAmount, customDate, customTxt } = payload;

  const [[details]]: any = await pool.execute(`
    SELECT 
      c.phone as customerPhone,
      c.address as customerAddress,
      c.name as customerName, 
      j.id as jobId, 
      j.job_type as jobType, 
      u.email as technician, 
      j.payment_status as paymentStatus,
      j.copper_piping_cost as copperPipingCost,
      j.outdoor_fitting_cost as outdoorFittingCost,
      j.commissioning_cost as commissioningCost,
      jp.phase_name as phaseName,
      jp.is_completed as isCompleted
    FROM job_phases jp
    JOIN jobs j ON jp.job_id = j.id
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN users u ON j.technician_id = u.id
    WHERE jp.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
  `, [phaseId]);

  if (!details) throw new Error('Phase not found');
  if (!details.isCompleted) throw new Error('Phase is not yet completed');
  if (!details.customerPhone) throw new Error('Customer phone number not available');

  const waPayload = resolveTemplatePayload(
    details.phaseName, details.jobType,
    { copperPipingCost: Number(details.copperPipingCost), outdoorFittingCost: Number(details.outdoorFittingCost), commissioningCost: Number(details.commissioningCost) },
    details.customerName, details.customerAddress, details.customerPhone, details.technician,
    whatsappTemplate, customPaymentAmount, customDate, customTxt
  );

  const waResult = await sendWhatsAppNotification(waPayload);

  const waStatus = waResult.success ? 'sent' : 'failed';
  await pool.execute('UPDATE job_phases SET whatsapp_status = ?, whatsapp_message_id = ? WHERE id = ?', [waStatus, waResult.messageId || null, phaseId]);
  
  return { success: true, whatsappSent: waResult.success, error: waResult.error, whatsappError: waResult.error };
}

/**
 * Sends a plain text WhatsApp message via OpenWA send-text endpoint
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!OPENWA_API_KEY) {
    console.error('[WhatsApp Service] Aborting: OPENWA_API_KEY is not configured.');
    return { success: false, error: 'WhatsApp Gateway API key missing' };
  }

  const formattedPhone = formatWhatsAppChatId(phone);
  const endpoint = `/api/sessions/${OPENWA_SESSION_NAME}/messages/send-text`;
  const res = await openwaFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      chatId: formattedPhone,
      text: text
    })
  });

  if (res.ok && res.data) {
    console.log('[WhatsApp Service] Text message sent successfully:', res.data.messageId);
    return { success: true, messageId: res.data.messageId };
  }
  
  console.error('[WhatsApp Service] OpenWA error sending text:', res.data);
  return { success: false, error: (res.data && res.data.message) || 'Gateway API error' };
}
