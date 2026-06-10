import {
  addLeadsRequestSchema,
  apiErrorSchema,
  createLeadListRequestSchema,
  leadListResponseSchema,
  leadListsResponseSchema,
  leadResponseSchema,
  leadStatusSchema,
  leadsResponseSchema,
  updateLeadStatusRequestSchema,
} from '@coldpilot/contracts'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'

import type { AppEnv } from '../env'
import { validationErrorHook } from '../http/errors'
import { requireAuth, type AuthenticatedVariables } from '../auth/middleware'
import { LeadsService } from './service'

type LeadRouteEnv = {
  Variables: AuthenticatedVariables & {
    env: AppEnv
    leadsService: LeadsService
  }
}

const errorResponseContent = {
  'application/json': {
    schema: apiErrorSchema,
  },
}

const listIdParamSchema = z.object({
  listId: z.string().uuid(),
})

const leadIdParamSchema = z.object({
  leadId: z.string().uuid(),
})

const leadsQuerySchema = z.object({
  status: leadStatusSchema.optional(),
})

const createLeadListRoute = createRoute({
  method: 'post',
  path: '/lists',
  request: {
    body: { content: { 'application/json': { schema: createLeadListRequestSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: leadListResponseSchema } },
      description: 'Created lead list',
    },
    400: { content: errorResponseContent, description: 'Invalid payload' },
    401: { content: errorResponseContent, description: 'Missing or invalid access token' },
  },
})

const listLeadListsRoute = createRoute({
  method: 'get',
  path: '/lists',
  responses: {
    200: {
      content: { 'application/json': { schema: leadListsResponseSchema } },
      description: 'Lead lists for the current user',
    },
    401: { content: errorResponseContent, description: 'Missing or invalid access token' },
  },
})

const getLeadListRoute = createRoute({
  method: 'get',
  path: '/lists/{listId}',
  request: { params: listIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: leadListResponseSchema } },
      description: 'A single lead list',
    },
    401: { content: errorResponseContent, description: 'Missing or invalid access token' },
    404: { content: errorResponseContent, description: 'Lead list not found' },
  },
})

const addLeadsRoute = createRoute({
  method: 'post',
  path: '/lists/{listId}/leads',
  request: {
    params: listIdParamSchema,
    body: { content: { 'application/json': { schema: addLeadsRequestSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: leadsResponseSchema } },
      description: 'Created leads',
    },
    400: { content: errorResponseContent, description: 'Invalid payload' },
    401: { content: errorResponseContent, description: 'Missing or invalid access token' },
    404: { content: errorResponseContent, description: 'Lead list not found' },
  },
})

const listLeadsRoute = createRoute({
  method: 'get',
  path: '/lists/{listId}/leads',
  request: { params: listIdParamSchema, query: leadsQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: leadsResponseSchema } },
      description: 'Leads in a list, optionally filtered by status',
    },
    401: { content: errorResponseContent, description: 'Missing or invalid access token' },
    404: { content: errorResponseContent, description: 'Lead list not found' },
  },
})

const updateLeadStatusRoute = createRoute({
  method: 'post',
  path: '/leads/{leadId}/status',
  request: {
    params: leadIdParamSchema,
    body: { content: { 'application/json': { schema: updateLeadStatusRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: leadResponseSchema } },
      description: 'Updated lead',
    },
    400: { content: errorResponseContent, description: 'Invalid payload' },
    401: { content: errorResponseContent, description: 'Missing or invalid access token' },
    404: { content: errorResponseContent, description: 'Lead not found' },
  },
})

export function createLeadRoutes() {
  const routes = new OpenAPIHono<LeadRouteEnv>({
    defaultHook: validationErrorHook,
  })

  routes.use('*', requireAuth)

  routes.openapi(createLeadListRoute, async (c) => {
    const leadList = await c.get('leadsService').createLeadList(c.get('userId'), c.req.valid('json'))
    return c.json({ leadList }, 201)
  })

  routes.openapi(listLeadListsRoute, async (c) => {
    const leadLists = await c.get('leadsService').listLeadLists(c.get('userId'))
    return c.json({ leadLists }, 200)
  })

  routes.openapi(getLeadListRoute, async (c) => {
    const { listId } = c.req.valid('param')
    const leadList = await c.get('leadsService').getLeadList(c.get('userId'), listId)
    return c.json({ leadList }, 200)
  })

  routes.openapi(addLeadsRoute, async (c) => {
    const { listId } = c.req.valid('param')
    const leads = await c.get('leadsService').addLeads(c.get('userId'), listId, c.req.valid('json'))
    return c.json({ leads }, 201)
  })

  routes.openapi(listLeadsRoute, async (c) => {
    const { listId } = c.req.valid('param')
    const { status } = c.req.valid('query')
    const leads = await c.get('leadsService').listLeads(c.get('userId'), listId, { status })
    return c.json({ leads }, 200)
  })

  routes.openapi(updateLeadStatusRoute, async (c) => {
    const { leadId } = c.req.valid('param')
    const { status } = c.req.valid('json')
    const lead = await c.get('leadsService').updateLeadStatus(c.get('userId'), leadId, status)
    return c.json({ lead }, 200)
  })

  return routes
}
