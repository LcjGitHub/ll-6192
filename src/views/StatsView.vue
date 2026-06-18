<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NEmpty,
  NButton,
  NStatistic,
  NSpace,
  NRate,
  NTag,
  NText,
} from 'naive-ui'
import { useBrewStore } from '@/stores/brew'

const router = useRouter()
const brewStore = useBrewStore()

const hasRecords = computed(() => brewStore.totalRecords > 0)

const maxBarCount = computed(() => {
  const counts = brewStore.last7DaysDailyCount.map((d) => d.count)
  return Math.max(...counts, 1)
})

function goNew() {
  router.push({ name: 'new' })
}
</script>

<template>
  <div class="stats-page">
    <div class="page-header">
      <h1 class="page-title">冲煮数据统计</h1>
    </div>

    <NEmpty
      v-if="!hasRecords"
      description="还没有冲煮记录，开始你的第一杯吧"
      class="empty-state"
    >
      <template #extra>
        <NButton type="primary" @click="goNew">新建记录</NButton>
      </template>
    </NEmpty>

    <template v-else>
      <NSpace vertical :size="16">
        <NSpace :size="16" :wrap="false" class="stat-cards">
          <NCard size="small" class="stat-card">
            <NStatistic label="历史记录总数" :value="brewStore.totalRecords" />
          </NCard>
          <NCard size="small" class="stat-card">
            <div class="rating-stat">
              <NText depth="3" class="stat-label">平均星级评分</NText>
              <div class="rating-value-row">
                <span class="rating-number">{{ brewStore.averageRating }}</span>
                <NRate :value="brewStore.averageRating" readonly allow-half size="medium" />
              </div>
            </div>
          </NCard>
        </NSpace>

        <NCard title="冲煮模板使用排行" size="small">
          <NSpace vertical :size="10">
            <div
              v-for="(item, index) in brewStore.templateUsageRanking"
              :key="item.templateId"
              class="rank-item"
            >
              <div class="rank-left">
                <NTag
                  :type="index === 0 ? 'warning' : index === 1 ? 'default' : index === 2 ? 'success' : 'info'"
                  :bordered="false"
                  round
                  class="rank-tag"
                >
                  #{{ index + 1 }}
                </NTag>
                <span class="rank-name">{{ item.templateName }}</span>
              </div>
              <NTag :bordered="false" type="primary" round>
                {{ item.count }} 次
              </NTag>
            </div>
          </NSpace>
        </NCard>

        <NCard title="近七天冲煮次数" size="small">
          <div class="bar-chart">
            <div
              v-for="item in brewStore.last7DaysDailyCount"
              :key="item.date"
              class="bar-column"
            >
              <div class="bar-wrapper">
                <div
                  class="bar"
                  :style="{
                    height: `${(item.count / maxBarCount) * 100}%`,
                    opacity: item.count > 0 ? 1 : 0.2,
                  }"
                >
                  <span v-if="item.count > 0" class="bar-label">{{ item.count }}</span>
                </div>
              </div>
              <span class="bar-weekday">{{ item.weekday }}</span>
              <span class="bar-date">{{ item.date.slice(5) }}</span>
            </div>
          </div>
        </NCard>
      </NSpace>
    </template>
  </div>
</template>

<style scoped>
.stats-page {
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

.stat-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 480px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  width: 100%;
}

.stat-label {
  font-size: 13px;
  color: #aaa;
}

.rating-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rating-value-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rating-number {
  font-size: 28px;
  font-weight: 700;
  color: #6f4e37;
  line-height: 1;
}

.rank-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
}

.rank-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.rank-tag {
  flex-shrink: 0;
  min-width: 40px;
  text-align: center;
}

.rank-name {
  font-size: 14px;
  color: #3d2b1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  height: 200px;
  padding: 8px 4px 0;
}

.bar-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 140px;
}

.bar {
  width: 70%;
  max-width: 40px;
  min-height: 4px;
  background: linear-gradient(180deg, #c49a6c 0%, #8b5e3c 100%);
  border-radius: 6px 6px 2px 2px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
  transition: height 0.3s ease;
}

.bar-label {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.bar-weekday {
  font-size: 12px;
  color: #888;
  font-weight: 500;
}

.bar-date {
  font-size: 11px;
  color: #aaa;
}
</style>
