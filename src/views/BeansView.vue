<script setup lang="ts">
import { ref } from 'vue'
import {
  NCard,
  NButton,
  NSpace,
  NTag,
  NText,
  NEmpty,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NPopconfirm,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { useBrewStore } from '@/stores/brew'
import { formatDateTime } from '@/utils/format'
import type { CoffeeBeanFormModel, CoffeeBean } from '@/types/brew'

const brewStore = useBrewStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const showModal = ref(false)
const editingBeanId = ref<string | null>(null)

const roastLevelOptions = [
  { label: '浅烘', value: '浅烘' },
  { label: '中浅烘', value: '中浅烘' },
  { label: '中烘', value: '中烘' },
  { label: '中深烘', value: '中深烘' },
  { label: '深烘', value: '深烘' },
]

const formModel = ref<CoffeeBeanFormModel>({
  name: '',
  origin: '',
  roastLevel: '中烘',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入豆名', trigger: 'blur' },
    { max: 30, message: '豆名不超过 30 个字符', trigger: 'blur' },
  ],
  origin: [
    { max: 30, message: '产地不超过 30 个字符', trigger: 'blur' },
  ],
  roastLevel: [
    { required: true, message: '请选择烘焙度', trigger: 'change' },
  ],
}

function resetForm() {
  formModel.value = { name: '', origin: '', roastLevel: '中烘' }
  editingBeanId.value = null
}

function openCreateModal() {
  resetForm()
  showModal.value = true
}

function openEditModal(bean: CoffeeBean) {
  editingBeanId.value = bean.id
  formModel.value = {
    name: bean.name,
    origin: bean.origin,
    roastLevel: bean.roastLevel,
  }
  showModal.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  if (editingBeanId.value) {
    brewStore.updateBean(editingBeanId.value, formModel.value)
    message.success('咖啡豆档案已更新')
  } else {
    brewStore.addBean(formModel.value)
    message.success('咖啡豆档案已创建')
  }
  showModal.value = false
  resetForm()
}

function handleDelete(id: string) {
  brewStore.deleteBean(id)
  message.success('咖啡豆档案已删除')
}

function getRoastTagType(level: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    '浅烘': 'success',
    '中浅烘': 'info',
    '中烘': 'warning',
    '中深烘': 'default',
    '深烘': 'error',
  }
  return map[level] ?? 'default'
}
</script>

<template>
  <div class="beans-page">
    <div class="page-header">
      <h1 class="page-title">咖啡豆档案</h1>
      <NButton type="primary" @click="openCreateModal">新增豆子</NButton>
    </div>

    <NEmpty
      v-if="brewStore.sortedBeans.length === 0"
      description="还没有咖啡豆档案，添加你常用的豆子吧"
      class="empty-state"
    >
      <template #extra>
        <NButton type="primary" @click="openCreateModal">新增豆子</NButton>
      </template>
    </NEmpty>

    <NSpace v-else vertical :size="12">
      <NCard
        v-for="bean in brewStore.sortedBeans"
        :key="bean.id"
        size="small"
        :title="bean.name"
      >
        <template #header-extra>
          <NSpace align="center" :size="8">
            <NTag size="small" :type="getRoastTagType(bean.roastLevel)">
              {{ bean.roastLevel }}
            </NTag>
            <NText depth="3" style="font-size: 12px">
              {{ formatDateTime(bean.createdAt) }}
            </NText>
          </NSpace>
        </template>

        <NSpace :size="8" wrap>
          <NTag v-if="bean.origin" :bordered="false" type="info">
            产地：{{ bean.origin }}
          </NTag>
        </NSpace>

        <template #action>
          <NSpace>
            <NButton size="small" quaternary type="primary" @click="openEditModal(bean)">
              编辑
            </NButton>
            <NPopconfirm @positive-click="handleDelete(bean.id)">
              <template #trigger>
                <NButton size="small" quaternary type="error">删除</NButton>
              </template>
              确定删除「{{ bean.name }}」吗？
            </NPopconfirm>
          </NSpace>
        </template>
      </NCard>
    </NSpace>

    <NModal
      v-model:show="showModal"
      preset="card"
      :title="editingBeanId ? '编辑咖啡豆' : '新增咖啡豆'"
      :mask-closable="false"
      style="width: 480px"
    >
      <NForm
        ref="formRef"
        :model="formModel"
        :rules="rules"
        label-placement="left"
        label-width="90"
        require-mark-placement="right-hanging"
      >
        <NFormItem label="豆名" path="name">
          <NInput
            v-model:value="formModel.name"
            placeholder="如：耶加雪菲"
            maxlength="30"
            show-count
          />
        </NFormItem>
        <NFormItem label="产地" path="origin">
          <NInput
            v-model:value="formModel.origin"
            placeholder="如：埃塞俄比亚"
            maxlength="30"
            show-count
          />
        </NFormItem>
        <NFormItem label="烘焙度" path="roastLevel">
          <NSelect
            v-model:value="formModel.roastLevel"
            :options="roastLevelOptions"
            placeholder="选择烘焙度"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">
            {{ editingBeanId ? '保存' : '创建' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.beans-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #6f4e37;
}

.empty-state {
  margin-top: 48px;
}
</style>
