import type { DeepPartial } from './types'

// 稳定 JSON 序列化
export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return String(obj)
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`
  }
  const keys = Object.keys(obj).sort()
  return `{${keys.map(k => `${k}:${stableStringify(obj[k])}`).join(',')}}`
}

// 合并配置
export function mergeConfig<T>(defaults: any, config?: DeepPartial<T>): T {
  const result = { ...defaults }

  if (config) {
    for (const key in config) {
      const userValue = config[key]
      if (
        userValue
        && typeof userValue === 'object'
        && !Array.isArray(userValue)
      ) {
        result[key] = mergeConfig((defaults as any)[key], userValue)
      } else if (userValue !== undefined) {
        (result as any)[key] = userValue
      }
    }
  }

  return result
}
