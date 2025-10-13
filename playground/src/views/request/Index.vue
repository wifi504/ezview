<template>
  <div>request test</div>
  <button @click="clearCache">
    清空缓存
  </button>
  <div style="border: 1px solid black; padding: 10px;display: flex;flex-direction: column;gap: 10px;">
    一级缓存
    <div v-for="(item, index) in cacheMap" :key="index" style="background-color: #ffedca;">
      <div>缓存键：{{ item[0] }}</div>
      <div>有效期: {{ item[1].expire === -1 ? '永久有效' : ((item[1].expire - Date.now()) >= 0 ? ((item[1].expire - Date.now()) / 1000).toFixed(3) : '已过期') }}</div>
      <div>缓存对象: {{ item[1].response }}</div>
    </div>
  </div>
  <div>
    <button @click="btnClick">
      发送请求
    </button>
    <input v-model="id" type="text">
    <div v-for="({ resultRef }, index) in list" :key="index">
      {{ resultRef }}
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
    retry: 3,
    assert: (resultData: any) => resultData.code === 200,
    cache: {
      expire: -1,
      level: 'disk',
    },
  }))
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
