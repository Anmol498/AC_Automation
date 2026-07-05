import express from 'express';
import { authenticateToken, isSuperAdmin } from '../middleware/auth.js';
import pool from '../config/db.js';
import { broadcast } from '../utils/sse.js';
import {
  getSessionStatus,
  getSessionQR,
  startSession,
  disconnectSession,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  ensureDefaultTemplates
} from '../utils/whatsappHelper.js';

const router = express.Router();

// Get session status
router.get('/whatsapp/status', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const statusData = await getSessionStatus();
    res.json(statusData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get session QR Code image
router.get('/whatsapp/qr', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const qrRes = await getSessionQR();
    
    // 1. Raw buffer returned directly (e.g. from some engine configurations)
    if (qrRes.ok && qrRes.buffer) {
      res.setHeader('Content-Type', qrRes.contentType || 'image/png');
      return res.send(Buffer.from(qrRes.buffer));
    }
    
    // 2. Base64 JSON format (e.g. from Baileys adapter)
    if (qrRes.ok && qrRes.data?.qrCode) {
      const base64Data = qrRes.data.qrCode.includes(',') 
        ? qrRes.data.qrCode.split(',')[1] 
        : qrRes.data.qrCode;
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.send(buffer);
    }
    
    // Handle "already connected" case gracefully
    if (qrRes.data?.alreadyConnected) {
      return res.json({ alreadyConnected: true, message: qrRes.data.message });
    }
    
    res.status(qrRes.status || 500).json({ error: qrRes.data || 'Failed to retrieve QR code' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start/restart WhatsApp session
router.post('/whatsapp/session/start', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const startRes = await startSession();
    if (startRes.success) {
      res.json(startRes);
    } else {
      res.status(500).json({ error: startRes.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect/reset WhatsApp session
router.post('/whatsapp/session/disconnect', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { clearSessionName } = req.body;
    const disconnectRes = await disconnectSession(!!clearSessionName);
    if (disconnectRes.success) {
      res.json(disconnectRes);
    } else {
      res.status(500).json({ error: disconnectRes.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all templates
router.get('/whatsapp/templates', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    // Automatically sync/seed templates to the active session when visiting this view
    try {
      await ensureDefaultTemplates();
    } catch (syncErr) {
      console.warn('[WhatsApp Service] Background template sync failed:', syncErr);
    }

    const templatesRes = await getTemplates();
    if (templatesRes.success) {
      res.json(templatesRes.data || []);
    } else {
      // Return empty array instead of failing, to avoid UI crashing
      res.json([]);
    }
  } catch (err: any) {
    res.json([]);
  }
});

// Create template
router.post('/whatsapp/templates', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const createRes = await createTemplate(req.body);
    if (createRes.success) {
      res.json(createRes);
    } else {
      res.status(400).json({ error: createRes.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
router.put('/whatsapp/templates/:idOrName', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const updateRes = await updateTemplate(req.params.idOrName as string, req.body);
    if (updateRes.success) {
      res.json(updateRes);
    } else {
      const errMsg = typeof updateRes.error === 'object' ? ((updateRes.error as any).message || JSON.stringify(updateRes.error)) : updateRes.error;
      res.status(400).json({ error: errMsg || 'Failed to update template' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template
router.delete('/whatsapp/templates/:idOrName', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const deleteRes = await deleteTemplate(req.params.idOrName as string);
    if (deleteRes.success) {
      res.json(deleteRes);
    } else {
      const errMsg = typeof deleteRes.error === 'object' ? ((deleteRes.error as any).message || JSON.stringify(deleteRes.error)) : deleteRes.error;
      res.status(400).json({ error: errMsg || 'Failed to delete template' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook for WhatsApp status acknowledgements (ack events)
router.post('/whatsapp/webhook', async (req, res) => {
  const payload = req.body;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[WhatsApp Webhook] Received webhook event:', JSON.stringify(payload, null, 2));
  } else {
    console.log('[WhatsApp Webhook] Received webhook event:', payload.event || 'no-event');
  }

  // 1. Extract message ID and ack status from various possible payload formats
  let messageId: string | undefined = undefined;
  let ack: number | string | undefined = undefined;

  // Format A: { event: "message.ack", data: { id: "...", ack: 3 } }
  if (payload.event === 'message.ack' && payload.data) {
    messageId = payload.data.id || payload.data.messageId;
    ack = payload.data.ack;
  }
  // Format B: { event: "message.ack", id: "...", ack: 3 }
  else if (payload.event === 'message.ack') {
    messageId = payload.id || payload.messageId;
    ack = payload.ack;
  }
  // Format C: Direct ack object { ack: { id: "...", status: 3 } }
  else if (payload.ack) {
    messageId = payload.ack.id || payload.ack.messageId;
    ack = payload.ack.status || payload.ack.ack;
  }
  // Format D: Flat body { id: "...", ack: 3 } or { messageId: "...", status: 3 }
  else {
    messageId = payload.id || payload.messageId;
    ack = payload.ack || payload.status;
  }

  if (!messageId || ack === undefined) {
    // Return 200 to acknowledge receipt of other events (like message.received) but skip processing
    return res.status(200).json({ success: true, message: 'Skipped - not an ack event or missing fields' });
  }

  try {
    // Map numerical or string ack status to our database status string:
    // 1 = sent, 2 = delivered, 3 = read
    let statusString: 'sent' | 'delivered' | 'read' | null = null;
    
    if (ack === 1 || ack === 'sent') {
      statusString = 'sent';
    } else if (ack === 2 || ack === 'delivered') {
      statusString = 'delivered';
    } else if (ack === 3 || ack === 'read') {
      statusString = 'read';
    }

    if (!statusString) {
      return res.status(200).json({ success: true, message: `Skipped - unhandled ack status: ${ack}` });
    }

    const shortId = messageId.includes('_') ? messageId.split('_').pop() : messageId;

    console.log(`[WhatsApp Webhook] Updating message ID "${messageId}" (short ID: "${shortId}") to status "${statusString}"`);

    // Update job_phases table where whatsapp_message_id matches either the full or short ID
    const [result]: any = await pool.execute(
      'UPDATE job_phases SET whatsapp_status = ? WHERE whatsapp_message_id = ? OR whatsapp_message_id = ?',
      [statusString, messageId, shortId]
    );

    if (result.affectedRows > 0) {
      console.log(`[WhatsApp Webhook] Successfully updated ${result.affectedRows} phase status to "${statusString}"`);
      
      // Trigger realtime dashboard updates for all listening clients via SSE
      broadcast('jobs');
    } else {
      console.warn(`[WhatsApp Webhook] No matching phase found for whatsapp_message_id "${messageId}" or "${shortId}"`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err: any) {
    console.error('[WhatsApp Webhook] Error processing webhook:', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
