/**
 * 冲煮模板
 */
export interface BrewTemplate {
  id: string
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
 * 冲煮记录
 */
export interface BrewRecord {
  id: string
  templateId: string
  templateName: string
  ratio: string
  waterTemp: number
  brewTime: number
  /** 评分 1–5 */
  rating: number
  notes: string
  /** 冲煮日期 ISO 字符串 */
  date: string
  createdAt: string
}

/**
 * 新建记录表单
 */
export interface BrewFormModel {
  templateId: string | null
  rating: number
  notes: string
  date: number | null
}
