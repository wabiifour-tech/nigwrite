/**
 * NigWrite - Webhook Dispatcher
 * Dispatches webhook events with HMAC-SHA256 signing and retry logic.
 *
 * Usage:
 *   import { dispatchWebhookEvent } from '@/lib/webhook-dispatcher';
 *   await dispatchWebhookEvent(userId, 'scan.complete', { reportId, similarityScore });
 */

import { db } from '@/lib/db';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 3000, 9000]; // exponential backoff

/**
 * Sign a payload with HMAC-SHA256 using the webhook's secret.
 * Returns the hex-encoded signature.
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatch a single webhook with retry logic.
 */
async function deliverWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret);
  const timestamp = payload.timestamp;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NigWrite-Signature': `sha256=${signature}`,
          'X-NigWrite-Timestamp': timestamp,
          'X-NigWrite-Event': payload.event,
        },
        body,
      });

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }

      // 4xx errors (except 429) should not be retried
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { success: false, statusCode: response.status, error: `Client error: ${response.status}` };
      }

      // 5xx or 429 — retry
      console.warn(
        `[Webhook] Delivery failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${response.status} ${url}`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn(
        `[Webhook] Delivery error (attempt ${attempt + 1}/${MAX_RETRIES}): ${message} ${url}`
      );
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Dispatch a webhook event to all matching active webhooks for a user.
 * Runs in the background — failures are logged but do not block the caller.
 */
export async function dispatchWebhookEvent(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const webhooks = await db.webhook.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (webhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Fire all webhook deliveries concurrently
    const deliveries = webhooks.map(async (webhook) => {
      // Check if this webhook is interested in this event type
      const subscribedEvents = webhook.events.split(',').map(e => e.trim());
      const shouldFire = subscribedEvents.includes(event) || subscribedEvents.includes('*');

      if (!shouldFire) return;

      const result = await deliverWebhook(webhook.url, webhook.secret, payload);

      // Update lastTriggered timestamp
      await db.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggered: new Date() },
      });

      if (!result.success) {
        console.error(
          `[Webhook] Failed to deliver ${event} to ${webhook.url}: ${result.error || 'Unknown error'}`
        );
      }
    });

    await Promise.allSettled(deliveries);
  } catch (error: unknown) {
    // Webhook dispatch should never block the main flow
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Webhook] dispatchWebhookEvent failed: ${message}`);
  }
}
