<script setup lang="ts">
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
  useMessage,
} from 'naive-ui'
import { useBrewStore } from '@/stores/brew'
import { formatBrewTime, formatDate } from '@/utils/format'

const router = useRouter()
const message = useMessage()
const brewStore = useBrewStore()

/** 跳转新建页 */
function goNew() {
  router.push({ name: 'new' })
}

/**
 * 删除记录
 */
function handleDelete(id: string) {
  brewStore.deleteRecord(id)
  message.success('记录已删除')
}
</script>

<template>
  <div class="history-page">
    <div class="page-header">
      <h1 class="page-title">冲煮历史</h1>
      <NButton type="primary" @click="goNew">新建记录</NButton>
    </div>

    <NEmpty
      v-if="brewStore.sortedRecords.length === 0"
      description="还没有冲煮记录，开始你的第一杯吧"
      class="empty-state"
    >
      <template #extra>
        <NButton type="primary" @click="goNew">新建记录</NButton>
      </template>
    </NEmpty>

    <NSpace v-else vertical :size="12">
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

.empty-state {
  margin-top: 48px;
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
