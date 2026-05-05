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
    .max(500_000, "Content must be 500,000 characters or less"),
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
  fileSize: z.number().max(10 * 1024 * 1024, "File must be 10MB or less"),
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
