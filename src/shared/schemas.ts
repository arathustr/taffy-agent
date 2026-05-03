import { z } from 'zod';

export const intentSchema = z.object({
  kind: z.enum(['chat', 'browser', 'codex', 'shell', 'file', 'settings']),
  confidence: z.number().min(0).max(1),
  goal: z.string(),
  risk: z.enum(['low', 'medium', 'high', 'critical']),
  requiresApproval: z.boolean(),
  reason: z.string()
});

export type RoutedIntent = z.infer<typeof intentSchema>;

export const reviewerSchema = z.object({
  decision: z.enum(['continue', 'ask_user', 'retry', 'revise_plan', 'complete', 'fail']),
  summary: z.string(),
  nextStepId: z.string().optional(),
  reason: z.string()
});

export type ReviewDecision = z.infer<typeof reviewerSchema>;

