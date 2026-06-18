<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NEmpty,
  NButton,
  NTag,
  NRate,
  NPopconfirm,
  NSpace,
  NText,
  NModal,
  useMessage,
} from 'naive-ui'
import { useBrewStore } from '@/stores/brew'
import { formatBrewTime, formatDate } from '@/utils/format'
import {
  createBackupData,
  serializeBackup,
  downloadBackup,
  parseBackup,
  readFileAsText,
  validateBackupRecords,
  type BackupData,
} from '@/utils/backup'

const router = useRouter()
const message = useMessage()
const brewStore = useBrewStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingBackupData = ref<BackupData | null>(null)
const pendingInvalidCount = ref(0)
const showRestoreDialog = ref(false)
const showOverwriteConfirm = ref(false)
const showMergeConfirm = ref(false)

const restoreSummary = computed(() => {
  if (!pendingBackupData.value) return ''
  const { records } = pendingBackupData.value
  const parts: string[] = []
  if (records.length > 0) {
    parts.push(`${records.length} 条冲煮记录`)
  }
  if (pendingInvalidCount.value > 0) {
    parts.push(`忽略 ${pendingInvalidCount.value} 条无效数据`)
  }
  return parts.join('，')
})

const restoreValidCount = computed(() => {
  return pendingBackupData.value?.records.length ?? 0
})

function goNew() {
  router.push({ name: 'new' })
}

function handleDelete(id: string) {
  brewStore.deleteRecord(id)
  message.success('记录已删除')
}

function handleBackup() {
  const backupData = createBackupData(brewStore.records)
  const content = serializeBackup(backupData)
  downloadBackup(content)
  message.success('备份文件已下载')
}

function handleRestoreClick() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const text = await readFileAsText(file)
    const backupData = parseBackup(text)
    const validateResult = validateBackupRecords(backupData.records)

    if (validateResult.valid.length === 0) {
      if (validateResult.invalidCount > 0) {
        message.warning(`备份文件中没有有效记录（忽略 ${validateResult.invalidCount} 条无效数据）`)
      } else {
        message.warning('备份文件中没有有效记录')
      }
      input.value = ''
      return
    }

    pendingBackupData.value = {
      ...backupData,
      records: validateResult.valid,
    }
    pendingInvalidCount.value = validateResult.invalidCount
    showRestoreDialog.value = true
  } catch (e) {
    message.error((e as Error).message || '文件解析失败')
  }

  input.value = ''
}

function handleMergeClick() {
  showMergeConfirm.value = true
}

function confirmMergeRestore() {
  if (!pendingBackupData.value) return
  const data = pendingBackupData.value
  const addedRecords = brewStore.addRecords(data.records)
  let msg = `恢复成功：新增 ${addedRecords} 条记录`
  if (pendingInvalidCount.value > 0) {
    msg += `（忽略 ${pendingInvalidCount.value} 条无效数据）`
  }
  message.success(msg)
  showMergeConfirm.value = false
  showRestoreDialog.value = false
  pendingBackupData.value = null
  pendingInvalidCount.value = 0
}

function cancelMergeConfirm() {
  showMergeConfirm.value = false
}

function handleOverwriteClick() {
  showOverwriteConfirm.value = true
}

function confirmOverwriteRestore() {
  if (!pendingBackupData.value) return
  const data = pendingBackupData.value
  brewStore.replaceRecords(data.records)
  let msg = `恢复成功：共 ${data.records.length} 条记录`
  if (pendingInvalidCount.value > 0) {
    msg += `（忽略 ${pendingInvalidCount.value} 条无效数据）`
  }
  message.success(msg)
  showOverwriteConfirm.value = false
  showRestoreDialog.value = false
  pendingBackupData.value = null
  pendingInvalidCount.value = 0
}

function cancelOverwriteConfirm() {
  showOverwriteConfirm.value = false
}

function cancelRestore() {
  showRestoreDialog.value = false
  pendingBackupData.value = null
  pendingInvalidCount.value = 0
}
</script>

