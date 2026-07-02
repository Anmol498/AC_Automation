import express from 'express';
import pool from '../config/db.js';
import { validate } from '../middleware/validate.js';
import {
  jobSchema,
  paymentStatusSchema,
  costsSchema,
  paymentSchema,
  updatePhaseSchema
} from '../schemas/job.js';
import {
  authenticateToken,
  isAdminOrSuperAdmin,
  isSuperAdmin
} from '../middleware/auth.js';
import {
  sendPhaseNotification,
  buildEmailLayout,
  buildPaymentBlock,
  buildCompletionBlock,
  getFromEmail,
  escapeHtml,
  INSTALLATION_PHASES,
  SERVICE_PHASES,
  getPaymentPhaseAmount,
  cleanPhaseName
} from '../utils/emailHelper.js';
import { handleWhatsAppPhaseDispatch, handleWhatsAppDirectSend } from '../utils/whatsappHelper.js';
import { sendEmail } from '../utils/mailer.js';

const router = express.Router();

router.get('/technicians', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT email FROM users WHERE role = "technician"');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [[{ count: customers }]]: any = await pool.execute('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL');
    let activeQuery = 'SELECT COUNT(*) as count FROM jobs WHERE status = "Ongoing" AND deleted_at IS NULL';
    let completedQuery = 'SELECT COUNT(*) as count FROM jobs WHERE status = "Completed" AND deleted_at IS NULL';
    let params = [];

    if (req.user.role === 'technician') {
      activeQuery += ' AND technician_id = ?';
      completedQuery += ' AND technician_id = ?';
      params.push(req.user.id);

      const [[{ count: activeJobs }]]: any = await pool.execute(activeQuery, params);
      const [[{ count: completedJobs }]]: any = await pool.execute(completedQuery, params);
      return res.json({ activeJobs, completedJobs, health: '100%' });
    }

    const [[{ count: activeJobs }]]: any = await pool.execute(activeQuery);
    const [[{ count: completedJobs }]]: any = await pool.execute(completedQuery);
    
    // Fetch user counts grouped by role
    const [userRows]: any = await pool.execute('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const userCounts = { admin: 0, superadmin: 0, technician: 0 };
    userRows.forEach((row: any) => {
      if (row.role in userCounts) {
        userCounts[row.role as keyof typeof userCounts] = Number(row.count);
      }
    });

    // Fetch monthly collected revenue (payments received per month over last 24 months)
    const [paymentsCollected]: any = await pool.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month, 
        SUM(amount) as collected
      FROM payments
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    // Fetch monthly estimated revenue split (jobs created/started per month over last 24 months)
    const [jobsRevenue]: any = await pool.execute(`
      SELECT 
        DATE_FORMAT(j.start_date, '%Y-%m') as month,
        SUM(j.total_cost) as estimated,
        SUM(COALESCE(jcs.total_received, 0)) as received,
        SUM(COALESCE(jcs.balance_due, 0)) as outstanding
      FROM jobs j
      LEFT JOIN job_cost_summary jcs ON jcs.job_id = j.id
      WHERE j.start_date >= DATE_SUB(NOW(), INTERVAL 24 MONTH) AND j.deleted_at IS NULL
      GROUP BY month
      ORDER BY month ASC
    `);

    // Generate last 24 months list (from 23 months ago to current month)
    const revenueStats = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // avoid month overflow issues (e.g. if today is 31st)
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7); // "YYYY-MM"
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); // "Jun 26"
      revenueStats.push({ month: monthStr, label, collected: 0, estimated: 0, received: 0, outstanding: 0 });
    }

    // Merge payments data
    paymentsCollected.forEach((row: any) => {
      const match = revenueStats.find(m => m.month === row.month);
      if (match) {
        match.collected = Number(row.collected || 0);
      }
    });

    // Merge jobs revenue data
    jobsRevenue.forEach((row: any) => {
      const match = revenueStats.find(m => m.month === row.month);
      if (match) {
        match.estimated = Number(row.estimated || 0);
        match.received = Number(row.received || 0);
        match.outstanding = Number(row.outstanding || 0);
      }
    });

    res.json({ customers, activeJobs, completedJobs, userCounts, revenueStats, health: '100%' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs', authenticateToken, async (req, res) => {
  const { search, customerId } = req.query;
  try {
    let query = `
      SELECT 
        j.id, 
        j.customer_id AS customerId, 
        j.job_type AS jobType, 
        j.start_date AS startDate, 
        u.email AS technician, 
        j.status, 
        j.payment_status AS paymentStatus,
        j.total_cost AS totalCost,
        j.created_at AS createdAt,
        c.name as customerName,
        c.address as customerAddress,
        jcs.total_received AS totalPaid,
        jcs.total_received AS totalReceived,
        jcs.balance_due AS balanceDue,
        jcs.net_copper_feet_used AS netCopperFeetUsed,
        (SELECT phase_name FROM job_phases WHERE job_id = j.id AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1) as currentPhase
      FROM jobs j 
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.technician_id = u.id
      LEFT JOIN job_cost_summary jcs ON jcs.job_id = j.id
      WHERE j.deleted_at IS NULL AND c.deleted_at IS NULL
    `;

    const params = [];
    let whereClauses = [];

    if (req.user.role === 'technician') {
      whereClauses.push('j.technician_id = ?');
      params.push(req.user.id);
    }

    if (customerId) {
      whereClauses.push('j.customer_id = ?');
      params.push(customerId);
    }

    if (search) {
      whereClauses.push('(c.name LIKE ? OR u.email LIKE ? OR j.job_type LIKE ? OR c.address LIKE ?)');
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal, searchVal);
    }

    if (whereClauses.length > 0) {
      query += ` AND ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY j.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/jobs', authenticateToken, validate(jobSchema), async (req, res) => {
  const {
    customerId,
    jobType,
    technician,
    startDate,
    paymentStatus,
    copperPipingCost = 0,
    outdoorFittingCost = 0,
    commissioningCost = 0,
    equipmentCost = 0
  } = req.body;

  const totalCost = Number(copperPipingCost) + Number(outdoorFittingCost) + Number(commissioningCost);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[userRow]]: any = await connection.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [technician]);
    const technicianId = userRow ? userRow.id : null;

    const [result]: any = await connection.execute(
      'INSERT INTO jobs (customer_id, job_type, technician_id, start_date, payment_status, copper_piping_cost, outdoor_fitting_cost, commissioning_cost, equipment_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [customerId, jobType, technicianId, startDate, paymentStatus || 'Pending', copperPipingCost, outdoorFittingCost, commissioningCost, equipmentCost, totalCost]
    );
    const jobId = result.insertId;

    const phasesToCreate = jobType === 'Service' ? SERVICE_PHASES : INSTALLATION_PHASES;

    for (let i = 0; i < phasesToCreate.length; i++) {
      await connection.execute(
        'INSERT INTO job_phases (job_id, phase_name, phase_order) VALUES (?, ?, ?)',
        [jobId, phasesToCreate[i], i + 1]
      );
    }
    await connection.commit();
    res.json({ id: jobId, success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.get('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT 
        j.id, 
        j.customer_id AS customerId, 
        j.job_type AS jobType, 
        j.start_date AS startDate, 
        u.email AS technician, 
        j.status, 
        j.payment_status AS paymentStatus,
        j.copper_piping_cost AS copperPipingCost,
        j.outdoor_fitting_cost AS outdoorFittingCost,
        j.commissioning_cost AS commissioningCost,
        j.equipment_cost AS equipmentCost,
        j.total_cost AS totalCost,
        j.created_at AS createdAt,
        c.name as customerName, 
        c.email as customerEmail, 
        c.phone as customerPhone, 
        c.address as customerAddress,
        c.drawing_url as drawingUrl,
        c.quotation_url as quotationUrl,
        jcs.total_received AS totalReceived,
        jcs.balance_due AS balanceDue,
        jcs.net_copper_feet_used AS netCopperFeetUsed,
        (SELECT phase_name FROM job_phases WHERE job_id = j.id AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1) as currentPhase
      FROM jobs j 
      JOIN customers c ON j.customer_id = c.id 
      LEFT JOIN users u ON j.technician_id = u.id
      LEFT JOIN job_cost_summary jcs ON jcs.job_id = j.id
      WHERE j.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
    `;

    const params = [req.params.id];

    if (req.user.role === 'technician') {
      query += ' AND j.technician_id = ?';
      params.push(req.user.id);
    }

    const [[exists]]: any = await pool.execute('SELECT id, technician_id FROM jobs WHERE id = ? AND deleted_at IS NULL', [req.params.id]);

    if (!exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (req.user.role === 'technician') {
      if (exists.technician_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. This job is assigned to another technician.' });
      }
    }

    const [[job]]: any = await pool.execute(query, params);

    if (!job) {
      return res.status(404).json({ error: 'Job details could not be retrieved' });
    }

    const [phases]: any = await pool.execute(`
      SELECT 
        id, 
        job_id AS jobId, 
        phase_name AS phaseName, 
        is_completed AS isCompleted, 
        completed_at AS completedAt, 
        phase_order AS \`order\`,
        email_status AS emailStatus,
        whatsapp_status AS whatsappStatus
      FROM job_phases 
      WHERE job_id = ? 
      ORDER BY phase_order ASC
    `, [req.params.id]);

    const mappedPhases = phases.map((p: any) => ({
      ...p,
      isCompleted: !!p.isCompleted
    }));

    res.json({ job, phases: mappedPhases });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/jobs/:id/payment', authenticateToken, isAdminOrSuperAdmin, validate(paymentStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  try {
    await pool.execute('UPDATE jobs SET payment_status = ? WHERE id = ?', [paymentStatus, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/jobs/:id/costs', authenticateToken, isAdminOrSuperAdmin, validate(costsSchema), async (req, res) => {
  const { id } = req.params;
  const { copperPipingCost, outdoorFittingCost, commissioningCost, equipmentCost } = req.body;
  
  const totalCost = Number(copperPipingCost || 0) + Number(outdoorFittingCost || 0) + Number(commissioningCost || 0);

  try {
    await pool.execute(
      'UPDATE jobs SET copper_piping_cost = ?, outdoor_fitting_cost = ?, commissioning_cost = ?, equipment_cost = ?, total_cost = ? WHERE id = ?',
      [copperPipingCost || 0, outdoorFittingCost || 0, commissioningCost || 0, equipmentCost || 0, totalCost, id]
    );
    res.json({ 
      success: true, 
      totalCost,
      copperPipingCost,
      outdoorFittingCost,
      commissioningCost,
      equipmentCost
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs/:id/payments', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.id, p.job_id AS jobId, p.amount, p.category, p.payment_method AS paymentMethod, p.notes, u.email AS recorded_by, p.recorded_by_id AS recordedById, p.created_at AS createdAt
      FROM payments p
      LEFT JOIN users u ON p.recorded_by_id = u.id
      WHERE p.job_id = ? 
      ORDER BY p.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/jobs/:id/payments', authenticateToken, isAdminOrSuperAdmin, validate(paymentSchema), async (req, res) => {
  const { id } = req.params;
  const { amount, category, paymentMethod, notes } = req.body;

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO payments (job_id, amount, category, payment_method, notes, recorded_by_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, amount, category || 'Low-Side', paymentMethod || 'Transfer', notes || '', req.user.id]
    );
    res.json({ id: result.insertId, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/payments/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM payments WHERE id = ?', [id]);
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/jobs/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('UPDATE jobs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- EMAIL PREVIEW FOR PHASE COMPLETION ---
router.get('/phases/:id/email-preview', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [[details]]: any = await pool.execute(`
      SELECT 
        c.email, 
        c.name as customerName, 
        j.id as jobId, 
        j.job_type as jobType, 
        u.email as technician, 
        j.payment_status as paymentStatus,
        j.copper_piping_cost as copperPipingCost,
        j.outdoor_fitting_cost as outdoorFittingCost,
        j.commissioning_cost as commissioningCost,
        jp.phase_name as phaseName
      FROM job_phases jp
      JOIN jobs j ON jp.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.technician_id = u.id
      WHERE jp.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
    `, [id]);

    if (!details) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    const [[{ job_id }]]: any = await pool.execute('SELECT job_id FROM job_phases WHERE id = ?', [id]);
    const [[{ total }]]: any = await pool.execute('SELECT COUNT(*) as total FROM job_phases WHERE job_id = ?', [job_id]);
    const [[{ completed }]]: any = await pool.execute('SELECT COUNT(*) as completed FROM job_phases WHERE job_id = ? AND is_completed = 1', [job_id]);
    const wouldBeFinal = (total === completed + 1);

    const { isPaymentPhase, amount: paymentAmount } = getPaymentPhaseAmount(details.phaseName, details.jobType, {
      copperPipingCost: Number(details.copperPipingCost),
      outdoorFittingCost: Number(details.outdoorFittingCost),
      commissioningCost: Number(details.commissioningCost)
    });

    const cleanedPhaseName = cleanPhaseName(details.phaseName);

    const subject = wouldBeFinal
      ? `Final Project Completion: ${cleanedPhaseName}`
      : `Update: ${cleanedPhaseName} Completed`;

    const defaultMessage = wouldBeFinal
      ? `We're pleased to inform you that your ${details.jobType} project (Job #${details.jobId}) has been fully completed. All phases have been successfully finished. Thank you for choosing Satguru Engineers!\n\nPlease let us know if anything is pending regarding the same`
      : `We're writing to let you know that a key milestone in your ${details.jobType} has been successfully completed: "${cleanedPhaseName}". Our team is dedicated to providing high-quality service.\n\nPlease let us know if anything is pending regarding the same`;

    res.json({
      to: details.email,
      customerName: details.customerName,
      subject,
      message: defaultMessage,
      phaseName: cleanedPhaseName,
      jobId: details.jobId,
      jobType: details.jobType,
      technician: details.technician,
      isFinal: wouldBeFinal,
      isPaymentPhase,
      paymentAmount: paymentAmount || 0,
      paymentStatus: details.paymentStatus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/phases/:id', authenticateToken, validate(updatePhaseSchema), async (req, res) => {
  const { id } = req.params;
  const { isCompleted, customSubject, customGreeting, customMessage, customPaymentAmount, skipEmail, sendWhatsApp, whatsappTemplate, silentComplete, customDate, customTxt } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (req.user.role === 'technician') {
      const [[jobCheck]]: any = await connection.execute(`
        SELECT j.technician_id 
        FROM jobs j 
        JOIN job_phases jp ON j.id = jp.job_id 
        WHERE jp.id = ? AND j.deleted_at IS NULL
      `, [id]);

      if (!jobCheck || jobCheck.technician_id !== req.user.id) {
        await connection.rollback();
        return res.status(403).json({ error: 'Access denied. You can only update phases for your assigned jobs.' });
      }
    }

    const completedAt = isCompleted ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    await connection.execute('UPDATE job_phases SET is_completed = ?, completed_at = ? WHERE id = ?', [isCompleted ? 1 : 0, completedAt, id]);

    if (!isCompleted) {
      await connection.execute('UPDATE job_phases SET email_status = NULL, whatsapp_status = NULL WHERE id = ?', [id]);
    } else if (skipEmail && !silentComplete) {
      await connection.execute('UPDATE job_phases SET email_status = "skipped" WHERE id = ?', [id]);
    }

    const [[{ job_id }]]: any = await connection.execute('SELECT job_id FROM job_phases WHERE id = ?', [id]);
    const [[{ total }]]: any = await connection.execute('SELECT COUNT(*) as total FROM job_phases WHERE job_id = ?', [job_id]);
    const [[{ completed }]]: any = await connection.execute('SELECT COUNT(*) as completed FROM job_phases WHERE job_id = ? AND is_completed = 1', [job_id]);

    const isFinalPhase = (total === completed);
    const newStatus = isFinalPhase ? 'Completed' : 'Ongoing';
    await connection.execute('UPDATE jobs SET status = ? WHERE id = ?', [newStatus, job_id]);

    const [[phaseInfo]]: any = await connection.execute('SELECT phase_name FROM job_phases WHERE job_id = ? AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1', [job_id]);
    const nextPhaseName = phaseInfo ? phaseInfo.phase_name : null;

    if (isCompleted) {
      const [[details]]: any = await connection.execute(`
        SELECT 
          c.email, 
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
          jp.phase_name as phaseName
        FROM job_phases jp
        JOIN jobs j ON jp.job_id = j.id
        JOIN customers c ON j.customer_id = c.id
        LEFT JOIN users u ON j.technician_id = u.id
        WHERE jp.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
      `, [id]);

      if (details) {
        const cleanedPhaseName = cleanPhaseName(details.phaseName);
        let emailResult: { success: boolean; error?: string } = { success: false };
        if (!skipEmail && !silentComplete) {
          const fromEmail = await getFromEmail(connection);

          if (customSubject || customMessage) {
            const subject = escapeHtml(customSubject || `Update: ${cleanedPhaseName} Completed`);
            const greeting = escapeHtml(customGreeting || `Hello ${details.customerName},`);
            const message = escapeHtml(customMessage || '');
            
            let paymentBlock = '';
            let amount: number | null = null;
            if (customPaymentAmount && Number(customPaymentAmount) > 0) {
              amount = Number(customPaymentAmount);
            } else {
              const { amount: phaseAmt } = getPaymentPhaseAmount(details.phaseName, details.jobType, {
                copperPipingCost: Number(details.copperPipingCost),
                outdoorFittingCost: Number(details.outdoorFittingCost),
                commissioningCost: Number(details.commissioningCost)
              });
              amount = phaseAmt;
            }

            if (amount !== null && amount > 0) {
              paymentBlock = buildPaymentBlock(cleanedPhaseName, amount, details.paymentStatus);
            }

            let completionBlock = '';
            if (isFinalPhase) {
              completionBlock = buildCompletionBlock(details.paymentStatus, 'Your system is now fully operational.');
            }

            const htmlBody = buildEmailLayout("Satguru Engineers Service Update", `
              <p>${greeting}</p>
              <p style="white-space: pre-wrap;">${message}</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #2563eb;">Phase: ${cleanedPhaseName}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Job ID: #${details.jobId} | Technician: ${details.technician}</p>
              </div>
              ${paymentBlock}
              ${completionBlock}
              <p style="margin-top: 16px; font-size: 14px; color: #64748b;">Thank you for choosing Satguru Engineers.</p>
            `);
            
            emailResult = await sendEmail(fromEmail, details.email, subject, "", htmlBody);
          } else {
            emailResult = await sendPhaseNotification(
              fromEmail,
              details.email,
              details.customerName,
              details.jobType,
              details.phaseName,
              details.jobId,
              details.technician,
              details.paymentStatus,
              isFinalPhase,
              {
                copperPipingCost: Number(details.copperPipingCost),
                outdoorFittingCost: Number(details.outdoorFittingCost),
                commissioningCost: Number(details.commissioningCost)
              }
            );
          }

          const emailStatus = emailResult.success ? 'sent' : 'failed';
          await connection.execute('UPDATE job_phases SET email_status = ? WHERE id = ?', [emailStatus, id]);
        }

        // --- WHATSAPP NOTIFICATION DISPATCH ---
        // Guard: check if WhatsApp is globally enabled
        let effectiveSendWhatsApp = !!sendWhatsApp;
        if (effectiveSendWhatsApp) {
          const [waRows]: any = await connection.execute("SELECT setting_value FROM settings WHERE setting_key = 'whatsapp_enabled'");
          const waEnabled = waRows.length === 0 || waRows[0].setting_value === 'true' || waRows[0].setting_value === '1';
          if (!waEnabled) effectiveSendWhatsApp = false;
        }

        let whatsappSent = false;
        let whatsappError = null;
        const waDispatch = await handleWhatsAppPhaseDispatch({
          connection,
          phaseId: Number(id),
          isCompleted: !!isCompleted,
          silentComplete: !!silentComplete,
          sendWhatsApp: effectiveSendWhatsApp,
          whatsappTemplate,
          customPaymentAmount,
          customDate,
          customTxt,
          customerPhone: details.customerPhone,
          customerName: details.customerName,
          customerAddress: details.customerAddress,
          phaseName: details.phaseName,
          jobType: details.jobType,
          technician: details.technician,
          copperPipingCost: details.copperPipingCost,
          outdoorFittingCost: details.outdoorFittingCost,
          commissioningCost: details.commissioningCost
        });
        if (waDispatch) {
          whatsappSent = waDispatch.success;
          whatsappError = waDispatch.error || null;
        }

        await connection.commit();
        return res.json({ 
          success: true, 
          jobStatus: newStatus, 
          currentPhase: nextPhaseName, 
          emailSent: emailResult.success,
          emailError: emailResult.error,
          whatsappSent,
          whatsappError
        });
      }
    }

    await connection.commit();
    res.json({ success: true, jobStatus: newStatus, currentPhase: nextPhaseName, emailSent: false });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// --- RESEND EMAIL FOR A COMPLETED PHASE ---
router.post('/phases/:id/resend-email', authenticateToken, validate(updatePhaseSchema), async (req, res) => {
  const { id } = req.params;
  const { customSubject, customGreeting, customMessage, customPaymentAmount } = req.body;

  try {
    const [[details]]: any = await pool.execute(`
      SELECT 
        c.email, 
        c.name as customerName, 
        j.id as jobId, 
        j.job_type as jobType, 
        u.email as technician, 
        j.payment_status as paymentStatus,
        jp.phase_name as phaseName,
        jp.is_completed as isCompleted
      FROM job_phases jp
      JOIN jobs j ON jp.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.technician_id = u.id
      WHERE jp.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
    `, [id]);

    if (!details) return res.status(404).json({ error: 'Phase not found' });
    if (!details.isCompleted) return res.status(400).json({ error: 'Phase is not yet completed' });

    const cleanedPhaseName = cleanPhaseName(details.phaseName);

    const subject = escapeHtml(customSubject || `Update: ${cleanedPhaseName} Completed`);
    const greeting = escapeHtml(customGreeting || `Hello ${details.customerName},`);
    const message = escapeHtml(customMessage || `We're writing to let you know that "${cleanedPhaseName}" has been completed.\n\nPlease let us know if anything is pending regarding the same`);

    let paymentBlock = '';
    if (customPaymentAmount && Number(customPaymentAmount) > 0) {
      paymentBlock = buildPaymentBlock(cleanedPhaseName, Number(customPaymentAmount), details.paymentStatus);
    }

    const [[{ total }]]: any = await pool.execute('SELECT COUNT(*) as total FROM job_phases WHERE job_id = ?', [details.jobId]);
    const [[{ completed }]]: any = await pool.execute('SELECT COUNT(*) as completed FROM job_phases WHERE job_id = ? AND is_completed = 1', [details.jobId]);
    const isFinalPhase = (total === completed);

    let completionBlock = '';
    if (isFinalPhase) {
      completionBlock = buildCompletionBlock(details.paymentStatus);
    }

    const htmlBody = buildEmailLayout("Satguru Engineers Service Update", `
      <p>${greeting}</p>
      <p style="white-space: pre-wrap;">${message}</p>
      <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #2563eb;">Phase: ${cleanedPhaseName}</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Technician: ${details.technician}</p>
      </div>
      ${paymentBlock}
      ${completionBlock}
      <p style="margin-top: 16px; font-size: 14px; color: #64748b;">Thank you for choosing Satguru Engineers.</p>
    `);

    const fromEmail = await getFromEmail(pool);
    const mailResult = await sendEmail(fromEmail, details.email, subject, "", htmlBody);
    const emailStatus = mailResult.success ? 'sent' : 'failed';
    await pool.execute('UPDATE job_phases SET email_status = ? WHERE id = ?', [emailStatus, id]);
    res.json({ success: true, emailSent: mailResult.success, emailError: mailResult.error });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SEND WHATSAPP FOR A COMPLETED PHASE ---
router.post('/phases/:id/send-whatsapp', authenticateToken, validate(updatePhaseSchema), async (req, res) => {
  const { id } = req.params;
  const { whatsappTemplate, customPaymentAmount, customDate, customTxt } = req.body;

  try {
    // Guard: check if WhatsApp is globally enabled
    const [waRows]: any = await pool.execute("SELECT setting_value FROM settings WHERE setting_key = 'whatsapp_enabled'");
    const waEnabled = waRows.length === 0 || waRows[0].setting_value === 'true' || waRows[0].setting_value === '1';
    if (!waEnabled) {
      return res.status(400).json({ error: 'WhatsApp is currently disabled.' });
    }

    const result = await handleWhatsAppDirectSend({
      phaseId: Number(id),
      whatsappTemplate,
      customPaymentAmount,
      customDate,
      customTxt
    });
    res.json(result);
  } catch (err: any) {
    await pool.execute('UPDATE job_phases SET whatsapp_status = "failed" WHERE id = ?', [id]);
    res.status(500).json({ error: err.message });
  }
});

export default router;
