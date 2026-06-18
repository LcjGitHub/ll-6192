<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NConfigProvider,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NMenu,
  NMessageProvider,
  NDialogProvider,
  zhCN,
  dateZhCN,
  type MenuOption,
} from 'naive-ui'

const route = useRoute()
const router = useRouter()

const activeKey = computed(() => route.name as string)

const menuOptions: MenuOption[] = [
  { label: '冲煮历史', key: 'history' },
  { label: '新建记录', key: 'new' },
  { label: '冲煮方案', key: 'templates' },
  { label: '冲煮倒计时', key: 'timer' },
  { label: '数据统计', key: 'stats' },
]

/** 导航菜单切换 */
function handleMenuUpdate(key: string) {
  router.push({ name: key })
}
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <NDialogProvider>
    <NLayout class="app-layout">
      <NLayoutHeader bordered class="app-header">
        <div class="brand">
          <span class="brand-icon">☕</span>
          <span class="brand-title">手冲咖啡记录</span>
        </div>
        <NMenu
          mode="horizontal"
          :value="activeKey"
          :options="menuOptions"
          @update:value="handleMenuUpdate"
        />
      </NLayoutHeader>
      <NLayoutContent class="app-content">
        <RouterView />
      </NLayoutContent>
    </NLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #f7f3ef;
  color: #3d2b1f;
}

#app {
  min-height: 100vh;
}

.app-layout {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #fff;
  height: 56px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #6f4e37;
  white-space: nowrap;
  margin-right: 24px;
}

.brand-icon {
  font-size: 20px;
}

.app-content {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
</style>