<template>
  <div class="history-page">
    <div class="page-header">
      <h1 class="page-title">冲煮历史</h1>
      <NButton type="primary" @click="goNew">新建记录</NButton>
    </div>

    <NCard class="backup-section" size="small">
      <template #header>
        <div class="backup-header">
          <span class="backup-title">数据备份与恢复</span>
          <NText depth="3" class="backup-desc">
            备份您的冲煮记录，或从备份文件恢复
          </NText>
        </div>
      </template>
      <NSpace :size="12">
        <NButton @click="handleBackup" type="info">
          下载备份
        </NButton>
        <NButton @click="handleRestoreClick" type="success">
          从文件恢复
        </NButton>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json,application/json"
          style="display: none"
          @change="handleFileChange"
        />
      </NSpace>
    </NCard>

    <NEmpty
      v-if="brewStore.sortedRecords.length === 0"
      description="还没有冲煮记录，开始你的第一杯吧"
      class="empty-state"
    >
      <template #extra>
        <NButton type="primary" @click="goNew">新建记录</NButton>
      </template>
    </NEmpty>

    <NSpace v-else vertical :size="12" class="records-list">
      <NCard
        v-for="record in brewStore.sortedRecords"
        :key="record.id"
        size="small"
        :title="record.templateName"
      >
        <template #header-extra>
          <NText depth="3">{{ formatDate(record.date) }}</NText>
        </template>

        <NSpace vertical :size="8">
          <NSpace :size="8" wrap>
            <NTag :bordered="false" type="info">粉水比 {{ record.ratio }}</NTag>
            <NTag :bordered="false" type="warning">{{ record.waterTemp }}°C</NTag>
            <NTag :bordered="false" type="success">
              {{ formatBrewTime(record.brewTime) }}
            </NTag>
          </NSpace>

          <div class="rating-row">
            <span class="label">评分</span>
            <NRate :value="record.rating" readonly size="small" />
          </div>

          <p v-if="record.notes" class="notes">{{ record.notes }}</p>
        </NSpace>

        <template #action>
          <NPopconfirm @positive-click="handleDelete(record.id)">
            <template #trigger>
              <NButton size="small" quaternary type="error">删除</NButton>
            </template>
            确定删除这条冲煮记录吗？
          </NPopconfirm>
        </template>
      </NCard>
    </NSpace>

    <NModal
      v-model:show="showRestoreDialog"
      :mask-closable="false"
      preset="dialog"
      title="恢复备份"
      :content="`检测到 ${restoreSummary}，请选择恢复方式：`"
      positive-text="合并（保留现有）"
      negative-text="取消"
      @positive-click="handleMergeClick"
      @negative-click="cancelRestore"
    >
      <template #action>
        <NSpace justify="end">
          <NButton quaternary @click="cancelRestore">取消</NButton>
          <NButton type="success" @click="handleMergeClick">
            合并（保留现有）
          </NButton>
          <NButton type="warning" @click="handleOverwriteClick">
            覆盖（清空现有）
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showMergeConfirm"
      :mask-closable="false"
      preset="dialog"
      title="确认合并恢复"
      type="info"
      :content="`将合并 ${restoreValidCount} 条记录到现有数据中，相同 ID 的记录将被跳过。确定继续吗？`"
      positive-text="确定合并"
      negative-text="取消"
      @positive-click="confirmMergeRestore"
      @negative-click="cancelMergeConfirm"
    />

    <NModal
      v-model:show="showOverwriteConfirm"
      :mask-closable="false"
      preset="dialog"
      title="确认覆盖"
      type="warning"
      content="此操作将清空所有现有记录，然后恢复备份中的数据。此操作不可撤销，确定继续吗？"
      positive-text="确定覆盖"
      negative-text="取消"
      @positive-click="confirmOverwriteRestore"
      @negative-click="cancelOverwriteConfirm"
    />
  </div>
</template>

<style scoped>
.history-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #6f4e37;
}

.backup-section {
  margin-bottom: 20px;
}

.backup-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.backup-title {
  font-weight: 500;
  color: #6f4e37;
}

.backup-desc {
  font-size: 12px;
}

.empty-state {
  margin-top: 48px;
}

.records-list {
  margin-top: 0;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 13px;
  color: #888;
}

.notes {
  margin: 0;
  font-size: 14px;
  color: #555;
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>
