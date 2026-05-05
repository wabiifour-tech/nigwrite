/**
 * NigWrite - Scan Progress SSE Endpoint
 * GET /api/scan-progress?id=xxx
 * Created by: Wabi The Tech Nurse
 *
 * Server-Sent Events endpoint for real-time scan progress tracking.
 * The POST /api/scan route updates progress via the shared tracker.
 */

import { NextRequest } from 'next/server';

export interface ScanProgress {
  id: string;
  stage: 'fingerprinting' | 'matching' | 'ai_detection' | 'web_search' | 'saving' | 'complete';
  progress: number;       // 0-100
  message: string;
  timestamp: number;
}

// In-memory progress tracker (shared across requests)
export const scanProgressTracker = new Map<string, ScanProgress>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const scanId = searchParams.get('id');

  if (!scanId) {
    return new Response(JSON.stringify({ error: 'Missing scan id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const initial = scanProgressTracker.get(scanId);
      if (initial) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initial)}\n\n`)
        );
      }

      // Poll for updates every 200ms
      const interval = setInterval(() => {
        const progress = scanProgressTracker.get(scanId);

        if (progress) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
          );

          if (progress.stage === 'complete') {
            clearInterval(interval);
            // Clean up after a short delay
            setTimeout(() => {
              scanProgressTracker.delete(scanId);
            }, 5000);
            controller.close();
          }
        } else {
          // No progress found — scan may have been cleared
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              id: scanId,
              stage: 'complete',
              progress: 100,
              message: 'Scan complete (progress data cleared)',
              timestamp: Date.now(),
            })}\n\n`)
          );
          clearInterval(interval);
          controller.close();
        }
      }, 200);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
