import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import templates from '@/mock/brew-templates.json'
import type {
  BrewRecord,
  BrewTemplate,
  BrewTemplateWithSource,
  TemplateUsageRank,
  DailyCount,
  CustomBrewTemplate,
  CustomTemplateFormModel,
} from '@/types/brew'

const NEW_KEY = 'brew-store'
const OLD_KEY = 'pinia-brew'

/**
 * 迁移旧本地存储键到新键，返回是否发生迁移
 */
function migrateOldStorage(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    const oldRaw = localStorage.getItem(OLD_KEY)
    if (!oldRaw) return false

    const oldData = JSON.parse(oldRaw) as { records?: unknown }
    const oldRecords = Array.isArray(oldData?.records)
      ? (oldData.records as BrewRecord[]).filter((r) => r && typeof r.id === 'string')
      : []

    const newRaw = localStorage.getItem(NEW_KEY)
    const newData: { records?: BrewRecord[]; customTemplates?: CustomBrewTemplate[] } = newRaw
      ? JSON.parse(newRaw)
      : {}
    const newRecords = Array.isArray(newData?.records) ? newData.records : []
    const existingIds = new Set(newRecords.map((r) => r.id))
    const merged = [
      ...newRecords,
      ...oldRecords.filter((r) => !existingIds.has(r.id)),
    ]

    localStorage.setItem(
      NEW_KEY,
      JSON.stringify({
        records: merged,
        customTemplates: Array.isArray(newData?.customTemplates)
          ? newData.customTemplates
          : [],
      })
    )
    localStorage.removeItem(OLD_KEY)
    return true
  } catch (_e) {
    try {
      localStorage.removeItem(OLD_KEY)
    } catch (_) {}
    return false
  }
}

migrateOldStorage()

/**
 * 冲煮记录 Pinia Store，持久化到 localStorage
 */
export const useBrewStore = defineStore('brew', {
  state: () => ({
    records: [] as BrewRecord[],
    customTemplates: [] as CustomBrewTemplate[],
  }),

  getters: {
    /** 按日期倒序排列的记录 */
    sortedRecords: (state): BrewRecord[] =>
      [...state.records].sort(
        (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
      ),

    /** 系统 Mock 冲煮模板列表 */
    systemTemplates: (): BrewTemplate[] => templates as BrewTemplate[],

    /** 用户自定义方案列表（按创建时间倒序） */
    sortedCustomTemplates: (state): CustomBrewTemplate[] =>
      [...state.customTemplates].sort(
        (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
      ),

    /** 所有模板（系统 + 自定义，统一格式，带来源标记） */
    allTemplates(): BrewTemplateWithSource[] {
      const systemList: BrewTemplateWithSource[] = (templates as BrewTemplate[]).map(
        (t) => ({ ...t, source: 'system' as const })
      )
      const customList: BrewTemplateWithSource[] = this.customTemplates.map((t) => ({
        ...t,
        source: 'custom' as const,
      }))
      return [...systemList, ...customList]
    },

    /** 根据 ID 查找模板（同时查找系统模板和自定义方案） */
    getTemplateById:
      (state) =>
      (id: string): BrewTemplate | undefined => {
        const system = (templates as BrewTemplate[]).find((t) => t.id === id)
        if (system) return system
        return state.customTemplates.find((t) => t.id === id)
      },

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

    /**
     * 新增用户自定义冲煮方案
     */
    addCustomTemplate(payload: CustomTemplateFormModel) {
      const template: CustomBrewTemplate = {
        id: `custom-${crypto.randomUUID()}`,
        name: payload.name.trim(),
        ratio: payload.ratio.trim(),
        waterTemp: payload.waterTemp!,
        brewTime: payload.brewTime!,
        description: payload.description.trim(),
        createdAt: dayjs().toISOString(),
      }
      this.customTemplates.push(template)
      return template
    },

    /**
     * 删除用户自定义冲煮方案
     */
    deleteCustomTemplate(id: string) {
      this.customTemplates = this.customTemplates.filter((t) => t.id !== id)
    },

    /**
     * 批量添加冲煮记录（按 id 去重，返回新增条数）
     */
    addRecords(newRecords: BrewRecord[]): number {
      const existingIds = new Set(this.records.map((r) => r.id))
      const toAdd = newRecords.filter((r) => !existingIds.has(r.id))
      this.records.push(...toAdd)
      return toAdd.length
    },

    /**
     * 清空所有冲煮记录
     */
    clearRecords() {
      this.records = []
    },

    /**
     * 批量添加自定义模板（按 id 去重，返回新增条数）
     */
    addCustomTemplates(newTemplates: CustomBrewTemplate[]): number {
      const existingIds = new Set(this.customTemplates.map((t) => t.id))
      const toAdd = newTemplates.filter((t) => !existingIds.has(t.id))
      this.customTemplates.push(...toAdd)
      return toAdd.length
    },

    /**
     * 清空所有自定义模板
     */
    clearCustomTemplates() {
      this.customTemplates = []
    },

    /**
     * 覆盖写入所有记录（先清空后写入）
     */
    replaceRecords(records: BrewRecord[]) {
      this.records = [...records]
    },

    /**
     * 覆盖写入所有自定义模板（先清空后写入）
     */
    replaceCustomTemplates(templates: CustomBrewTemplate[]) {
      this.customTemplates = [...templates]
    },
  },

  persist: {
    key: NEW_KEY,
    pick: ['records', 'customTemplates'],
  },
})
