import dayjs from 'dayjs'
import type { BrewRecord } from '@/types/brew'

export interface BackupData {
  version: string
  exportedAt: string
  records: BrewRecord[]
}

export interface ValidateResult {
  valid: BrewRecord[]
  invalidCount: number
}

const BACKUP_VERSION = '1.0.0'

export function createBackupData(records: BrewRecord[]): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: dayjs().toISOString(),
    records: [...records],
  }
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2)
}

export function downloadBackup(content: string, filename?: string): void {
  const name =
    filename || `brew-backup-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function parseBackup(raw: string): BackupData {
  const data = JSON.parse(raw)
  if (!data || typeof data !== 'object') {
    throw new Error('备份文件格式无效')
  }
  if (!data.version || !data.records || !Array.isArray(data.records)) {
    throw new Error('备份文件内容不完整')
  }
  return data as BackupData
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    reader.readAsText(file)
  })
}

export function validateBackupRecords(records: unknown[]): ValidateResult {
  const valid = records.filter((r): r is BrewRecord => {
    if (!r || typeof r !== 'object') return false
    const rec = r as Record<string, unknown>
    return (
      typeof rec.id === 'string' &&
      typeof rec.templateId === 'string' &&
      typeof rec.templateName === 'string' &&
      typeof rec.ratio === 'string' &&
      typeof rec.waterTemp === 'number' &&
      typeof rec.brewTime === 'number' &&
      typeof rec.rating === 'number' &&
      typeof rec.notes === 'string' &&
      typeof rec.date === 'string' &&
      typeof rec.createdAt === 'string'
    )
  })
  return {
    valid,
    invalidCount: records.length - valid.length,
  }
}
