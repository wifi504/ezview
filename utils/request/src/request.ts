import type { AxiosInstance, CreateAxiosDefaults } from 'axios'
import type { Ref } from 'vue'
import type { DeepPartial, EzRequestConfig, EzResponse, ResponseCacheHolder, ResultData } from './types'
import axiosLib from 'axios'
import localforage from 'localforage'
import { ref } from 'vue'
import { mergeConfig, stableStringify } from './utils'

const defaultRequestConfig: EzRequestConfig = {
  url: '',
  method: 'GET',
  retry: 0,
  retryDelay: () => 3 * 1000,
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

export class Request {
  private readonly _axios: AxiosInstance
  private readonly _requestCacheMap = new Map<string, ResponseCacheHolder<any>>()
  private readonly _requestCacheDisk: LocalForage

  // 创建 Axios 实例
  constructor(name: string, config?: CreateAxiosDefaults) {
    this._axios = axiosLib.create(config)
    this._requestCacheDisk = localforage.createInstance({
      name: 'ezview-request-cache',
      storeName: `request-cache-${name}`,
    })
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
    const diskCache = await this._requestCacheDisk.getItem<ResponseCacheHolder<any>>(key)
    if (diskCache && Date.now() <= diskCache.expire) {
      return diskCache.response as EzResponse<T>
    }
    return null
  }

  // 发送请求
  private doRequest<T, D>(config: EzRequestConfig<D, T>): ResponseCacheHolder<T> {
    let expire: number
    let attempt: number
    const resultRef = ref(config.pendingResult) as Ref<T | undefined>
    const resultPromise = new Promise<T>(async (resolve, reject) => {
      // 处理完全不走缓存的情况
      if (config.cache.ignore) {
        try {
          const res = await this._axios.request<T>(config)
          resultRef.value = res.data
          resolve(res.data)
        } catch (e) {
        }
      }
    })
    return {
      response: { resultRef, resultPromise, loading: ref(false) },
      expire,
      attempt
    }
  }

  // 发送 GET 请求
  get<T = ResultData, D = any>(url: string, config: DeepPartial<EzRequestConfig<D, T>>) {
    config.url = url
    config.method = 'GET'
    return this.doRequest<T, D>(mergeConfig(defaultRequestConfig, config))
  }
}
