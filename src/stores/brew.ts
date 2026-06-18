import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import templates from '@/mock/brew-templates.json'
import type { BrewRecord, BrewTemplate } from '@/types/brew'

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
