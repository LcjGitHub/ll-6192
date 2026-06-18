import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import templates from '@/mock/brew-templates.json'
import type { BrewRecord, BrewTemplate, TemplateUsageRank, DailyCount } from '@/types/brew'

/**
 * 冲煮记录 Pinia Store，持久化到 localStorage
 */
export const useBrewStore = defineStore('brew', {
  state: () => ({
    records: [] as BrewRecord[],
  }),

  getters: {
    /** 按日期倒序排列的记录 */
    sortedRecords: (state): BrewRecord[] =>
      [...state.records].sort(
        (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
      ),

    /** Mock 冲煮模板列表 */
    templates: (): BrewTemplate[] => templates as BrewTemplate[],

    /** 根据 ID 查找模板 */
    getTemplateById:
      () =>
      (id: string): BrewTemplate | undefined =>
        (templates as BrewTemplate[]).find((t) => t.id === id),

    /** 历史记录总条数 */
    totalRecords: (state): number => state.records.length,

    /** 全部记录的平均星级评分（保留1位小数），无记录返回 0 */
    averageRating: (state): number => {
      if (state.records.length === 0) return 0
      const sum = state.records.reduce((acc, r) => acc + r.rating, 0)
      return Math.round((sum / state.records.length) * 10) / 10
    },

    /** 各冲煮模板被使用次数排行（降序） */
    templateUsageRanking: (state): TemplateUsageRank[] => {
      const countMap = new Map<string, { name: string; count: number }>()
      for (const r of state.records) {
        const key = r.templateId
        if (countMap.has(key)) {
          countMap.get(key)!.count++
        } else {
          countMap.set(key, { name: r.templateName, count: 1 })
        }
      }
      return Array.from(countMap.entries())
        .map(([templateId, val]) => ({
          templateId,
          templateName: val.name,
          count: val.count,
        }))
        .sort((a, b) => b.count - a.count)
    },

    /** 近七天内每日冲煮次数（含无记录的日期） */
    last7DaysDailyCount: (state): DailyCount[] => {
      const result: DailyCount[] = []
      for (let i = 6; i >= 0; i--) {
        const day = dayjs().subtract(i, 'day').locale('zh-cn')
        const dateStr = day.format('YYYY-MM-DD')
        result.push({ date: dateStr, weekday: day.format('ddd'), count: 0 })
      }
      const map = new Map<string, number>()
      for (const r of state.records) {
        const d = dayjs(r.date).format('YYYY-MM-DD')
        if (map.has(d)) {
          map.set(d, map.get(d)! + 1)
        } else {
          map.set(d, 1)
        }
      }
      for (const item of result) {
        item.count = map.get(item.date) ?? 0
      }
      return result
    },
  },

  actions: {
    /**
     * 添加冲煮记录
     */
    addRecord(payload: Omit<BrewRecord, 'id' | 'createdAt'>) {
      const record: BrewRecord = {
        ...payload,
        id: crypto.randomUUID(),
        createdAt: dayjs().toISOString(),
      }
      this.records.push(record)
    },

    /**
     * 删除冲煮记录
     */
    deleteRecord(id: string) {
      this.records = this.records.filter((r) => r.id !== id)
    },
  },

  persist: true,
})
