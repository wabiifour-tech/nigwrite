/**
 * NigWrite - Email Service
 * Simple email sending via database notifications (no real SMTP).
 * Logs emails for reference and creates Notification records.
 */

import { db } from '@/lib/db';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  userId?: string;
}

/**
 * Send a report share email notification.
 * Creates a Notification record and logs the email for reference.
 */
export async function sendReportEmail(
  to: string,
  shareUrl: string,
  reportTitle: string,
  message?: string,
  userId?: string,
) {
  const subject = `NigWrite: Report Shared — ${reportTitle}`;
  const body = [
    message ? `${message}\n\n` : '',
    `A plagiarism report has been shared with you on NigWrite.`,
    `Report: ${reportTitle}`,
    `View Report: ${shareUrl}`,
    '',
    `This link was shared via NigWrite Academic Integrity Platform.`,
    `If you did not expect this email, you can ignore it.`,
  ].join('\n');

  return sendEmail({ to, subject, body, userId });
}

/**
 * Send a submission receipt email notification.
 */
export async function sendSubmissionReceipt(
  to: string,
  submissionId: string,
  documentTitle: string,
  assignmentTitle: string,
  userId?: string,
) {
  const subject = `NigWrite: Submission Received — ${documentTitle}`;
  const body = [
    `Your submission has been received successfully.`,
    `Document: ${documentTitle}`,
    `Assignment: ${assignmentTitle}`,
    `Submission ID: ${submissionId}`,
    `Timestamp: ${new Date().toISOString()}`,
    '',
    `This is an automated receipt from NigWrite Academic Integrity Platform.`,
  ].join('\n');

  return sendEmail({ to, subject, body, userId });
}

/**
 * Generic email sender — creates a Notification record and logs the email.
 */
async function sendEmail({ to, subject, body, userId }: EmailOptions) {
  try {
    // Create a notification record for the recipient
    await db.notification.create({
      data: {
        userId: userId || null,
        title: subject,
        message: body,
        type: 'info',
      },
    });

    // Log the email for reference (console in dev)
    console.log(`[NigWrite Email] TO: ${to} | SUBJECT: ${subject}`);
    console.log(`[NigWrite Email] BODY: ${body.substring(0, 200)}...`);

    return { success: true, message: 'Email notification created' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send email notification';
    console.error('[NigWrite Email] Error:', message);
    return { success: false, error: message };
  }
}
