<template>
  <div>request test</div>
  <div>
    {{ res }}
  </div>
</template>

<script setup lang="ts">
import { request } from '@/service/request.ts'

const res = request.get('/hello', {
  pendingResult: '加载中...',
  errorResult: (attempt) => {
    if (attempt > 0) {
      return `正在执行第${attempt}次重试`
    }
    return '请求失败'
  },
  retry: 10,
  assert: (resultData: any) => resultData.code && resultData.code === 200,
}).resultPromise
</script>

<style scoped>

</style>
