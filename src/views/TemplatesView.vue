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
  NInputNumber,
  NPopconfirm,
  NDescriptions,
  NDescriptionsItem,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { useBrewStore } from '@/stores/brew'
import { formatBrewTime, formatDateTime } from '@/utils/format'
import type { CustomTemplateFormModel } from '@/types/brew'

const brewStore = useBrewStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const showModal = ref(false)

const formModel = ref<CustomTemplateFormModel>({
  name: '',
  ratio: '1:15',
  waterTemp: 92,
  brewTime: 180,
  description: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入方案名称', trigger: 'blur' },
    { max: 30, message: '名称不超过 30 个字符', trigger: 'blur' },
  ],
  ratio: [
    { required: true, message: '请输入粉水比，如 1:15', trigger: 'blur' },
    {
      pattern: /^1:\d+(\.\d+)?$/,
      message: '格式应为 1:数字，如 1:15 或 1:15.5',
      trigger: 'blur',
    },
  ],
  waterTemp: [
    {
      required: true,
      type: 'number',
      min: 80,
      max: 100,
      message: '水温需在 80-100°C 之间',
      trigger: 'blur',
    },
  ],
  brewTime: [
    {
      required: true,
      type: 'number',
      min: 30,
      max: 600,
      message: '冲煮时间需在 30-600 秒之间',
      trigger: 'blur',
    },
  ],
  description: [
    { max: 200, message: '说明不超过 200 个字符', trigger: 'blur' },
  ],
}

/** 打开新建弹窗 */
function openCreateModal() {
  formModel.value = {
    name: '',
    ratio: '1:15',
    waterTemp: 92,
    brewTime: 180,
    description: '',
  }
  showModal.value = true
}

/** 提交新建 */
async function handleSubmit() {
  await formRef.value?.validate()
  brewStore.addCustomTemplate(formModel.value)
  message.success('方案已创建')
  showModal.value = false
}

/** 删除方案 */
function handleDelete(id: string) {
  brewStore.deleteCustomTemplate(id)
  message.success('方案已删除')
}
</script>

<template>
  <div class="templates-page">
    <div class="page-header">
      <h1 class="page-title">冲煮方案</h1>
      <NButton type="primary" @click="openCreateModal">新建方案</NButton>
    </div>

    <section class="section">
      <h2 class="section-title">系统模板</h2>
      <NSpace vertical :size="12">
        <NCard
          v-for="tpl in brewStore.systemTemplates"
          :key="tpl.id"
          size="small"
          :title="tpl.name"
        >
          <template #header-extra>
            <NTag size="small" type="info">系统模板</NTag>
          </template>
          <NSpace vertical :size="8">
            <NSpace :size="8" wrap>
              <NTag :bordered="false" type="info">粉水比 {{ tpl.ratio }}</NTag>
              <NTag :bordered="false" type="warning">{{ tpl.waterTemp }}°C</NTag>
              <NTag :bordered="false" type="success">
                {{ formatBrewTime(tpl.brewTime) }}
              </NTag>
            </NSpace>
            <p class="desc">{{ tpl.description }}</p>
          </NSpace>
        </NCard>
      </NSpace>
    </section>

    <section class="section">
      <h2 class="section-title">我的方案</h2>
      <NEmpty
        v-if="brewStore.sortedCustomTemplates.length === 0"
        description="还没有自定义方案，创建你的专属冲煮方案吧"
        class="empty-state"
      >
        <template #extra>
          <NButton type="primary" @click="openCreateModal">新建方案</NButton>
        </template>
      </NEmpty>
      <NSpace v-else vertical :size="12">
        <NCard
          v-for="tpl in brewStore.sortedCustomTemplates"
          :key="tpl.id"
          size="small"
          :title="tpl.name"
        >
          <template #header-extra>
            <NSpace align="center" :size="8">
              <NTag size="small" type="success">自定义</NTag>
              <NText depth="3" style="font-size: 12px">
                {{ formatDateTime(tpl.createdAt) }}
              </NText>
            </NSpace>
          </template>
          <NSpace vertical :size="8">
            <NSpace :size="8" wrap>
              <NTag :bordered="false" type="info">粉水比 {{ tpl.ratio }}</NTag>
              <NTag :bordered="false" type="warning">{{ tpl.waterTemp }}°C</NTag>
              <NTag :bordered="false" type="success">
                {{ formatBrewTime(tpl.brewTime) }}
              </NTag>
            </NSpace>
            <p v-if="tpl.description" class="desc">{{ tpl.description }}</p>
          </NSpace>
          <template #action>
            <NPopconfirm @positive-click="handleDelete(tpl.id)">
              <template #trigger>
                <NButton size="small" quaternary type="error">删除</NButton>
              </template>
              确定删除「{{ tpl.name }}」吗？已使用该方案的冲煮记录不受影响。
            </NPopconfirm>
          </template>
        </NCard>
      </NSpace>
    </section>

    <NModal
      v-model:show="showModal"
      preset="card"
      title="新建冲煮方案"
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
        <NFormItem label="方案名称" path="name">
          <NInput
            v-model:value="formModel.name"
            placeholder="如：我的 V60 方案"
            maxlength="30"
            show-count
          />
        </NFormItem>
        <NFormItem label="粉水比" path="ratio">
          <NInput
            v-model:value="formModel.ratio"
            placeholder="如 1:15 或 1:15.5"
          />
        </NFormItem>
        <NFormItem label="水温(°C)" path="waterTemp">
          <NInputNumber
            v-model:value="formModel.waterTemp"
            :min="80"
            :max="100"
            :step="1"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="冲煮时间(秒)" path="brewTime">
          <NInputNumber
            v-model:value="formModel.brewTime"
            :min="30"
            :max="600"
            :step="5"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="说明" path="description">
          <NInput
            v-model:value="formModel.description"
            type="textarea"
            placeholder="简要描述冲煮手法或风味取向…"
            :rows="3"
            maxlength="200"
            show-count
          />
        </NFormItem>
        <NFormItem v-if="formModel.waterTemp && formModel.brewTime" label="参数预览">
          <NDescriptions :column="1" size="small" bordered>
            <NDescriptionsItem label="粉水比">
              {{ formModel.ratio }}
            </NDescriptionsItem>
            <NDescriptionsItem label="水温">
              {{ formModel.waterTemp }}°C
            </NDescriptionsItem>
            <NDescriptionsItem label="冲煮时间">
              {{ formatBrewTime(formModel.brewTime) }}
            </NDescriptionsItem>
            <NDescriptionsItem v-if="formModel.description" label="说明">
              <NText depth="3">{{ formModel.description }}</NText>
            </NDescriptionsItem>
          </NDescriptions>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">创建</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.templates-page {
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

.section {
  margin-bottom: 28px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #6f4e37;
}

.empty-state {
  margin-top: 24px;
}

.desc {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}
</style>
