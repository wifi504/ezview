import type { AxiosInstance, CreateAxiosDefaults } from 'axios'
import type { DeepPartial, EzRequestConfig, ResponseCacheMemory, ResultData } from './types'
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
    const requestState = new RequestState<D, T>(this, config)
    requestState.dispatch(RequestEvent.START).catch(console.error)
    return requestState.response
  }

  // 发送 GET 请求
  get<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>) {
    const userConfig = config ?? {}
    const merged = mergeConfig<EzRequestConfig<D, T>>(defaultRequestConfig as any, {
      ...(userConfig as any),
      url,
      method: 'get',
    } as any)
    return this.doRequest<T, D>(merged)
  }

  // 清空所有缓存
  async clearCache() {
    this._requestCacheMap.clear()
    await this._requestCacheDisk.clear()
  }
}
