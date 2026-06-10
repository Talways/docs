import { describe, expect, test } from 'bun:test'

import {
  addLeadsRequestSchema,
  createLeadListRequestSchema,
  leadInputSchema,
  phoneSchema,
} from './leads'

describe('lead contracts', () => {
  test('defaults the target industry to B2B SaaS', () => {
    const result = createLeadListRequestSchema.parse({
      name: 'US SaaS founders',
      query: 'B2B SaaS companies in the US with 11-50 employees',
    })

    expect(result.targetIndustry).toBe('B2B SaaS')
  })

  test('normalizes optional lead fields and lowercases email', () => {
    const result = leadInputSchema.parse({
      companyName: '  Acme Cloud  ',
      website: 'https://acme.example',
      email: ' SALES@Acme.Example ',
      industry: '',
      phone: '+1 (415) 555-0142',
      employeeCount: '42',
    })

    expect(result.companyName).toBe('Acme Cloud')
    expect(result.email).toBe('sales@acme.example')
    expect(result.industry).toBeUndefined()
    expect(result.phone).toBe('+1 (415) 555-0142')
    expect(result.employeeCount).toBe(42)
  })

  test('rejects phone numbers without enough digits', () => {
    expect(phoneSchema.safeParse('12345').success).toBe(false)
    expect(phoneSchema.safeParse('+1 415 555 0142').success).toBe(true)
  })

  test('rejects empty bulk imports and caps the batch size', () => {
    expect(addLeadsRequestSchema.safeParse({ leads: [] }).success).toBe(false)

    const oversized = {
      leads: Array.from({ length: 501 }, () => ({ companyName: 'Acme' })),
    }
    expect(addLeadsRequestSchema.safeParse(oversized).success).toBe(false)
  })
})
