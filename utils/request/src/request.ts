import type { AxiosInstance, CreateAxiosDefaults } from 'axios'
import type { DeepPartial, EzRequestConfig, EzResponse, ResultData } from './types'
import axiosLib from 'axios'
import { ref } from 'vue'
import { mergeConfig, stableStringify } from './utils'

const defaultRequsetConfig: EzRequestConfig = {
  url: '',
  method: 'GET',
  retry: 0,
  retryDelay: _ => 3 * 1000,
  cache: {
    key: ({ url, method, params, data }) => {
      const m = method.toUpperCase
      const p = params ? stableStringify(params) : 'param'
      const d = data ? stableStringify(data) : 'data'
      return `${m}|${url}|${p}|${d}`
    },
    expire: 0,
    level: 'memory',
  },
}

export class Request {
  private readonly _axios: AxiosInstance
  private readonly _cacheMap = new Map<string, EzResponse>()

  // 创建 Axios 实例
  constructor(config: CreateAxiosDefaults) {
    this._axios = axiosLib.create(config)
  }

  // 发送请求
  private request<T>(config: EzRequestConfig): EzResponse<T> {
    return {
      resultRef: ref(),
      resultPromise: this._axios.request(config),
      loading: ref(false),
    }
  }

  // 发送 GET 请求
  get<Result = ResultData>(url: string, config: DeepPartial<EzRequestConfig>) {
    return this.request<Result>(mergeConfig(defaultRequsetConfig, config))
  }
}
