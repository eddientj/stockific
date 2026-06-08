import type { H3Event } from 'h3'

export async function readJsonBody<T = unknown>(event: H3Event): Promise<T> {
  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Request body must be JSON object' })
  }
  return body as T
}

export function requireString(obj: Record<string, unknown>, key: string, max = 500): string {
  const v = obj[key]
  if (typeof v !== 'string' || !v.trim()) {
    throw createError({ statusCode: 400, statusMessage: `Field "${key}" is required` })
  }
  if (v.length > max) {
    throw createError({ statusCode: 400, statusMessage: `Field "${key}" too long (max ${max})` })
  }
  return v.trim()
}

export function optionalString(obj: Record<string, unknown>, key: string, max = 2000): string | null {
  const v = obj[key]
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string') {
    throw createError({ statusCode: 400, statusMessage: `Field "${key}" must be a string` })
  }
  if (v.length > max) {
    throw createError({ statusCode: 400, statusMessage: `Field "${key}" too long (max ${max})` })
  }
  return v.trim()
}

export function requireNumber(obj: Record<string, unknown>, key: string, opts: { min?: number; max?: number } = {}): number {
  const v = obj[key]
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw createError({ statusCode: 400, statusMessage: `Field "${key}" must be a number` })
  }
  if (opts.min !== undefined && n < opts.min) {
    throw createError({ statusCode: 400, statusMessage: `Field "${key}" must be >= ${opts.min}` })
  }
  if (opts.max !== undefined && n > opts.max) {
    throw createError({ statusCode: 400, statusMessage: `Field "${key}" must be <= ${opts.max}` })
  }
  return n
}

export function optionalUuid(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key]
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    throw createError({ statusCode: 400, statusMessage: `Field "${key}" must be a UUID` })
  }
  return v
}
