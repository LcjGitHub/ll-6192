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
  CoffeeBean,
  CoffeeBeanFormModel,
  SortField,
  SortOrder,
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
    beans: [] as CoffeeBean[],
    filterTemplateId: '' as string,
    filterMinRating: 0 as number,
    sortField: 'date' as SortField,
    sortOrder: 'desc' as SortOrder,
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

    sortedBeans: (state): CoffeeBean[] =>
      [...state.beans].sort(
        (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
      ),

    getBeanById:
      (state) =>
      (id: string): CoffeeBean | undefined => {
        return state.beans.find((b) => b.id === id)
      },

    /** 根据 ID 查找冲煮记录 */
    getRecordById:
      (state) =>
      (id: string): BrewRecord | undefined => {
        return state.records.find((r) => r.id === id)
      },

    /** 按模板 ID 和最低星级筛选后的记录 */
    filteredRecords(state): BrewRecord[] {
      let result = [...state.records]
      if (state.filterTemplateId) {
        result = result.filter((r) => r.templateId === state.filterTemplateId)
      }
      if (state.filterMinRating > 0) {
        result = result.filter((r) => r.rating >= state.filterMinRating)
      }
      return result
    },

    /** 经过筛选并按当前排序条件排序后的记录（用于页面展示） */
    filteredSortedRecords(state): BrewRecord[] {
      let result = [...state.records]
      if (state.filterTemplateId) {
        result = result.filter((r) => r.templateId === state.filterTemplateId)
      }
      if (state.filterMinRating > 0) {
        result = result.filter((r) => r.rating >= state.filterMinRating)
      }
      result.sort((a, b) => {
        let cmp = 0
        if (state.sortField === 'date') {
          cmp = dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
        } else {
          cmp = a.rating - b.rating
        }
        return state.sortOrder === 'asc' ? cmp : -cmp
      })
      return result
    },

    /** 已使用过的所有模板列表（去重，用于筛选下拉） */
    usedTemplateList(state): { id: string; name: string }[] {
      const map = new Map<string, string>()
      for (const r of state.records) {
        if (!map.has(r.templateId)) {
          map.set(r.templateId, r.templateName)
        }
      }
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
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
     * 更新冲煮记录（根据 id 查找并更新可编辑字段）
     * 返回是否更新成功（记录不存在时返回 false）
     */
    updateRecord(
      id: string,
      payload: Omit<BrewRecord, 'id' | 'createdAt'>
    ): boolean {
      const idx = this.records.findIndex((r) => r.id === id)
      if (idx === -1) return false
      this.records[idx] = {
        ...this.records[idx],
        ...payload,
      }
      return true
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
      this.clearRecords()
      this.records = [...records]
    },

    addBean(payload: CoffeeBeanFormModel) {
      const bean: CoffeeBean = {
        id: `bean-${crypto.randomUUID()}`,
        name: payload.name.trim(),
        origin: payload.origin.trim(),
        roastLevel: payload.roastLevel.trim(),
        createdAt: dayjs().toISOString(),
      }
      this.beans.push(bean)
      return bean
    },

    deleteBean(id: string) {
      this.beans = this.beans.filter((b) => b.id !== id)
    },

    updateBean(id: string, payload: CoffeeBeanFormModel) {
      const idx = this.beans.findIndex((b) => b.id === id)
      if (idx === -1) return
      this.beans[idx] = {
        ...this.beans[idx],
        name: payload.name.trim(),
        origin: payload.origin.trim(),
        roastLevel: payload.roastLevel.trim(),
      }
    },

    setFilterTemplateId(templateId: string) {
      this.filterTemplateId = templateId
    },

    setFilterMinRating(rating: number) {
      this.filterMinRating = rating
    },

    setSortField(field: SortField) {
      this.sortField = field
    },

    setSortOrder(order: SortOrder) {
      this.sortOrder = order
    },

    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
    },

    resetHistoryFilter() {
      this.filterTemplateId = ''
      this.filterMinRating = 0
    },
  },

  persist: {
    key: NEW_KEY,
    pick: ['records', 'customTemplates', 'beans'],
  },
})
