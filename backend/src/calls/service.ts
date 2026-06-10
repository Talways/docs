import type { CallDto } from '@coldpilot/contracts'

import type { DbClient } from '../db'
import { AppError } from '../http/errors'

type CallRecord = {
  id: string
  leadId: string
  status: CallDto['status']
  outcome: CallDto['outcome']
  phoneNumber: string
  provider: string | null
  providerCallId: string | null
  startedAt: Date | null
  endedAt: Date | null
  durationSeconds: number | null
  recordingUrl: string | null
  transcript: string | null
  summary: string | null
  createdAt: Date
  updatedAt: Date
}

export class CallsService {
  constructor(private readonly db: DbClient) {}

  // Queues an outbound AI call for a lead. This owns validation and persistence;
  // the actual dialing (Twilio Media Streams + GPT-4o + ElevenLabs) is performed
  // by the worker and is intentionally not wired yet — see docs/AI_CALLER.md.
  async queueCall(userId: string, leadId: string): Promise<CallDto> {
    const lead = await this.db.lead.findFirst({
      where: { id: leadId, userId },
      select: { id: true, phone: true, status: true },
    })

    if (!lead) {
      throw new AppError(404, 'NOT_FOUND', 'Lead not found')
    }

    if (lead.status === 'DO_NOT_CALL') {
      throw new AppError(409, 'CONFLICT', 'Lead is marked DO_NOT_CALL and cannot be called')
    }

    if (!lead.phone) {
      throw new AppError(400, 'BAD_REQUEST', 'Lead has no phone number to call')
    }

    const call = await this.db.$transaction(async (tx) => {
      const created = await tx.call.create({
        data: {
          leadId,
          userId,
          phoneNumber: lead.phone as string,
          status: 'QUEUED',
        },
      })

      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'QUEUED' },
      })

      return created
    })

    // TODO(ai-caller): hand the queued call to the worker to dial via Twilio.
    // Until the pipeline exists, the call stays QUEUED for visibility.

    return toCallDto(call)
  }

  async listCallsForLead(userId: string, leadId: string): Promise<CallDto[]> {
    const lead = await this.db.lead.findFirst({
      where: { id: leadId, userId },
      select: { id: true },
    })

    if (!lead) {
      throw new AppError(404, 'NOT_FOUND', 'Lead not found')
    }

    const calls = await this.db.call.findMany({
      where: { leadId, userId },
      orderBy: { createdAt: 'desc' },
    })

    return calls.map(toCallDto)
  }
}

function toCallDto(record: CallRecord): CallDto {
  return {
    id: record.id,
    leadId: record.leadId,
    status: record.status,
    outcome: record.outcome,
    phoneNumber: record.phoneNumber,
    provider: record.provider,
    providerCallId: record.providerCallId,
    startedAt: record.startedAt?.toISOString() ?? null,
    endedAt: record.endedAt?.toISOString() ?? null,
    durationSeconds: record.durationSeconds,
    recordingUrl: record.recordingUrl,
    transcript: record.transcript,
    summary: record.summary,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
