import type { AxiosRequestConfig } from 'axios'
import type { Ref } from 'vue'
import type { EzRequest } from './request'

export type Method = 'get' | 'post' | 'put' | 'delete'
export interface ResultData { code: number, msg: string, data: any }

// 请求配置
export interface EzRequestConfig<D, T> extends AxiosRequestConfig<D> {
  // 请求路径
  url: string
  // 请求方法
  method: Method
  // 失败重试次数（默认0不重试，-1无限重试）
  retry: number
  // 重试等待时间，传入 attempt（第几次重试）返回等待ms，默认返回3秒
  retryDelay: number | ((attempt: number) => number)
  // 请求断言，在 axios 拿到的服务器响应为 200 时，可以进一步断言响应对象，以此认定这个请求是否真的成功了，默认是有结果都认为成功
  assert: (resultData: T) => boolean
  // 缓存配置
  cache: {
    // 缓存键，通过这个key来判断请求唯一性，默认是URL + method + params + data 的序列化
    key: string | ((config: EzRequestConfig<D, T>) => string)
    // 有效期ms（默认0不缓存，-1永久有效）
    expire: number
    // 缓存级别（内存缓存刷新页面就丢弃/磁盘缓存会持久化存储在本地）
    level: 'memory' | 'disk'
    // 忽略可能存在的缓存，无论如何都会发起网络请求，默认false
    ignore: boolean
  }
  // 待定的 Result 数据，在响应没有获取到时呈现的内容，默认 undefined
  pendingResult?: T
  // 在响应失败时呈现的内容，默认 undefined，可以传函数，通过attempt生成呈现内容，为0表示不会再重试了，彻底失败
  errorResult?: T | ((attempt: number) => T)
  // 结果响应式对象
  resultRef?: Ref<T>
  // 加载状态响应式对象
  loadingRef?: Ref<boolean>
}

// 响应
export interface EzResponse<T> {
  resultRef: Ref<T | undefined>
  resultPromise: Promise<T>
  loadingRef: Ref<boolean>
}

// 请求缓存（内存）
export interface ResponseCacheMemory<T> {
  response: EzResponse<T>
  expire: number
}

// 请求缓存（磁盘）
export interface ResponseCacheDisk<T> {
  response: T
  expire: number
}

// 请求上下文
export interface RequestContext<D, T> {
  request: EzRequest
  requestConfig: EzRequestConfig<D, T>
  response: EzResponse<T>
  resultPromiseAction: {
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: any) => void
  }
  attempt: number // 当前是第几次请求
}

// 深可选配置
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? DeepPartial<T[K]> // 如果是对象就递归
    : T[K]
}
