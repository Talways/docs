import { z } from 'zod'

import { callOutcomeSchema, callStatusSchema } from './leads'

export const callSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  status: callStatusSchema,
  outcome: callOutcomeSchema,
  phoneNumber: z.string(),
  provider: z.string().nullable(),
  providerCallId: z.string().nullable(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  durationSeconds: z.number().int().nullable(),
  recordingUrl: z.string().nullable(),
  transcript: z.string().nullable(),
  summary: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const callResponseSchema = z.object({
  call: callSchema,
})

export const callsResponseSchema = z.object({
  calls: z.array(callSchema),
})

export type CallDto = z.infer<typeof callSchema>
export type CallResponse = z.infer<typeof callResponseSchema>
export type CallsResponse = z.infer<typeof callsResponseSchema>
