# 基于 Web Worker 实现的线程池，Vite 优雅可用

## 1. 简介

其实网上可以轻松找到许多现成的框架，比如 `workerpool` 、 `threads.js` 等等，但是在使用时我们不难发现，这些框架的设计几乎都是在构造函数要求你直接把Worker的路径传给他，毕竟它们底层维护Worker实例的时候需要管理生命周期，而创建Worker的这一步肯定是

```typescript
// https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers
const myWorker = new Worker("worker.js");
```

这就存在两个棘手的问题了：

1. 我们可以阅读 [Vite官方文档 - Web Worker](https://cn.vitejs.dev/guide/features.html#web-workers)，不难发现，Vite 提供了一种优雅的 new Worker 的方式，可以直接把你写的 Worker 文件作为模块导入，可惜如果你要使用那些框架，别人要求你提供 Worker 的时候是字符串，而你这里会直接拿到一个 new 出来的 Worker，可以说完全无法兼容。
2. 如果你的项目是 TypeScript 工程，你的 Worker 脚本肯定也得用，最后 `worker.js` 这样的文件根本不存在，因为你写的是 `worker.ts` ，这里就导致了开发环境和生产环境不一致，因为打包工具的处理逻辑不同，经常会出现各种千奇百怪的问题，导致你开发的时候能用，一打包就废了。

此线程池框架完美解决了这些问题，并且如果你用过 Java，你会发现这套线程池几乎就是复刻了 `FixedThreadPool`，以及把 Java 的 Thread <-- Runnable 这套模型照搬了过来。

## 2. 安装

```bash
npm i @ezview/threadpool
```

```bash
pnpm i @ezview/threadpool
```

## 3. 配置说明（Vite）

本框架基于 **Web Worker**，在使用时需要确保构建工具正确支持 Worker 的导入。
 在 Vite 项目中，你需要在 `vite.config.ts` 中显式配置 Worker 的输出格式为 **ES Module**：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  worker: {
    format: 'es', // 必须指定为 ES Module
  },
})
```

如果不设置 `worker.format = 'es'`，Vite 默认可能会使用 IIFE 格式，导致 `import ... from 'xxx?worker'` 无法正常工作，从而报错。

通过该配置，Vite 会将你的 Worker 文件打包为 **独立的 ES 模块 Worker**，并且允许你使用 TypeScript/ES6 的语法。

## 4. 快速开始

下面通过一个完整的例子，演示如何定义 Worker、构建 Worker 工厂函数，并将其与线程池配合使用。

### 4.1 创建 Worker 构建器

由于 Vite 的 Worker 需要通过 `?worker` 后缀导入，我们可以在单独的文件中封装一个 Worker 工厂函数：

```typescript
// worker-builder.ts
import MyWorker from './my-worker?worker'

export function newMyWorker(): Worker {
  return new MyWorker()
}
```

这样在主线程中可以直接使用 `newMyWorker()` 获取一个全新的 Worker 实例。

### 4.2 定义 Worker 逻辑

在 Worker 文件中，我们使用框架提供的 `defineWorker` 方法来注册任务处理函数。
 只需要编写一个 `main` 函数，框架会自动处理消息接收、结果返回等逻辑。

```typescript
// my-worker.ts
import { defineWorker } from '@ezview/threadpool'

// 定义任务的参数类型
export interface MyWorkerArgs {
  id: number
  name: string
  data: ArrayBuffer
}

// 将 main 函数注册为 Worker 入口
defineWorker(main)

// 实际执行的任务逻辑
function main(args: MyWorkerArgs) {
  console.log(args.id, args.name, args.data)
  return '执行完毕'
}
```

这里的 `main` 可以是同步函数，也可以是异步函数（返回 Promise），返回结果会自动传递给主线程。

### 4.3 使用线程池提交任务

在主线程中，你可以通过 `ThreadPool` 来管理多个 Worker。
 通过 `submit` 方法提交任务，并指定需要 **转移所有权** 的对象（如 `ArrayBuffer`）可以避免数据拷贝，提高性能。

```typescript
// demo.ts
import type { MyWorkerArgs } from '@/utils/my-worker.ts'
import ThreadPool from '@ezview/threadpool'
import { newMyWorker } from '@/utils/worker-builder.ts'

