<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import {
  NCard,
  NButton,
  NSpace,
  NTag,
  NSelect,
  NText,
  NAlert,
  useDialog,
  useMessage,
} from 'naive-ui'
import { useBrewStore } from '@/stores/brew'
import { formatBrewTime, formatBrewTimeChinese } from '@/utils/format'
import type { SelectOption } from 'naive-ui'

const brewStore = useBrewStore()
const dialog = useDialog()
const message = useMessage()

const selectedTemplateId = ref<string | null>(null)
const remainingSeconds = ref(0)
const isRunning = ref(false)
const isFinished = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null

const templateOptions = computed<SelectOption[]>(() => {
  return brewStore.allTemplates.map((tpl) => ({
    label: tpl.name,
    value: tpl.id,
  }))
})

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null
  return brewStore.getTemplateById(selectedTemplateId.value)
})

const displayTime = computed(() => {
  return formatBrewTime(remainingSeconds.value)
})

const displayTimeChinese = computed(() => {
  return formatBrewTimeChinese(remainingSeconds.value)
})

const progressPercent = computed(() => {
  if (!selectedTemplate.value) return 0
  const total = selectedTemplate.value.brewTime
  if (total === 0) return 0
  return ((total - remainingSeconds.value) / total) * 100
})

function handleTemplateChange(value: string) {
  selectedTemplateId.value = value
  resetTimer()
}

function startTimer() {
  if (!selectedTemplate.value) {
    message.warning('请先选择一个冲煮模板')
    return
  }
  if (isFinished.value) {
    resetTimer()
  }
  isRunning.value = true
  isFinished.value = false
  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    } else {
      stopTimer()
      handleTimerFinish()
    }
  }, 1000)
}

function pauseTimer() {
  isRunning.value = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function stopTimer() {
  isRunning.value = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function resetTimer() {
  stopTimer()
  isFinished.value = false
  if (selectedTemplate.value) {
    remainingSeconds.value = selectedTemplate.value.brewTime
  } else {
    remainingSeconds.value = 0
  }
}

function handleTimerFinish() {
  isFinished.value = true
  playBeep()
  showFinishDialog()
}

function playBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (_e) {
  }
}

function showFinishDialog() {
  dialog.warning({
    title: '⏰ 冲煮时间到！',
    content: `「${selectedTemplate.value?.name}」的冲煮时间已到，请停止注水。`,
    positiveText: '知道了',
    showNegative: false,
  })
}

watch(selectedTemplate, (newTpl) => {
  if (newTpl && !isRunning.value) {
    remainingSeconds.value = newTpl.brewTime
  }
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
})
</script>

<template>
  <div class="timer-page">
    <div class="page-header">
      <h1 class="page-title">冲煮倒计时</h1>
    </div>

    <NCard class="template-select-card">
      <div class="template-select-wrapper">
        <div class="select-label">
          <NText strong>选择冲煮模板</NText>
        </div>
        <NSelect
          v-model:value="selectedTemplateId"
          :options="templateOptions"
          placeholder="请选择一个冲煮模板"
          @update:value="handleTemplateChange"
          clearable
        />
      </div>

      <div v-if="selectedTemplate" class="template-info">
        <NSpace :size="8" wrap>
          <NTag :bordered="false" type="info">粉水比 {{ selectedTemplate.ratio }}</NTag>
          <NTag :bordered="false" type="warning">{{ selectedTemplate.waterTemp }}°C</NTag>
          <NTag :bordered="false" type="success">
            {{ formatBrewTime(selectedTemplate.brewTime) }}
          </NTag>
        </NSpace>
        <p v-if="selectedTemplate.description" class="template-desc">
          {{ selectedTemplate.description }}
        </p>
      </div>
    </NCard>

    <NCard class="timer-display-card">
      <div class="timer-display" :class="{ 'timer-finished': isFinished }">
        <span class="timer-text">{{ displayTime }}</span>
        <div class="timer-subtext">{{ displayTimeChinese }}</div>
      </div>

      <div v-if="selectedTemplate" class="progress-bar-wrapper">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <div class="progress-label">
          已完成 {{ progressPercent.toFixed(0) }}%
        </div>
      </div>

      <div v-if="isFinished" class="finish-banner">
        <NAlert type="success" title="冲煮完成！">
          时间到，请停止注水，享受你的咖啡吧 ☕
        </NAlert>
      </div>
    </NCard>

    <NSpace class="timer-controls" justify="center" :size="16">
      <NButton
        v-if="!isRunning"
        type="primary"
        size="large"
        @click="startTimer"
        :disabled="!selectedTemplate"
      >
        {{ isFinished ? '重新开始' : '开始计时' }}
      </NButton>
      <NButton
        v-else
        type="warning"
        size="large"
        @click="pauseTimer"
      >
        暂停
      </NButton>
      <NButton
        size="large"
        @click="resetTimer"
        :disabled="!selectedTemplate"
      >
        重置
      </NButton>
    </NSpace>

    <NCard v-if="selectedTemplate" class="tips-card">
      <template #header>
        <span>💡 使用提示</span>
      </template>
      <ul class="tips-list">
        <li>选择模板后，点击「开始计时」按钮开始倒计时</li>
        <li>计时过程中可以随时暂停或重置</li>
        <li>倒计时结束时会有提示音和弹窗提醒</li>
        <li>本功能仅用于计时，不会写入冲煮历史记录</li>
      </ul>
    </NCard>
  </div>
</template>

<style scoped>
.timer-page {
  width: 100%;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #6f4e37;
}

.template-select-card {
  margin-bottom: 20px;
}

.template-select-wrapper {
  margin-bottom: 16px;
}

.select-label {
  margin-bottom: 8px;
}

.template-info {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.template-desc {
  margin: 12px 0 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.timer-display-card {
  margin-bottom: 20px;
  text-align: center;
}

.timer-display {
  padding: 40px 20px;
  transition: all 0.3s ease;
}

.timer-text {
  font-size: 96px;
  font-weight: 700;
  color: #6f4e37;
  font-family: 'Segoe UI', system-ui, monospace;
  letter-spacing: 4px;
  line-height: 1;
}

.timer-subtext {
  margin-top: 16px;
  font-size: 18px;
  color: #999;
}

.timer-finished .timer-text {
  color: #18a058;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.progress-bar-wrapper {
  margin-top: 8px;
  padding: 0 20px 20px;
}

.progress-bar-bg {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6f4e37, #a67c52);
  border-radius: 4px;
  transition: width 1s linear;
}

.progress-label {
  margin-top: 8px;
  font-size: 13px;
  color: #999;
  text-align: right;
}

.finish-banner {
  margin: 0 20px 20px;
}

.timer-controls {
  margin-bottom: 20px;
}

.tips-card {
  margin-top: 8px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  color: #666;
  line-height: 2;
}

@media (max-width: 480px) {
  .timer-text {
    font-size: 64px;
  }

  .timer-subtext {
    font-size: 16px;
  }

  .timer-display {
    padding: 30px 16px;
  }
}
</style>
