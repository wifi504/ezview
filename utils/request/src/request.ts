import type { AxiosInstance, CreateAxiosDefaults } from 'axios'
import type { DeepPartial, EzRequestConfig, ResponseCacheDisk, ResponseCacheMemory, ResultData } from './types'
import axiosLib from 'axios'
import localforage from 'localforage'
import { RequestEvent, RequestState } from './state'
import { mergeConfig, stableStringify } from './utils'

const defaultRequestConfig: EzRequestConfig<any, any> = {
  url: '',
  method: 'get',
  retry: 0,
  retryDelay: 3 * 1000,
  assert: resultData => !!resultData,
  cache: {
    key: ({ url, method, params, data }) => {
      const m = method.toUpperCase()
      const p = params ? stableStringify(params) : 'param'
      const d = data ? stableStringify(data) : 'data'
      return `${m}|${url}|${p}|${d}`
    },
    expire: 0,
    level: 'memory',
    ignore: false,
  },
}

export class EzRequest {
  private readonly _axios: AxiosInstance
  private readonly _requestCacheMap = new Map<string, ResponseCacheMemory<any>>()
  private readonly _requestCacheDisk: LocalForage
  private readonly _clearCacheInterval: number = 60 * 1000
  private _clearCacheLastHandledTime: number = 0

  // 创建 Axios 实例
  constructor(name: string, config?: CreateAxiosDefaults) {
    this._axios = axiosLib.create(config)
    this._requestCacheDisk = localforage.createInstance({
      name: 'ezview-request-cache',
      storeName: `request-cache-${name}`,
    })
  }

  get axios(): AxiosInstance {
    return this._axios
  }

  get requestCacheMap(): Map<string, ResponseCacheMemory<any>> {
    return this._requestCacheMap
  }

  get requestCacheDisk(): LocalForage {
    return this._requestCacheDisk
  }

  // 发送请求
  private doRequest<T, D>(config: EzRequestConfig<D, T>) {
    // 初始化请求状态机并执行
    const requestState = new RequestState<D, T>(this, config)
    requestState.dispatch(RequestEvent.START).catch(console.error)
    // 节流处理已过期缓存
    const now = Date.now()
    if (now - this._clearCacheLastHandledTime >= this._clearCacheInterval) {
      this._clearCacheLastHandledTime = now
      this.clearExpiredCache().catch(console.error)
    }
    return requestState.response
  }

  // 发送 GET 请求
  get<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>) {
    const userConfig = config ?? {}
    const merged = mergeConfig<D, T>(defaultRequestConfig, {
      ...userConfig,
      url,
      method: 'get',
    })
    return this.doRequest<T, D>(merged)
  }

  // 发送 POST 请求
  post<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>) {
    const userConfig = config ?? {}
    const merged = mergeConfig<D, T>(defaultRequestConfig, {
      ...userConfig,
      url,
      method: 'post',
    })
    return this.doRequest<T, D>(merged)
  }

  // 发送 PUT 请求
  put<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>) {
    const userConfig = config ?? {}
    const merged = mergeConfig<D, T>(defaultRequestConfig, {
      ...userConfig,
      url,
      method: 'put',
    })
    return this.doRequest<T, D>(merged)
  }

  // 发送 DELETE 请求
  delete<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>) {
    const userConfig = config ?? {}
    const merged = mergeConfig<D, T>(defaultRequestConfig, {
      ...userConfig,
      url,
      method: 'delete',
    })
    return this.doRequest<T, D>(merged)
  }

  // 发送 POST 请求，并把 data 作为 FormData 提交
  postForm<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>) {
    const userConfig = config ?? {}
    const data = userConfig.data as Record<string, any> | undefined
    const formData = new FormData()
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value as any)
      })
    }
    const merged = mergeConfig<any, T>(defaultRequestConfig, {
      ...userConfig,
      url,
      method: 'post',
      data: formData,
      headers: {
        ...userConfig.headers,
        'Content-Type': 'multipart/form-data',
      },
    })
    return this.doRequest<T, D>(merged)
  }

  // 发送 PUT 请求，并把 data 作为 FormData 提交
  putForm<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>) {
    const userConfig = config ?? {}
    const data = userConfig.data as Record<string, any> | undefined
    const formData = new FormData()
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value as any)
      })
    }
    const merged = mergeConfig<any, T>(defaultRequestConfig, {
      ...userConfig,
      url,
      method: 'put',
      data: formData,
      headers: {
        ...userConfig.headers,
        'Content-Type': 'multipart/form-data',
      },
    })
    return this.doRequest<T, D>(merged)
  }

  // 清空所有缓存
  async clearCache() {
    this._requestCacheMap.clear()
    await this._requestCacheDisk.clear()
  }

  // 清空所有过期缓存
  async clearExpiredCache() {
    const now = Date.now()

    // 1. 清理内存缓存
    for (const [key, cache] of this._requestCacheMap.entries()) {
      if (!cache) continue
      if (now > cache.expire) {
        this._requestCacheMap.delete(key)
      }
    }

    // 2. 清理磁盘缓存
    const keysToRemove: string[] = []
    await this._requestCacheDisk.iterate<ResponseCacheDisk<any>, void>((value, key) => {
      if (!value) return
      if (now > value.expire) {
        keysToRemove.push(key)
      }
    })
    await Promise.all(keysToRemove.map(key => this._requestCacheDisk.removeItem(key)))
  }
}