// 创建线程池，初始池为空，按需创建 Worker
const threadpool = new ThreadPool(newMyWorker, [])

// 定义任务参数
const task: MyWorkerArgs = {
  id: 1,
  name: 'jack',
  data: new ArrayBuffer(32),
}

// 提交任务，第二个参数指定需要转移的对象
threadpool.submit(task, [task.data]).then(res => {
  console.log('任务结果：', res)
})
```

执行以上代码后，`my-worker.ts` 中的 `main` 函数会被调用，并返回结果 `'执行完毕'`，最终在主线程打印出来：

```
[ThreadPool][2025-09-29 09:59:55 660][j7MnKpCm][info] 构造了新的线程池，Worker 的工厂是：
 ƒ newMyWorker() {
  return new MyWorker();
}

[ThreadPool][2025-09-29 09:59:55 661][j7MnKpCm][info] 开始初始化/调度线程池...

[Thread][2025-09-29 09:59:55 663][T56ZxtTQ][info] 创建了新的线程

[ThreadPool][2025-09-29 09:59:55 663][j7MnKpCm][info] 池中增加了线程： Thread {_runFlag: true, _status: 'NEW', _logger: Logger, _worker: Worker, _takeTask: ƒ, …}

[Thread][2025-09-29 09:59:55 664][T56ZxtTQ][info] 线程开始运行...

[Thread][2025-09-29 09:59:55 666][8RG5X76S][info] 创建了新的线程

[ThreadPool][2025-09-29 09:59:55 667][j7MnKpCm][info] 池中增加了线程： Thread {_runFlag: true, _status: 'NEW', _logger: Logger, _worker: Worker, _takeTask: ƒ, …}

[Thread][2025-09-29 09:59:55 667][8RG5X76S][info] 线程开始运行...

[Thread][2025-09-29 09:59:55 675][T56ZxtTQ][info] 开始执行！获取到任务 Task: {id: 0, data: {…}, transfer: Array(1), result: {…}}

[Worker][2025-09-29 09:59:55 794][MGrq3iC1][info] 开始执行任务...
function  ƒ main(args) {
  console.log(args.id, args.name, args.data);
  return "执行完毕";
} 
传递参数： {id: 1, name: 'jack', data: ArrayBuffer(32)}

1 'jack' ArrayBuffer(32)

[Worker][2025-09-29 09:59:55 794][MGrq3iC1][info] 任务执行结束！获取到返回值： 执行完毕 
任务是 function ƒ main(args) {
  console.log(args.id, args.name, args.data);
  return "执行完毕";
} 
传递参数： {id: 1, name: 'jack', data: ArrayBuffer(32)}

[Thread][2025-09-29 09:59:55 794][T56ZxtTQ][info] 执行结束！Task: {id: 0, data: {…}, transfer: Array(1), result: {…}}

