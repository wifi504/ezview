import type { Ref } from 'vue'
import type { EzRequest } from './request'
import type { EzRequestConfig, EzResponse, RequestContext, ResponseCacheDisk, ResponseCacheMemory } from './types'
import { effectScope, ref, watch } from 'vue'

// 请求状态枚举
enum State {
  NEW = 'NEW', // 初始化
  RETRIEVING_CACHE = 'RETRIEVING_CACHE', // 获取缓存中
  FETCHING = 'FETCHING', // 网络请求中
  SUCCESS = 'SUCCESS', // 成功返回
  FAILED = 'FAILED', // 失败返回
}

// 请求事件枚举
export enum RequestEvent {
  START = 'START', // 开始
  RESOLVE = 'RESOLVE', // 成功
  REJECT = 'REJECT', // 失败
  RETRY = 'RETRY', // 重试
}

// 请求状态转移动作
type Action = (ctx: RequestContext<any, any>, dispatch: (e: RequestEvent) => Promise<void> | void) => Promise<void> | void

// 请求状态转移表结构
interface Transition {
  next: State
  action?: Action
}

// 获取请求key
function getRequestKey(config: EzRequestConfig<any, any>) {
  let key: string | undefined
  if (typeof config.cache.key === 'string') {
    key = config.cache.key
  }
  if (typeof config.cache.key === 'function') {
    key = config.cache.key(config)
  }
  return key
}

// 获取缓存
const retrievingCacheAction: Action = async (ctx, dispatch) => {
  // 是否忽略缓存
  if (ctx.requestConfig.cache.ignore) {
    dispatch(RequestEvent.REJECT)
    return
  }
  // 获取请求 key
  const key = getRequestKey(ctx.requestConfig)
  if (!key) {
    // 没有获取到key，自然无法获取缓存，直接跳过
    dispatch(RequestEvent.REJECT)
    return
  }
  // 尝试获取一级缓存
  const memoryCache: ResponseCacheMemory<any> | undefined = ctx.request.requestCacheMap.get(key)
  if (memoryCache?.response === ctx.response) {
    // 就是自身，等价于没有获取到一级缓存，需要跳过一级缓存的逻辑
  } else {
    if (memoryCache && (memoryCache.expire === -1 || Date.now() <= memoryCache.expire)) {
      const scope = effectScope()
      scope.run(() => {
        watch(memoryCache.response.resultRef, v => ctx.response.resultRef.value = v, { immediate: true })
      })
      memoryCache.response.resultPromise.finally(() => scope.stop())
      dispatch(RequestEvent.RESOLVE)
      return
    }
  }
  // 尝试获取二级缓存
  const diskCache: ResponseCacheDisk<any> | null = await ctx.request.requestCacheDisk.getItem<ResponseCacheDisk<any>>(key)
  if (diskCache && (diskCache.expire === -1 || Date.now() <= diskCache.expire)) {
    ctx.response.resultRef.value = diskCache.response
    // 暂存到一级缓存提高性能
    ctx.request.requestCacheMap.set(key, {
      response: ctx.response,
      expire: diskCache.expire,
    })
    dispatch(RequestEvent.RESOLVE)
    return
  }
  // 啥也没获取到
  dispatch(RequestEvent.REJECT)
}

