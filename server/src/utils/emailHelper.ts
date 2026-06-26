import pool from '../config/db.js';
import { sendEmail } from './mailer.js';

export const INSTALLATION_PHASES = [
  "Drain pipe", "Remote pipe", "Wall opening", "Supporting", "Copper piping (payment)",
  "Leak testing", "Dressing", "Communication wiring", "Ducting", "Indoor Unit Installation",
  "Grill fitting", "Outdoor fittings (payment)", "Pressure stand", "Vacuum",
  "Gas charging", "Remote fitting", "Commissioning (payment)"
];

export const SERVICE_PHASES = [
  "Initial System Inspection",
  "Filter & Coil Cleaning",
  "Gas Level & Pressure Check",
  "Component Repair/Replacement",
  "Final Testing & Payment"
];

export function escapeHtml(text: string): string {
  return text
    ? text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
    : '';
}

export function sanitizeHeader(text: string): string {
  return text ? text.replace(/[\r\n]/g, '').trim() : '';
}

export async function getFromEmail(connectionOrPool: any): Promise<string> {
  let mailTransport = 'smtp';
  try {
    const [rows]: any = await connectionOrPool.execute('SELECT setting_value FROM settings WHERE setting_key = "mail_transport"');
    if (rows.length > 0) mailTransport = rows[0].setting_value;
  } catch (err) {
    console.error("Error fetching mail setting:", err);
  }
  return mailTransport === 'google_oauth'
    ? (process.env.GMAIL_USER || 'contactsatguruengineers@gmail.com')
    : (process.env.EMAIL_USER || 'contact@satguruengineers.com');
}

export function getPaymentPhaseAmount(
  phaseName: string,
  jobType: string,
  costs: { copperPipingCost: number; outdoorFittingCost: number; commissioningCost: number }
): { isPaymentPhase: boolean; amount: number | null } {
  const phaseLower = phaseName.toLowerCase();
  const isCopperPhase = phaseLower.includes('copper piping (payment)');
  const isOutdoorPhase = phaseLower.includes('outdoor fittings (payment)');
  const isCommissioningPhase = phaseLower.includes('commissioning (payment)');
  const isServiceFinalPhase = jobType === 'Service' && phaseLower.includes('final testing & payment');

  const isPaymentPhase = isCopperPhase || isOutdoorPhase || isCommissioningPhase || isServiceFinalPhase;
  let amount: number | null = null;
  if (isPaymentPhase) {
    amount = isCopperPhase ? costs.copperPipingCost :
             isOutdoorPhase ? costs.outdoorFittingCost :
             costs.commissioningCost;
  }
  return { isPaymentPhase, amount };
}

export function buildEmailLayout(subject: string, innerHtml: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px;">${subject}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        ${innerHtml}
      </div>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} Satguru Engineers.
      </div>
    </div>
  `;
}

export function buildPaymentBlock(phaseName: string, amount: number, paymentStatus: string): string {
  return `
    <div style="margin-top: 20px; padding: 20px; background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; text-align: center;">
      <h2 style="color: #9a3412; font-size: 16px; margin-bottom: 10px;">Payment Request: ${phaseName}</h2>
      <div style="background-color: #ffffff; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #c2410c;">
          Amount Due: ₹${Number(amount).toLocaleString()}
        </p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">
          Current Payment Status: <strong>${paymentStatus}</strong>
        </p>
      </div>
    </div>
  `;
}

export function buildCompletionBlock(paymentStatus: string, message: string = 'The final commissioning and testing phase is complete. Your system is now fully operational.'): string {
  return `
    <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border: 2px dashed #2563eb; border-radius: 12px; text-align: center;">
      <h2 style="color: #1e3a8a; font-size: 18px; margin-bottom: 10px;">Project Successfully Completed!</h2>
      <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">${message}</p>
      <div style="background-color: ${paymentStatus === 'Fully Received' ? '#ecfdf5' : '#fff7ed'}; border: 1px solid ${paymentStatus === 'Fully Received' ? '#10b981' : '#f97316'}; padding: 15px; border-radius: 8px;">
        <p style="margin: 0; font-weight: bold; color: ${paymentStatus === 'Fully Received' ? '#065f46' : '#9a3412'};">
          Payment Status: ${paymentStatus.toUpperCase()}
        </p>
        ${paymentStatus !== 'Fully Received' ? `
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">
            Please arrange for the final payment at your earliest convenience.
          </p>
        ` : `
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #065f46;">
            Thank you for your prompt payment! We hope you enjoy your newly serviced AC system.
          </p>
        `}
      </div>
    </div>
  `;
}

export const sendPhaseNotification = async (
  fromEmail: string,
  customerEmail: string,
  customerName: string,
  jobType: string,
  phaseName: string,
  jobId: number,
  technician: string,
  paymentStatus: string,
  isFinal: boolean,
  costs: { copperPipingCost: number; outdoorFittingCost: number; commissioningCost: number }
) => {
  const { amount } = getPaymentPhaseAmount(phaseName, jobType, costs);
  let paymentBlock = '';
  if (amount !== null && amount > 0) {
    paymentBlock = buildPaymentBlock(phaseName, amount, paymentStatus);
  }

  if (isFinal) {
    paymentBlock += buildCompletionBlock(paymentStatus);
  }

  const subject = isFinal ? `Final Project Completion: Job #${jobId}` : `Update: Job #${jobId} - ${phaseName} Completed`;
  const innerHtml = `
    <p>Hello <strong>${customerName}</strong>,</p>
    <p>We're writing to let you know that a key milestone in your <strong>${jobType}</strong> has been successfully completed:</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #2563eb;">Completed: ${phaseName}</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Job ID: #${jobId} | Technician: ${technician}</p>
    </div>
    
    ${paymentBlock}

    <p style="margin-top: 32px;">Our team is dedicated to providing high-quality service. If you have any questions, feel free to reply to this email.</p>
    <p style="margin-top: 20px; font-size: 14px; font-weight: 500; color: #1e293b;">Please let us know if anything is pending regarding the same</p>
    <p style="margin-top: 16px; font-size: 14px; color: #64748b;">Thank you for choosing Satguru Engineers.</p>
  `;

  const html = buildEmailLayout("Satguru Engineers Service Update", innerHtml);
  return await sendEmail(fromEmail, customerEmail, subject, "", html);
};
