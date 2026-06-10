import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../env'
import type { AuthService } from './service'

export type AuthenticatedVariables = {
  authService: AuthService
  env: AppEnv
  userId: string
  userEmail: string
}

// Resolves the bearer access token to a live session and exposes the owner on
// the context. Reuses AuthService.getMe so token + session validation stays in
// one place; it throws a 401 AppError before any route handler work runs.
export const requireAuth = createMiddleware<{ Variables: AuthenticatedVariables }>(
  async (c, next) => {
    const authService = c.get('authService')
    const authorization = c.req.header('authorization')
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined

    const { user } = await authService.getMe(token)
    c.set('userId', user.id)
    c.set('userEmail', user.email)

    await next()
  },
)
