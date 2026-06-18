/**
 * 冲煮模板（基础字段）
 */
export interface BrewTemplateBase {
  name: string
  /** 粉水比，如 1:15 */
  ratio: string
  /** 水温（°C） */
  waterTemp: number
  /** 冲煮时间（秒） */
  brewTime: number
  description: string
}

/**
 * 系统冲煮模板
 */
export interface BrewTemplate extends BrewTemplateBase {
  id: string
}

/**
 * 模板来源
 */
export type TemplateSource = 'system' | 'custom'

/**
 * 带来源标记的模板（用于下拉框统一展示）
 */
export interface BrewTemplateWithSource extends BrewTemplate {
  source: TemplateSource
}

/**
 * 用户自定义冲煮方案
 */
export interface CustomBrewTemplate extends BrewTemplate {
  createdAt: string
}

/**
 * 新建自定义方案表单
 */
export interface CustomTemplateFormModel {
  name: string
  ratio: string
  waterTemp: number | null
  brewTime: number | null
  description: string
}

/**
 * 冲煮记录
 */
export interface CoffeeBean {
  id: string
  name: string
  origin: string
  roastLevel: string
  createdAt: string
}

export interface CoffeeBeanFormModel {
  name: string
  origin: string
  roastLevel: string
}

export interface BrewRecord {
  id: string
  templateId: string
  templateName: string
  ratio: string
  waterTemp: number
  brewTime: number
  rating: number
  notes: string
  date: string
  createdAt: string
  beanName?: string
}

/**
 * 新建记录表单
 */
export interface BrewFormModel {
  templateId: string | null
  beanId: string | null
  rating: number
  notes: string
  date: number | null
}

/**
 * 模板使用次数排行项
 */
export interface TemplateUsageRank {
  templateId: string
  templateName: string
  count: number
}

/**
 * 每日冲煮次数
 */
export interface DailyCount {
  date: string
  weekday: string
  count: number
}

/**
 * 排序字段
 */
export type SortField = 'date' | 'rating'

/**
 * 排序方向
 */
export type SortOrder = 'asc' | 'desc'
