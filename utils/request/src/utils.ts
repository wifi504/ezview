import type { DeepPartial, EzRequestConfig } from './types'

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
/**
 * 判断是否为纯对象（plain object）
 */
function isPlainObject(val: any): boolean {
  if (typeof val !== 'object' || val === null) return false

  // 排除特殊对象类型
  if (val instanceof Date || val instanceof RegExp) {
    return false
  }

  // 浏览器环境特有的类型
  if (typeof Blob !== 'undefined' && val instanceof Blob) return false
  if (typeof File !== 'undefined' && val instanceof File) return false
  if (typeof FormData !== 'undefined' && val instanceof FormData) return false
  if (typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams) return false
  if (typeof ArrayBuffer !== 'undefined' && val instanceof ArrayBuffer) return false
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(val)) return false

  const proto = Object.getPrototypeOf(val)
  return proto === null || proto === Object.prototype
}

/**
 * 克隆 FormData
 */
function cloneFormData(formData: FormData): FormData {
  const cloned = new FormData()
  formData.forEach((value, key) => {
    // FormData 的值可能是 string 或 File/Blob
    // 使用类型断言来避免 TypeScript 检查问题
    if (typeof File !== 'undefined' && value instanceof File) {
      // File 继承自 Blob，需要保留文件名
      cloned.append(key, new File([value], value.name, { type: value.type }))
    } else if (typeof Blob !== 'undefined' && value instanceof Blob) {
      cloned.append(key, new Blob([value], { type: value.type }))
    } else {
      cloned.append(key, value as string)
    }
  })
  return cloned
}

/**
 * 克隆 URLSearchParams
 */
function cloneURLSearchParams(params: URLSearchParams): URLSearchParams {
  return new URLSearchParams(params.toString())
}

/**
 * 深度克隆值
 */
function deepClone<T>(value: T): T {
  // 处理基本类型、null、undefined
  if (value === null || typeof value !== 'object') {
    return value
  }

  // 处理函数（直接返回引用）
  if (typeof value === 'function') {
    return value
  }

  // 处理日期
  if (value instanceof Date) {
    return new Date(value.getTime()) as T
  }

  // 处理正则
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T
  }

  // 处理 FormData（需要克隆以防用户修改）
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return cloneFormData(value) as T
  }

  // 处理 URLSearchParams（需要克隆）
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) {
    return cloneURLSearchParams(value) as T
  }

  // 处理 File（克隆为新的 File 对象）
  if (typeof File !== 'undefined' && value instanceof File) {
    return new File([value], value.name, {
      type: value.type,
      lastModified: value.lastModified,
    }) as T
  }

  // 处理 Blob（克隆为新的 Blob）
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return new Blob([value], { type: value.type }) as T
  }

  // 处理 ArrayBuffer（创建副本）
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return value.slice(0) as T
  }

  // 处理 TypedArray（创建新的 TypedArray）
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value)) {
    const TypedArrayConstructor = (value as any).constructor
    return new TypedArrayConstructor(value) as T
  }

  // 处理数组
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as T
  }

  // 处理纯对象
  if (isPlainObject(value)) {
    const cloned: any = {}
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = deepClone((value as any)[key])
      }
    }
    return cloned as T
  }

  // 其他未知对象类型直接返回引用（保守策略）
  return value
}

/**
 * 深度合并配置对象
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T>,
): T {
  const result: any = deepClone(target)

  if (!source) return result

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue
    }

    const sourceValue = source[key]
    const targetValue = result[key]

    // 如果 source 的值是 undefined，跳过
    if (sourceValue === undefined) {
      continue
    }

    // 如果是纯对象，递归合并
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue as any)
    } else {
      // 否则直接克隆替换
      result[key] = deepClone(sourceValue)
    }
  }

  return result as T
}

/**
 * 合并请求配置
 *
 * 此函数会深度克隆所有配置，确保：
 * 1. 返回的配置对象是全新的，不会影响原配置
 * 2. data、params、headers 等字段被深度克隆，防止用户在请求发出后修改导致重试时数据错误
 * 3. 函数类型（如 assert、retryDelay）保持引用
 */
export function mergeConfig<D, T>(
  defaultConfig: EzRequestConfig<D, T>,
  config?: DeepPartial<EzRequestConfig<D, T>>,
): EzRequestConfig<D, T> {
  if (!config) {
    return deepClone(defaultConfig)
  }

  return deepMerge(defaultConfig, config)
}
