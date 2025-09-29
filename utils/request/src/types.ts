import type { AxiosRequestConfig } from 'axios'
import type { Ref } from 'vue'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
export interface ResultData { code: number, msg: string, data: any }

// 请求配置
export interface EzRequestConfig<D = any, T = ResultData> extends AxiosRequestConfig<D> {
  // 请求路径
  url: string
  // 请求方法
  method: Method
  // 失败重试次数（默认0不重试，-1无限重试）
  retry: number
  // 重试等待时间，传入 attempt（第几次重试）返回等待ms，默认返回3秒
  retryDelay: (attempt: number) => number
  // 缓存配置
  cache: {
    // 缓存键，通过这个key来判断请求唯一性，默认是URL + method + params + data 的序列化
    key: string | ((config: EzRequestConfig) => string)
    // 有效期ms（默认0不缓存，-1永久有效）
    expire: number
    // 缓存级别（内存缓存刷新就丢弃/磁盘缓存）
    level: 'memory' | 'disk'
  }
  // 待定的 Result 数据，在响应没有获取到时呈现的内容，默认 undefined
  pendingResult?: T
  // 在响应失败时呈现的内容，默认 undefined，可以传函数，通过attempt生成呈现内容，为0表示不会再重试了，彻底失败
  errorResult?: T | ((attempt: number) => T)
}

// 响应
export interface EzResponse<T = ResultData> {
  resultRef: Ref<T | undefined>
  resultPromise: Promise<T>
  loading: Ref<boolean>
}

// 深可选配置
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? DeepPartial<T[K]> // 如果是对象就递归
    : T[K]
}
