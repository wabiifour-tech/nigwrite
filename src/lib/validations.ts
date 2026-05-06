/**
 * NigWrite - Zod Validation Schemas
 * Centralized validation for all API routes.
 * Created by: Wabi The Tech Nurse
 */

import { z } from "zod";

/**
 * Schema for /api/scan POST
 */
export const scanSchema = z.object({
  title: z
    .string()
    .max(200, "Title must be 200 characters or less")
    .optional(),
  content: z
    .string()
    .min(50, "Content must be at least 50 characters long")
    .max(50_000_000, "Content is too large"), // No practical limit
  userId: z.string().optional(),
});

/**
 * Schema for /api/correct POST
 */
export const correctSchema = z.object({
  flaggedText: z
    .string()
    .min(10, "Flagged text must be at least 10 characters long"),
  documentContent: z.string().optional(),
  documentTitle: z.string().optional(),
  reportId: z.string().optional(),
});

/**
 * Schema for /api/ai-detect POST
 */
export const aiDetectSchema = z.object({
  content: z
    .string()
    .min(10, "Content must be at least 10 characters long for AI detection"),
});

/**
 * Schema for /api/upload POST — file metadata validation
 * (File binary data is handled separately via FormData.)
 */
export const uploadSchema = z.object({
  fileSize: z.number(), // No size restriction — any file size accepted
  fileType: z.enum(["txt", "md", "csv", "pdf", "docx", "doc"], {
    message: "Unsupported file type",
  }),
});

/**
 * Schema for /api/register POST
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or less"),
  email: z.string().email("Please provide a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

/**
 * Schema for /api/login POST
 */
export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Schema for /api/submissions/resubmit POST
 */
export const resubmitSchema = z.object({
  parentSubmissionId: z.string().min(1, "Parent submission ID is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  title: z.string().max(200, "Title must be 200 characters or less").optional(),
  isDraft: z.boolean().optional().default(false),
});

/**
 * Schema for /api/reports/share POST
 */
export const createShareSchema = z.object({
  reportId: z.string().min(1, "Report ID is required"),
  expiresAt: z.string().datetime().optional().nullable(),
  password: z.string().min(1).max(100).optional().nullable(),
  maxViews: z.number().int().min(1).optional().nullable(),
  userId: z.string().min(1, "User ID is required"),
});

/**
 * Schema for /api/reports/unshare POST
 */
export const unshareSchema = z.object({
  shareToken: z.string().min(1, "Share token is required"),
});

/**
 * Schema for /api/revision POST
 */
export const revisionSchema = z.object({
  text: z
    .string()
    .min(20, "Text must be at least 20 characters for revision analysis")
    .max(500_000, "Text must be 500,000 characters or less"),
  title: z
    .string()
    .max(200, "Title must be 200 characters or less")
    .optional(),
  useAI: z.boolean().optional().default(false),
});

/**
 * Helper: format Zod validation errors into a flat array of messages.
 */
export function formatValidationErrors(
  error: z.ZodError
): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
