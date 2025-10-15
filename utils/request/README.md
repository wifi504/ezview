# EzRequest

更简单易用且功能强大的前端网络请求库，基于 `Axios` 二次封装

### 1 安装

先安装依赖

```bash
npm i @ezview/request
```

```bash
pnpm i @ezview/request
```

其实用法和 Axios 是大体一致的，请参阅 [Axios官方文档](https://www.axios-http.cn/docs/intro)

然后增量添加了一系列功能

### 2 使用

#### 构造实例

```typescript
import EzRequest from '@ezview/request'

export const request = new EzRequest('i-kun', {
  baseURL: 'http://localhost:8080/api',
  timeout: 3000,
})

```

这里背后就会根据你的这个配置去构造Axios实例，同时，还会初始化本地的对象存储桶，这里的 `i-kun` 就是桶名

#### 实例方法

1. 获取这个 Axios 实例，你可以用来绑定请求响应拦截器之类的

   ```typescript
   get axios(): AxiosInstance
   ```

2. 发送 GET 请求

   ```typescript
   get<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>): EzResponse<T>
   ```

3. 发送 POST 请求

   ```typescript
   post<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>): EzResponse<T>
   ```

4. 发送 PUT 请求

   ```typescript
   put<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>): EzResponse<T>
   ```

5. 发送 DELETE 请求

   ```typescript
   delete<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>): EzResponse<T>
   ```

6. 发送 POST 请求，并把 data 作为 FormData 提交

   ```typescript
   postForm<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>): EzResponse<T>
   ```

7. 发送 PUT 请求，并把 data 作为 FormData 提交

   ```typescript
   putForm<T = ResultData, D = any>(url: string, config?: DeepPartial<EzRequestConfig<D, T>>): EzResponse<T>
   ```

8. 清空所有缓存

   ```typescript
   async clearCache(): Promise<void>
   ```

9. 清空所有过期缓存

   ```typescript
   async clearExpiredCache(): Promise<void>
   ```

#### 请求配置

可以注意到上面的方法都可以传 `EzRequestConfig` ，其实这个就是 `Axios` 的那个请求配置，官方文档里面能怎么用，这里就能怎么用，不过，此框架还支持了许多增量配置，具体如下所示

```typescript
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
}
```

内置的默认配置如下

```typescript
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
```

#### 响应体

可以注意到每个请求方法的返回值都是 `EzResponse `，它是这样的一个对象

```typescript
// 响应
export interface EzResponse<T> {
  resultRef: Ref<T | undefined>
  resultPromise: Promise<T>
  loadingRef: Ref<boolean>
}
```

相当于你只需要把结果

直接 `.resultPromise` 就可以获得 `axiosResponse.data` 的内容的 Promise

直接 `.resultRef` 就可以得到显示 `axiosResponse.data` 的 Vue Ref 对象，框架会根据你之前对 `pendingResult` 和 `errorResult` 自动更新对应内容

直接 `.loadingRef` 就可以获得这个 `resultPromise` 的进行状态的 Vue Ref 对象

### 3 使用示例

这里提供一个例子，你可以运行体验效果

```vue
<template>
  <div>request test</div>
  <button @click="clearCache">
    清空缓存
  </button>
  <div>
    <button @click="btnClick">
      发送一个请求
    </button>
    <button @click="btnClick1">
      发送一堆请求
    </button>
    <input v-model="id" type="text">
    <div v-for="({ resultRef }, index) in list" :key="index">
      {{ index }} &nbsp; {{ resultRef }}
    </div>
  </div>
  <div style="border: 1px solid black; padding: 10px;display: flex;flex-direction: column;gap: 10px;">
    一级缓存
    <div v-for="(item, index) in cacheMap" :key="index" style="background-color: #ffedca;">
      <div>缓存键：{{ item[0] }}</div>
      <div>有效期: {{ item[1].expire === -1 ? '永久有效' : ((item[1].expire - Date.now()) >= 0 ? ((item[1].expire - Date.now()) / 1000).toFixed(3) : '已过期') }}</div>
      <div>缓存对象: {{ item[1].response }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { request } from '@/service/request.ts'

const list = ref<any>([])

const id = ref(1)

function btnClick() {
  list.value.push(request.get('/hello', {
    params: {
      id: id.value,
    },
    pendingResult: '加载中...',
    errorResult: (attempt) => {
      if (attempt > 0) {
        return `正在执行第${attempt}次重试`
      }
      return '请求失败'
    },
    assert: (resultData: any) => resultData.code === 200,
    retry: 3,
  }))
}

function btnClick1() {
  for (let i = 0; i < 200; i++) {
    list.value.push(request.get('/hello', {
      params: {
        id: Math.round(Math.random() * 10),
      },
      pendingResult: '加载中...',
      errorResult: (attempt) => {
        if (attempt > 0) {
          return `正在执行第${attempt}次重试`
        }
        return '请求失败'
      },
      retry: 3,
      assert: (resultData: any) => resultData.code === 200,
      cache: {
        expire: 300 * 1000,
        level: 'disk',
      },
    }))
  }
}

function clearCache() {
  request.clearCache()
}

const cacheMap = ref<any[]>([])
let frameId: number

function updateFrame() {
  cacheMap.value = Array.from(request.requestCacheMap.entries())
  frameId = requestAnimationFrame(updateFrame)
}

onMounted(() => {
  updateFrame()
})

onUnmounted(() => {
  cancelAnimationFrame(frameId)
})
</script>

<style scoped>

</style>
```

其中 `request` 就是前文 `构造实例` 这里的 `request`

用例中，`http://localhost:8080/api/hello?id=xxx` 接口是这样的，你可以参考实现：

```java
@RestController
@RequestMapping("/api")
public class MenuController {

    @GetMapping("/hello")
    public R<?> hello(@RequestParam Integer id) throws InterruptedException {
        long sleep = Math.round(Math.random() * 0.1 * 1000);
        Thread.sleep(sleep);
        boolean isSuccess = Math.random() > 0.1;
        System.out.println("处理请求，请求耗时" + sleep + "ms，请求结果：" + (isSuccess ? "成功" : "失败"));
        return isSuccess ? R.ok("ID参数是：" + id + "，系统时间戳为：" + System.currentTimeMillis()) : R.error(ResultCode.SERVER_ERROR);
    }
}
```

其中 R 对象就是经典的 `{ code: xxx, msg: "消息"， data: /* 各类数据... */ }`，这个就是一个执行时间在 100ms 内并且有 10% 概览报错的一个接口

