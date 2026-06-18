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
  validateBackupTemplates,
  type BackupData,
} from '@/utils/backup'

const router = useRouter()
const message = useMessage()
const brewStore = useBrewStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingBackupData = ref<BackupData | null>(null)
const showRestoreDialog = ref(false)
const showOverwriteConfirm = ref(false)

const restoreSummary = computed(() => {
  if (!pendingBackupData.value) return ''
  const { records, customTemplates } = pendingBackupData.value
  const parts: string[] = []
  if (records.length > 0) {
    parts.push(`${records.length} 条冲煮记录`)
  }
  if (customTemplates.length > 0) {
    parts.push(`${customTemplates.length} 个自定义方案`)
  }
  return parts.join('，')
})

function goNew() {
  router.push({ name: 'new' })
}

function handleDelete(id: string) {
  brewStore.deleteRecord(id)
  message.success('记录已删除')
}

function handleBackup() {
  const backupData = createBackupData(brewStore.records, brewStore.customTemplates)
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
    const validRecords = validateBackupRecords(backupData.records)
    const validTemplates = validateBackupTemplates(backupData.customTemplates)

    if (validRecords.length === 0 && validTemplates.length === 0) {
      message.warning('备份文件中没有有效的数据')
      input.value = ''
      return
    }

    pendingBackupData.value = {
      ...backupData,
      records: validRecords,
      customTemplates: validTemplates,
    }
    showRestoreDialog.value = true
  } catch (e) {
    message.error((e as Error).message || '文件解析失败')
  }

  input.value = ''
}

function handleMergeRestore() {
  if (!pendingBackupData.value) return
  const data = pendingBackupData.value
  const addedRecords = brewStore.addRecords(data.records)
  const addedTemplates = brewStore.addCustomTemplates(data.customTemplates)
  message.success(
    `恢复成功：新增 ${addedRecords} 条记录${addedTemplates > 0 ? `，${addedTemplates} 个方案` : ''}`
  )
  showRestoreDialog.value = false
  pendingBackupData.value = null
}

function handleOverwriteClick() {
  showOverwriteConfirm.value = true
}

function confirmOverwriteRestore() {
  if (!pendingBackupData.value) return
  const data = pendingBackupData.value
  brewStore.replaceRecords(data.records)
  brewStore.replaceCustomTemplates(data.customTemplates)
  message.success(
    `恢复成功：共 ${data.records.length} 条记录${data.customTemplates.length > 0 ? `，${data.customTemplates.length} 个方案` : ''}`
  )
  showOverwriteConfirm.value = false
  showRestoreDialog.value = false
  pendingBackupData.value = null
}

function cancelOverwriteConfirm() {
  showOverwriteConfirm.value = false
}

function cancelRestore() {
  showRestoreDialog.value = false
  pendingBackupData.value = null
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
            备份您的冲煮记录和自定义方案，或从备份文件恢复
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
      @positive-click="handleMergeRestore"
      @negative-click="cancelRestore"
    >
      <template #action>
        <NSpace justify="end">
          <NButton quaternary @click="cancelRestore">取消</NButton>
          <NButton type="success" @click="handleMergeRestore">
            合并（保留现有）
          </NButton>
          <NButton type="warning" @click="handleOverwriteClick">
            覆盖（清空现有）
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showOverwriteConfirm"
      :mask-closable="false"
      preset="dialog"
      title="确认覆盖"
      type="warning"
      content="此操作将清空所有现有记录和自定义方案，然后恢复备份中的数据。此操作不可撤销，确定继续吗？"
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
