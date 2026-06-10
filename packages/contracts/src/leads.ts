import { z } from 'zod'

export const leadListStatusSchema = z.enum(['DRAFT', 'BUILDING', 'READY', 'ARCHIVED'])

export const leadStatusSchema = z.enum([
  'NEW',
  'QUEUED',
  'CALLING',
  'CALLED',
  'INTERESTED',
  'NOT_INTERESTED',
  'CALLBACK',
  'INVALID',
  'DO_NOT_CALL',
])

export const callStatusSchema = z.enum([
  'QUEUED',
  'DIALING',
  'IN_PROGRESS',
  'COMPLETED',
  'NO_ANSWER',
  'VOICEMAIL',
  'FAILED',
])

export const callOutcomeSchema = z.enum([
  'INTERESTED',
  'NOT_INTERESTED',
  'CALLBACK',
  'NOT_A_FIT',
  'WRONG_NUMBER',
  'NO_OUTCOME',
])

// Loose but real phone validation: allow E.164-style and common separators,
// require at least 7 digits so we never queue an obviously unreachable number.
export const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^\+?[0-9().\-\s]+$/, 'Phone may contain digits, spaces, and + ( ) - . only')
  .refine((value) => (value.match(/\d/g)?.length ?? 0) >= 7, 'Phone must contain at least 7 digits')

const optionalTrimmed = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal('')])
    .optional()
    .transform((value) => (value === '' || value === undefined ? undefined : value))

const optionalUrl = z
  .union([z.string().trim().url().max(2048), z.literal('')])
  .optional()
  .transform((value) => (value === '' || value === undefined ? undefined : value))

const optionalEmail = z
  .union([z.string().trim().toLowerCase().email().max(254), z.literal('')])
  .optional()
  .transform((value) => (value === '' || value === undefined ? undefined : value))

const optionalPhone = z
  .union([phoneSchema, z.literal('')])
  .optional()
  .transform((value) => (value === '' || value === undefined ? undefined : value))

export const leadListSchema = z.object({
  id: z.string(),
  name: z.string(),
  query: z.string(),
  targetIndustry: z.string(),
  status: leadListStatusSchema,
  leadCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const leadSchema = z.object({
  id: z.string(),
  listId: z.string(),
  companyName: z.string(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  employeeCount: z.number().int().nullable(),
  notes: z.string().nullable(),
  source: z.string(),
  status: leadStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createLeadListRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  query: z.string().trim().min(3).max(2000),
  targetIndustry: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional()
    .default('B2B SaaS'),
})

export const leadInputSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  website: optionalUrl,
  industry: optionalTrimmed(120),
  phone: optionalPhone,
  email: optionalEmail,
  city: optionalTrimmed(120),
  country: optionalTrimmed(120),
  employeeCount: z.coerce.number().int().positive().max(10_000_000).optional(),
  notes: optionalTrimmed(2000),
  source: optionalTrimmed(60),
})

// Adding leads supports a single business or a bulk import in one request, so
// the same endpoint covers manual entry and enrichment-pipeline batches.
export const addLeadsRequestSchema = z.object({
  leads: z.array(leadInputSchema).min(1).max(500),
})

export const updateLeadStatusRequestSchema = z.object({
  status: leadStatusSchema,
})

export const leadListResponseSchema = z.object({
  leadList: leadListSchema,
})

export const leadListsResponseSchema = z.object({
  leadLists: z.array(leadListSchema),
})

export const leadsResponseSchema = z.object({
  leads: z.array(leadSchema),
})

export const leadResponseSchema = z.object({
  lead: leadSchema,
})

export type LeadListStatus = z.infer<typeof leadListStatusSchema>
export type LeadStatus = z.infer<typeof leadStatusSchema>
export type CallStatus = z.infer<typeof callStatusSchema>
export type CallOutcome = z.infer<typeof callOutcomeSchema>
export type LeadListDto = z.infer<typeof leadListSchema>
export type LeadDto = z.infer<typeof leadSchema>
export type CreateLeadListRequest = z.input<typeof createLeadListRequestSchema>
export type CreateLeadListPayload = z.output<typeof createLeadListRequestSchema>
export type LeadInput = z.input<typeof leadInputSchema>
export type LeadPayload = z.output<typeof leadInputSchema>
export type AddLeadsRequest = z.input<typeof addLeadsRequestSchema>
export type AddLeadsPayload = z.output<typeof addLeadsRequestSchema>
export type UpdateLeadStatusRequest = z.infer<typeof updateLeadStatusRequestSchema>
export type LeadListResponse = z.infer<typeof leadListResponseSchema>
export type LeadListsResponse = z.infer<typeof leadListsResponseSchema>
export type LeadsResponse = z.infer<typeof leadsResponseSchema>
export type LeadResponse = z.infer<typeof leadResponseSchema>
