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
