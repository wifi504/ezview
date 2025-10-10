import type { Ref } from 'vue'
import type { EzRequest } from './request'
import type { EzRequestConfig, EzResponse, RequestContext } from './types'
import { ref } from 'vue'

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

const pendingAction: Action = async (ctx, dispatch) => {
  // 在请求次数小于最大限制或者无限重试时，进入请求状态
  if (ctx.requestConfig.retry === -1 || ctx.attempt <= ctx.requestConfig.retry + 1) {
    try {
      const res = await ctx.request.axios.request(ctx.requestConfig)
      // 判断响应结果是否符合预期
      if (!ctx.requestConfig.assert(res.data)) throw new Error()
      // 成功获取到了响应结果
      ctx.response.resultRef.value = res.data
      ctx.resultPromiseAction.resolve(res.data)
    } catch {
      // 本次请求失败了，走重试的逻辑
      await dispatch(RequestEvent.RETRY)
    }
  } else {
    // 否则认定请求失败
    await dispatch(RequestEvent.REJECT)
  }
}

// 请求状态机对照表
const transitions: Partial<Record<State, Partial<Record<RequestEvent, Transition>>>> = {
  [State.NEW]: {
    [RequestEvent.START]: {
      next: State.RETRIEVING_CACHE,
    },
  },
  [State.RETRIEVING_CACHE]: {
    [RequestEvent.RESOLVE]: {
      next: State.SUCCESS,
    },
    [RequestEvent.REJECT]: {
      next: State.FETCHING,
    },
  },
  [State.FETCHING]: {
    [RequestEvent.RESOLVE]: {
      next: State.SUCCESS,
    },
    [RequestEvent.REJECT]: {
      next: State.FAILED,
    },
    [RequestEvent.RETRY]: {
      next: State.FETCHING,
    },
  },
}

// 请求状态机
export class RequestState<D, T> {
  private _state: State = State.NEW
  private readonly _ctx: RequestContext<D, T>

  constructor(request: EzRequest, config: EzRequestConfig<D, T>) {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: any) => void

    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })

    this._ctx = {
      request,
      requestConfig: config,
      response: {
        resultRef: ref(config.pendingResult) as Ref<T | undefined>,
        resultPromise: promise,
        loadingRef: ref<boolean>(true),
      },
      resultPromiseAction: {
        resolve,
        reject,
      },
      attempt: 1,
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