执行完毕
```

## 5. 核心模块说明

本框架的实现基于 **线程池 + Worker 抽象层**，通过几个核心模块共同工作，确保任务能够被安全、可靠地分发和执行。下面分别说明每个模块的作用和使用场景。

### 5.1 ThreadPool（线程池）

`ThreadPool` 是整个框架的核心入口，用于统一管理多个线程（Worker）。

- **构造函数**

  ```typescript
  const pool = new ThreadPool(
    workerBuilder: () => Worker,
    eventProcessors: EventProcessor[],
    targetPoolSize?: number,
    terminateOnError: boolean = true
  )
  ```

  - `workerBuilder`：Worker 工厂函数，用于创建新的 Worker（例如 `() => new MyWorker()`）。
  - `eventProcessors`：事件处理器数组，用于定义主线程如何处理来自 Worker 的自定义事件。
  - `targetPoolSize`：目标线程数，默认为 `2`。
  - `terminateOnError`：是否在 Worker 内部抛出异常时自动销毁该线程，默认为 `true`。

- **主要方法**

  - `submit(data?: any, transfer?: Transferable[]): Promise<any>`
     向线程池提交一个任务，返回一个 Promise，用于获取执行结果。
    - `data`：任务数据，会传给 Worker 的 `main` 函数。
    - `transfer`：可选参数，指定需要转移所有权的对象（如 `ArrayBuffer`）。
  - `restart()`
     重新启动线程池，如果已关闭则开启，如果已开启则重启。
  - `shutdown()`
     关闭线程池，清空所有任务并终止线程。

- **特点**

  - 通过 `BlockingQueue` 保证任务调度的 FIFO 顺序。
  - 线程数量会动态与目标值对齐（新增或销毁线程）。
  - 提供 `subscribePoolSize` 和 `subscribeTaskQueueSize` 以便监听池状态变化。

### 5.2 Thread（线程）

`Thread` 是对单个 Web Worker 的抽象封装，负责执行具体任务、处理异常并维持运行状态。

- **构造函数**

  ```typescript
  const thread = new Thread(
    worker: Worker,
    takeTask: () => Promise<Task>,
    eventProcessors?: EventProcessor[],
    terminateOnError: boolean = true
  )
  ```

  - `worker`：由 `workerBuilder` 创建的实际 Web Worker 实例。
  - `takeTask`：获取任务的函数，一般从 `BlockingQueue<Task>` 中取任务。
  - `eventProcessors`：可选参数，自定义事件处理器数组，用于处理来自 Worker 的消息。
  - `terminateOnError`：遇到异常时是否终止线程，默认为 `true`。

- **状态类型**

  ```typescript
  type Status = 'NEW' | 'BLOCKED' | 'RUNNING' | 'TERMINATED'
  ```

  - `NEW`：新建状态，线程尚未运行。
  - `BLOCKED`：阻塞状态，等待新任务。
  - `RUNNING`：运行状态，正在执行任务。
  - `TERMINATED`：已终止状态，不再工作。

- **主要方法**

  - `async start(): Promise<void>`
     启动线程，进入循环：不断从阻塞队列取任务 → 执行任务 → 处理结果。
    - 任务成功 → 调用 `resolve` 返回结果。
    - 任务异常 → 调用 `reject` 并根据 `terminateOnError` 判断是否销毁线程。
  - `terminate(): void`
     立即结束并销毁线程，释放 Worker 资源。
  - `requestTerminate(): Promise<void>`
     请求在**当前任务执行完后**关闭线程，返回一个 Promise，用于等待销毁完成。

- **特点**

  - 每个 `Thread` 都会验证目标 Worker 是否由 `defineWorker()` 定义。

### 5.3 Worker API

Worker API 是一组辅助函数，帮助开发者在 Worker 与主线程之间建立规范化的通信协议。所有 Worker 必须通过 `defineWorker()` 定义入口函数，否则线程池会判定其不可用。

- **`defineWorker(main: (args: any) => any | Promise<any>): void`**
   定义 Worker 的入口函数。
  - Worker 收到 `run-main` 消息时，会调用 `main(args)` 并返回结果或异常。
  - 定义后会自动响应主线程的 `require-define` 校验消息。
- **`postToMain(type: string, data?: any): void`**
   在 Worker 内部主动向主线程发送自定义事件。
  - 典型用途：发送进度信息、日志、状态更新等。
  - 主线程需在 `ThreadPool` 初始化时传入对应的 `eventProcessors` 才能处理这些事件。
- **`receiveEvent(processors: EventProcessor[]): (e: MessageEvent) => void`**
   在主线程中注册消息处理器。
  - `processors` 为 `EventProcessor[]`，每个包含 `type` 与 `handler`。
  - 当 Worker 发来对应 `type` 的事件时，调用相应处理函数。
- **`requestTerminate(message?: string): void`**
   在 Worker 内部调用，请求主线程在当前任务完成后关闭本 Worker。
  - 可选参数 `message` 用于说明关闭原因，会在日志中打印。

## 6. 其他

其实这个线程池写的非常简洁，用法也很简单，如果使用中发现了什么问题的话，推荐先阅读源码（注释真的很详细）尝试解决，如果是框架问题欢迎提出issue或者pr！

