// 发起网络请求
const fetchAction: Action = async (ctx, dispatch) => {
  // 在请求次数小于最大限制或者无限重试时，进入请求状态
  if (ctx.requestConfig.retry === -1 || ctx.attempt <= ctx.requestConfig.retry + 1) {
    // 发送请求前的延迟等待
    if (ctx.attempt !== 1) {
      let delay: number = 0
      if (typeof ctx.requestConfig.retryDelay === 'function') {
        delay = ctx.requestConfig.retryDelay(ctx.attempt - 1)
      }
      if (typeof ctx.requestConfig.retryDelay === 'number') {
        delay = ctx.requestConfig.retryDelay
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    try {
      const res = await ctx.request.axios.request(ctx.requestConfig)
      // 判断响应结果是否符合预期
      if (!ctx.requestConfig.assert(res.data)) throw new Error('assert failed!')
      // 成功获取到了响应结果
      ctx.response.resultRef.value = res.data
      // 处理缓存逻辑
      if (ctx.requestConfig.cache.level === 'disk') {
        const key = getRequestKey(ctx.requestConfig)
        if (key) {
          const memoryCache = ctx.request.requestCacheMap.get(key)
          if (memoryCache) {
            await ctx.request.requestCacheDisk.setItem<ResponseCacheDisk<any>>(key, {
              response: res.data,
              expire: memoryCache.expire,
            })
          }
        }
      }
      await dispatch(RequestEvent.RESOLVE)
    } catch {
      // 本次请求失败了，走重试的逻辑
      await dispatch(RequestEvent.RETRY)
    }
  } else {
    // 否则认定请求失败，并且把相关缓存立即删除
    const key = getRequestKey(ctx.requestConfig) || ''
    ctx.request.requestCacheMap.delete(key)
    await ctx.request.requestCacheDisk.removeItem(key)
    await dispatch(RequestEvent.REJECT)
  }
}

// 应用失败提示内容
const applyErrorResult: Action = (ctx, _) => {
  let result
  if (ctx.requestConfig.errorResult) {
    if (typeof ctx.requestConfig.errorResult === 'function') {
      const allowRequest = (ctx.requestConfig.retry === -1 || ctx.attempt <= ctx.requestConfig.retry + 1)
      result = ctx.requestConfig.errorResult(allowRequest ? ctx.attempt - 1 : 0)
    } else {
      result = ctx.requestConfig.errorResult
    }
  }
  ctx.response.resultRef.value = result
}

// 请求状态机对照表
const transitions: Partial<Record<State, Partial<Record<RequestEvent, Transition>>>> = {
  [State.NEW]: {
    [RequestEvent.START]: {
      next: State.RETRIEVING_CACHE,
      action: retrievingCacheAction,
    },
  },
  [State.RETRIEVING_CACHE]: {
    [RequestEvent.RESOLVE]: {
      next: State.SUCCESS,
      action: (ctx) => {
        ctx.resultPromiseAction.resolve(ctx.response.resultRef.value)
        ctx.response.loadingRef.value = false
      },
    },
    [RequestEvent.REJECT]: {
      next: State.FETCHING,
      action: fetchAction,
    },
  },
  [State.FETCHING]: {
    [RequestEvent.RESOLVE]: {
      next: State.SUCCESS,
      action: (ctx) => {
        ctx.resultPromiseAction.resolve(ctx.response.resultRef.value)
        ctx.response.loadingRef.value = false
      },
    },
    [RequestEvent.REJECT]: {
      next: State.FAILED,
      action: (ctx, dispatch) => {
        applyErrorResult(ctx, dispatch)
        ctx.resultPromiseAction.reject({
          comment: '请求失败，详情请见请求上下文',
          context: ctx,
        })
        ctx.response.loadingRef.value = false
      },
    },
    [RequestEvent.RETRY]: {
      next: State.FETCHING,
      action: async (ctx, dispatch) => {
        ctx.attempt++
        applyErrorResult(ctx, dispatch)
        await fetchAction(ctx, dispatch)
      },
    },
  },
}

// 请求状态机
export class RequestState<D, T> {
  private _state: State = State.NEW
  private readonly _ctx: RequestContext<D, T>

  constructor(request: EzRequest, config: EzRequestConfig<D, T>) {
    // 响应 Promise
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: any) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })

    // 请求上下文
    this._ctx = {
      request,
      requestConfig: config,
      response: {
        resultRef: config.resultRef ?? ref() as Ref<T | undefined>,
        resultPromise: promise,
        loadingRef: config.loadingRef ?? ref<boolean>(true),
      },
      resultPromiseAction: {
        resolve,
        reject,
      },
      attempt: 1,
    }

    // 应用默认状态
    this._ctx.response.resultRef.value = config.pendingResult
    this._ctx.response.loadingRef.value = true

    // 缓存请求（无论如何都是先放内存里，磁盘保存要等网络请求之后再说）
    const key = getRequestKey(config)
    // 如果这次请求要求忽略已有缓存，则删除原有的所有缓存
    if (config.cache.ignore) {
      request.requestCacheMap.delete(key || '')
      request.requestCacheDisk.removeItem(key || '').then()
    }
    if (
      config.cache.expire !== 0 // 需要缓存
      && key // 并且有缓存键
      && !( // 并且当前不存在有效缓存
        request.requestCacheMap.get(key)
        && (
          request.requestCacheMap.get(key)!.expire === -1
          || request.requestCacheMap.get(key)!.expire >= Date.now()
        )
      )) {
      if (config.cache.expire === -1) {
        request.requestCacheMap.set(key, {
          response: this._ctx.response,
          expire: -1,
        })
      }
      if (config.cache.expire > 0) {
        request.requestCacheMap.set(key, {
          response: this._ctx.response,
          expire: Date.now() + config.cache.expire,
        })
      }
    }
  }

  get state(): State {
    return this._state
  }

  get response(): EzResponse<T> {
    return this._ctx.response
  }

  // 执行器
  async dispatch(event: RequestEvent) {
    const transition = transitions[this._state]?.[event]
    if (!transition) return
    this._state = transition.next
    await transition.action?.(this._ctx, this.dispatch.bind(this))
  }
}
