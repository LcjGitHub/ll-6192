import dayjs from 'dayjs'

/**
 * 将秒数格式化为 mm:ss
 */
export function formatBrewTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * 将秒数格式化为中文分钟秒数格式，如 "3分00秒"
 */
export function formatBrewTimeChinese(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}分${String(s).padStart(2, '0')}秒`
}

/**
 * 将秒数格式化为带小时的完整格式，如 "01:02:03"
 */
export function formatTimeWithHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * 格式化日期显示
 */
export function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * 格式化日期时间显示
 */
export function formatDateTime(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}
