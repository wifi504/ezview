import type { DeepPartial } from './types'

// 稳定 JSON 序列化
export function stableStringify(obj: any, seen = new WeakSet()): string {
  if (obj === null) return 'null'
  if (typeof obj !== 'object') {
    if (typeof obj === 'function') return obj.name ? `[Function:${obj.name}]` : 'function'
    if (typeof obj === 'symbol') return obj.toString()
    return String(obj)
  }
  if (seen.has(obj)) return '[Circular]'
  seen.add(obj)
  if (Array.isArray(obj)) return `[${obj.map(v => stableStringify(v, seen)).join(',')}]`
  const keys = Object.keys(obj).sort()
  return `{${keys.map(k => `${k}:${stableStringify(obj[k], seen)}`).join(',')}}`
}

// 合并配置
export function mergeConfig<T>(defaults: any, config?: DeepPartial<T>): T {
  const result: any = Array.isArray(defaults) ? [...defaults] : { ...defaults }
  if (!config) return result
  for (const key in config) {
    const userValue = (config as any)[key]
    const defaultValue = (defaults as any)?.[key]
    if (
      userValue !== undefined
      && userValue !== null
      && typeof userValue === 'object'
      && !Array.isArray(userValue)
    ) {
      result[key] = mergeConfig(defaultValue ?? {}, userValue)
    } else if (userValue !== undefined) {
      result[key] = userValue
    }
  }
  return result as T
}
