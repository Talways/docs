import type {
  AddLeadsPayload,
  CreateLeadListPayload,
  LeadDto,
  LeadListDto,
  LeadStatus,
} from '@coldpilot/contracts'

import type { DbClient } from '../db'
import { AppError } from '../http/errors'

type LeadListRecord = {
  id: string
  name: string
  query: string
  targetIndustry: string
  status: LeadListDto['status']
  createdAt: Date
  updatedAt: Date
  _count?: { leads: number }
}

type LeadRecord = {
  id: string
  listId: string
  companyName: string
  website: string | null
  industry: string | null
  phone: string | null
  email: string | null
  city: string | null
  country: string | null
  employeeCount: number | null
  notes: string | null
  source: string
  status: LeadStatus
  createdAt: Date
  updatedAt: Date
}

export class LeadsService {
  constructor(private readonly db: DbClient) {}

  async createLeadList(userId: string, input: CreateLeadListPayload): Promise<LeadListDto> {
    const leadList = await this.db.leadList.create({
      data: {
        userId,
        name: input.name,
        query: input.query,
        targetIndustry: input.targetIndustry,
      },
    })

    return toLeadListDto({ ...leadList, _count: { leads: 0 } })
  }

  async listLeadLists(userId: string): Promise<LeadListDto[]> {
    const leadLists = await this.db.leadList.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { leads: true } } },
    })

    return leadLists.map(toLeadListDto)
  }

  async getLeadList(userId: string, listId: string): Promise<LeadListDto> {
    const leadList = await this.db.leadList.findFirst({
      where: { id: listId, userId },
      include: { _count: { select: { leads: true } } },
    })

    if (!leadList) {
      throw new AppError(404, 'NOT_FOUND', 'Lead list not found')
    }

    return toLeadListDto(leadList)
  }

  async addLeads(
    userId: string,
    listId: string,
    input: AddLeadsPayload,
  ): Promise<LeadDto[]> {
    await this.assertListOwnership(userId, listId)

    const created = await this.db.lead.createManyAndReturn({
      data: input.leads.map((lead) => ({
        listId,
        userId,
        companyName: lead.companyName,
        website: lead.website,
        industry: lead.industry,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        country: lead.country,
        employeeCount: lead.employeeCount,
        notes: lead.notes,
        source: lead.source ?? 'manual',
      })),
    })

    return created.map(toLeadDto)
  }

  async listLeads(
    userId: string,
    listId: string,
    filter?: { status?: LeadStatus },
  ): Promise<LeadDto[]> {
    await this.assertListOwnership(userId, listId)

    const leads = await this.db.lead.findMany({
      where: { listId, userId, ...(filter?.status ? { status: filter.status } : {}) },
      orderBy: { createdAt: 'desc' },
    })

    return leads.map(toLeadDto)
  }

  async updateLeadStatus(
    userId: string,
    leadId: string,
    status: LeadStatus,
  ): Promise<LeadDto> {
    const updated = await this.db.lead.updateMany({
      where: { id: leadId, userId },
      data: { status },
    })

    if (updated.count !== 1) {
      throw new AppError(404, 'NOT_FOUND', 'Lead not found')
    }

    const lead = await this.db.lead.findFirstOrThrow({ where: { id: leadId, userId } })
    return toLeadDto(lead)
  }

  private async assertListOwnership(userId: string, listId: string) {
    const leadList = await this.db.leadList.findFirst({
      where: { id: listId, userId },
      select: { id: true },
    })

    if (!leadList) {
      throw new AppError(404, 'NOT_FOUND', 'Lead list not found')
    }
  }
}

function toLeadListDto(record: LeadListRecord): LeadListDto {
  return {
    id: record.id,
    name: record.name,
    query: record.query,
    targetIndustry: record.targetIndustry,
    status: record.status,
    leadCount: record._count?.leads ?? 0,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toLeadDto(record: LeadRecord): LeadDto {
  return {
    id: record.id,
    listId: record.listId,
    companyName: record.companyName,
    website: record.website,
    industry: record.industry,
    phone: record.phone,
    email: record.email,
    city: record.city,
    country: record.country,
    employeeCount: record.employeeCount,
    notes: record.notes,
    source: record.source,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
