<template>
  <div class="resume-modification-page" />
</template>

<script lang="ts" setup>
import type { MyWorkerArgs } from '@/utils/my-worker.ts'
import ThreadPool from '@ezview/threadpool'
import { newMyWorker } from '@/utils/worker-builder.ts'

const threadpool = new ThreadPool(newMyWorker, [])
const task: MyWorkerArgs = {
  id: 1,
  name: 'jack',
  data: new ArrayBuffer(32),
}
threadpool.submit(task, [task.data]).then(res => console.log(res))
</script>

<style scoped></style>
