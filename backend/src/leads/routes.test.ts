import { describe, expect, test } from 'bun:test'

import { createApp } from '../app'
import type { DbClient } from '../db'
import type { AppEnv } from '../env'

const env: AppEnv = {
  PORT: 3000,
  DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
  JWT_SECRET: 'test-route-secret-at-least-thirty-two-chars-123',
  CORS_ORIGINS: ['https://web.example.com'],
  ACCESS_TOKEN_TTL_SECONDS: 60,
  REFRESH_TOKEN_TTL_DAYS: 30,
  COOKIE_SECURE: true,
  SPACES_UPLOAD_MAX_BYTES: 10 * 1024 * 1024,
  SPACES_UPLOAD_URL_TTL_SECONDS: 900,
  SPACES_DOWNLOAD_URL_TTL_SECONDS: 300,
  SPACES_PUBLIC_CACHE_CONTROL: 'public, max-age=31536000, immutable',
}

describe('lead routes', () => {
  test('rejects requests without an access token before any database work', async () => {
    const app = createApp({ env, prisma: {} as DbClient })

    const listResponse = await app.request('/api/leads/lists', {
      headers: { 'X-Client-Platform': 'web' },
    })
    const listBody = await listResponse.json()

    expect(listResponse.status).toBe(401)
    expect(listBody.error.code).toBe('UNAUTHORIZED')

    const createResponse = await app.request('/api/leads/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Platform': 'web' },
      body: JSON.stringify({ name: 'US SaaS', query: 'B2B SaaS in the US' }),
    })
    const createBody = await createResponse.json()

    expect(createResponse.status).toBe(401)
    expect(createBody.error.code).toBe('UNAUTHORIZED')

    const queueCallResponse = await app.request(
      `/api/leads/leads/${'0'.repeat(8)}-0000-7000-8000-000000000000/queue-call`,
      {
        method: 'POST',
        headers: { 'X-Client-Platform': 'web' },
      },
    )
    const queueCallBody = await queueCallResponse.json()

    expect(queueCallResponse.status).toBe(401)
    expect(queueCallBody.error.code).toBe('UNAUTHORIZED')
  })
})
