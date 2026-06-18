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
  type SelectOption,
  type SelectGroupOption,
} from 'naive-ui'
import { useBrewStore } from '@/stores/brew'
import { formatBrewTime, formatBrewTimeChinese } from '@/utils/format'

const brewStore = useBrewStore()
const dialog = useDialog()
const message = useMessage()

const selectedTemplateId = ref<string | null>(null)
const remainingSeconds = ref(0)
const isRunning = ref(false)
const isFinished = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null

const templateOptions = computed<(SelectOption | SelectGroupOption)[]>(() => {
  const result: (SelectOption | SelectGroupOption)[] = []
  result.push({
    type: 'group',
    label: '系统模板',
    key: 'system-group',
    children: brewStore.systemTemplates.map((t) => ({
      label: t.name,
      value: t.id,
    })),
  })
  if (brewStore.sortedCustomTemplates.length > 0) {
    result.push({
      type: 'group',
      label: '我的方案',
      key: 'custom-group',
      children: brewStore.sortedCustomTemplates.map((t) => ({
        label: t.name,
        value: t.id,
      })),
    })
  }
  return result
})

const selectedSource = computed(() => {
  if (!selectedTemplateId.value) return null
  return brewStore.allTemplates.find((t) => t.id === selectedTemplateId.value)?.source ?? null
})

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null
  return brewStore.getTemplateById(selectedTemplateId.value)
})

const totalTimeDisplay = computed(() => {
  if (!selectedTemplate.value) return '0:00'
  return formatBrewTime(selectedTemplate.value.brewTime)
})

const totalTimeChinese = computed(() => {
  if (!selectedTemplate.value) return '0分00秒'
  return formatBrewTimeChinese(selectedTemplate.value.brewTime)
})

const remainingTimeDisplay = computed(() => {
  return formatBrewTime(remainingSeconds.value)
})

const progressPercent = computed(() => {
  if (!selectedTemplate.value) return 0
  const total = selectedTemplate.value.brewTime
  if (total === 0) return 0
  return ((total - remainingSeconds.value) / total) * 100
})

function clearTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function handleTemplateChange(value: string | null) {
  clearTimerInterval()
  isRunning.value = false
  isFinished.value = false
  selectedTemplateId.value = value
  if (value && selectedTemplate.value) {
    remainingSeconds.value = selectedTemplate.value.brewTime
  } else {
    remainingSeconds.value = 0
  }
}

function startTimer() {
  if (!selectedTemplate.value) {
    message.warning('请先选择一个冲煮模板')
    return
  }
  clearTimerInterval()
  if (isFinished.value) {
    remainingSeconds.value = selectedTemplate.value.brewTime
    isFinished.value = false
  }
  isRunning.value = true
  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    } else {
      clearTimerInterval()
      isRunning.value = false
      handleTimerFinish()
    }
  }, 1000)
}

function pauseTimer() {
  isRunning.value = false
  clearTimerInterval()
}

function resetTimer() {
  clearTimerInterval()
  isRunning.value = false
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

watch(selectedTemplateId, (newId, oldId) => {
  if (newId !== oldId) {
    handleTemplateChange(newId)
  }
})

onUnmounted(() => {
  clearTimerInterval()
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
          placeholder="选择系统模板或我的方案"
          clearable
        />
      </div>

      <div v-if="selectedTemplate" class="template-info">
        <div class="template-header">
          <span class="template-name">{{ selectedTemplate.name }}</span>
          <NTag
            size="small"
            :type="selectedSource === 'system' ? 'info' : 'success'"
          >
            {{ selectedSource === 'system' ? '系统模板' : '自定义' }}
          </NTag>
        </div>
        <NSpace :size="8" wrap class="template-tags">
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
      <div
        class="total-time-display"
        :class="{ 'timer-finished': isFinished }"
      >
        <div class="total-label">建议总时长</div>
        <span class="total-time-text">{{ totalTimeDisplay }}</span>
        <div class="total-subtext">{{ totalTimeChinese }}</div>
      </div>

      <div v-if="selectedTemplate" class="remaining-section">
        <div class="remaining-label">剩余时间</div>
        <div
          class="remaining-time-display"
          :class="{ 'remaining-finished': isFinished }"
        >
          <span class="remaining-time-text">{{ remainingTimeDisplay }}</span>
        </div>

        <div class="progress-bar-wrapper">
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill"
              :style="{ width: `${progressPercent}%` }"
            ></div>
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

.template-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.template-name {
  font-weight: 600;
  color: #6f4e37;
  font-size: 15px;
}

.template-tags {
  margin-bottom: 4px;
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

.total-time-display {
  padding: 32px 20px 24px;
  transition: all 0.3s ease;
  border-bottom: 1px dashed #e8e8e8;
}

.total-label {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.total-time-text {
  font-size: 80px;
  font-weight: 700;
  color: #6f4e37;
  font-family: 'Segoe UI', system-ui, monospace;
  letter-spacing: 4px;
  line-height: 1;
}

.total-subtext {
  margin-top: 12px;
  font-size: 16px;
  color: #999;
}

.timer-finished .total-time-text {
  color: #18a058;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}

.remaining-section {
  padding: 24px 20px 8px;
}

.remaining-label {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.remaining-time-display {
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.remaining-time-text {
  font-size: 48px;
  font-weight: 600;
  color: #a67c52;
  font-family: 'Segoe UI', system-ui, monospace;
  letter-spacing: 3px;
  line-height: 1;
}

.remaining-finished .remaining-time-text {
  color: #18a058;
}

.progress-bar-wrapper {
  margin-bottom: 8px;
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
  margin-top: 16px;
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
  .total-time-text {
    font-size: 60px;
  }

  .total-subtext {
    font-size: 15px;
  }

  .total-time-display {
    padding: 28px 16px 20px;
  }

  .remaining-time-text {
    font-size: 36px;
  }

  .remaining-section {
    padding: 20px 16px 8px;
  }
}
</style>
