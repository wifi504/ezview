import type { AxiosInstance, CreateAxiosDefaults } from 'axios'
import type { DeepPartial, EzRequestConfig, EzResponse, ResponseCache, ResultData } from './types'
import axiosLib from 'axios'
import localforage from 'localforage'
import { RequestEvent, RequestState } from './state'
import { mergeConfig, stableStringify } from './utils'

const defaultRequestConfig: EzRequestConfig<any, any> = {
  url: '',
  method: 'GET',
  retry: 0,
  retryDelay: () => 3 * 1000,
  assert: resultData => !!resultData,
  cache: {
    key: ({ url, method, params, data }) => {
      const m = method.toUpperCase
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
  private readonly _requestCacheMap = new Map<string, ResponseCache<any>>()
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

  get requestCacheMap(): Map<string, ResponseCache<any>> {
    return this._requestCacheMap
  }

  get requestCacheDisk(): LocalForage {
    return this._requestCacheDisk
  }

  // 从缓存获取请求
  private async getCache<D, T>(config: EzRequestConfig<D, T>) {
    // 获取请求 key
    let key: string
    if (typeof config.cache.key === 'string') {
      key = config.cache.key
    } else {
      key = config.cache.key(config)
    }
    // 尝试获取一级缓存
    const memoryCache = this._requestCacheMap.get(key)
    if (memoryCache && Date.now() <= memoryCache.expire) {
      return memoryCache.response as EzResponse<T>
    }
    // 尝试获取二级缓存
    const diskCache = await this._requestCacheDisk.getItem<ResponseCache<any>>(key)
    if (diskCache && Date.now() <= diskCache.expire) {
      return diskCache.response as EzResponse<T>
    }
    return null
  }

  // 发送请求
  private doRequest<T, D>(config: EzRequestConfig<D, T>) {
    const requestState = new RequestState<D, T>(this, config)
    requestState.dispatch(RequestEvent.START).catch(console.error)
    return requestState.response
  }

  // 发送 GET 请求
  get<T = ResultData, D = any>(url: string, config: DeepPartial<EzRequestConfig<D, T>>) {
    config.url = url
    config.method = 'GET'
    return this.doRequest<T, D>(mergeConfig(defaultRequestConfig, config))
  }
}
