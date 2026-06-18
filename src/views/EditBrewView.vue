<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard,
  NForm,
  NFormItem,
  NSelect,
  NInput,
  NRate,
  NDatePicker,
  NButton,
  NSpace,
  NDescriptions,
  NDescriptionsItem,
  NText,
  NTag,
  NSpin,
  useMessage,
  type FormInst,
  type FormRules,
  type SelectOption,
  type SelectGroupOption,
} from 'naive-ui'
import dayjs from 'dayjs'
import { useBrewStore } from '@/stores/brew'
import type { BrewFormModel } from '@/types/brew'
import { formatBrewTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const brewStore = useBrewStore()
const formRef = ref<FormInst | null>(null)
const isLoading = ref(true)
const recordExists = ref(false)

const editingId = computed(() => route.params.id as string)
const originalRecord = computed(() => brewStore.getRecordById(editingId.value))

const formModel = ref<BrewFormModel>({
  templateId: null,
  beanId: null,
  rating: 3,
  notes: '',
  date: Date.now(),
})

onMounted(() => {
  if (!originalRecord.value) {
    message.error('记录不存在或已被删除')
    router.push({ name: 'history' })
    return
  }
  recordExists.value = true
  const r = originalRecord.value
  formModel.value.templateId = r.templateId
  formModel.value.rating = r.rating
  formModel.value.notes = r.notes
  formModel.value.date = dayjs(r.date).valueOf()
  if (r.beanName) {
    const matched = brewStore.sortedBeans.find((b) => b.name === r.beanName)
    if (matched) {
      formModel.value.beanId = matched.id
    }
  }
  isLoading.value = false
})

const templateOptions = computed<(SelectOption | SelectGroupOption)[]>(() => {
  const result: (SelectOption | SelectGroupOption)[] = []
  result.push({
    type: 'group',
    label: '系统模板',
    key: 'system-group',
    children: brewStore.systemTemplates.map((t) => ({
      label: t.name,
      value: t.id,
    })),
  })
  if (brewStore.sortedCustomTemplates.length > 0) {
    result.push({
      type: 'group',
      label: '我的方案',
      key: 'custom-group',
      children: brewStore.sortedCustomTemplates.map((t) => ({
        label: t.name,
        value: t.id,
      })),
    })
  }
  return result
})

const selectedTemplate = computed(() =>
  formModel.value.templateId
    ? brewStore.getTemplateById(formModel.value.templateId)
    : undefined
)

const selectedSource = computed(() => {
  if (!formModel.value.templateId) return null
  return brewStore.allTemplates.find((t) => t.id === formModel.value.templateId)?.source ?? null
})

const beanOptions = computed<SelectOption[]>(() =>
  brewStore.sortedBeans.map((b) => ({
    label: `${b.name} · ${b.origin} · ${b.roastLevel}`,
    value: b.id,
  }))
)

const hasBeans = computed(() => brewStore.sortedBeans.length > 0)

const selectedBeanName = computed<string | undefined>(() => {
  if (!formModel.value.beanId) return undefined
  return brewStore.getBeanById(formModel.value.beanId)?.name
})

const rules: FormRules = {
  templateId: [{ required: true, message: '请选择冲煮模板', trigger: 'change' }],
  rating: [
    {
      required: true,
      type: 'number',
      min: 1,
      message: '请给出评分',
      trigger: 'change',
    },
  ],
  date: [
    {
      required: true,
      type: 'number',
      message: '请选择冲煮日期',
      trigger: 'change',
    },
  ],
}

async function handleSubmit() {
  await formRef.value?.validate()

  const template = selectedTemplate.value
  if (!template || formModel.value.date === null) return

  const success = brewStore.updateRecord(editingId.value, {
    templateId: template.id,
    templateName: template.name,
    ratio: template.ratio,
    waterTemp: template.waterTemp,
    brewTime: template.brewTime,
    rating: formModel.value.rating,
    notes: formModel.value.notes.trim(),
    date: dayjs(formModel.value.date).format('YYYY-MM-DD'),
    beanName: selectedBeanName.value,
  })

  if (success) {
    message.success('保存成功')
    router.push({ name: 'history' })
  } else {
    message.error('保存失败，记录不存在或已被删除')
  }
}

function handleCancel() {
  router.push({ name: 'history' })
}
</script>

<template>
  <div class="edit-page">
    <h1 class="page-title">编辑冲煮记录</h1>

    <div v-if="isLoading" class="loading-wrapper">
      <NSpin size="large" />
    </div>

    <NCard v-else-if="recordExists">
      <NForm
        ref="formRef"
        :model="formModel"
        :rules="rules"
        label-placement="left"
        label-width="90"
        require-mark-placement="right-hanging"
      >
        <NFormItem label="冲煮模板" path="templateId">
          <NSelect
            v-model:value="formModel.templateId"
            :options="templateOptions"
            placeholder="选择系统模板或我的方案"
            clearable
          />
        </NFormItem>

        <NFormItem v-if="hasBeans" label="咖啡豆" path="beanId">
          <NSelect
            v-model:value="formModel.beanId"
            :options="beanOptions"
            placeholder="可选，选择咖啡豆"
            clearable
          />
        </NFormItem>
        <NFormItem v-else label="咖啡豆">
          <NText depth="3" class="bean-empty-hint">
            还没有咖啡豆档案，
            <a class="bean-link" @click="router.push({ name: 'beans' })">前往添加 →</a>
          </NText>
        </NFormItem>

        <NFormItem v-if="selectedTemplate" label="模板参数">
          <div class="template-preview">
            <div class="template-header">
              <span class="template-name">{{ selectedTemplate.name }}</span>
              <NTag
                size="small"
                :type="selectedSource === 'system' ? 'info' : 'success'"
              >
                {{ selectedSource === 'system' ? '系统模板' : '自定义' }}
              </NTag>
            </div>
            <NDescriptions :column="1" size="small" bordered>
              <NDescriptionsItem label="粉水比">
                {{ selectedTemplate.ratio }}
              </NDescriptionsItem>
              <NDescriptionsItem label="水温">
                {{ selectedTemplate.waterTemp }}°C
              </NDescriptionsItem>
              <NDescriptionsItem label="冲煮时间">
                {{ formatBrewTime(selectedTemplate.brewTime) }}
              </NDescriptionsItem>
              <NDescriptionsItem label="说明">
                <NText depth="3">{{ selectedTemplate.description }}</NText>
              </NDescriptionsItem>
            </NDescriptions>
          </div>
        </NFormItem>

        <NFormItem label="评分" path="rating">
          <NRate v-model:value="formModel.rating" allow-half />
        </NFormItem>

        <NFormItem label="冲煮日期" path="date">
          <NDatePicker
            v-model:value="formModel.date"
            type="date"
            clearable
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem label="备注" path="notes">
          <NInput
            v-model:value="formModel.notes"
            type="textarea"
            placeholder="风味感受、调整建议…"
            :rows="3"
            maxlength="500"
            show-count
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="handleSubmit">保存修改</NButton>
            <NButton @click="handleCancel">取消</NButton>
          </NSpace>
        </NFormItem>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.edit-page {
  width: 100%;
}

.page-title {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 600;
  color: #6f4e37;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.template-preview {
  width: 100%;
}

.template-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.template-name {
  font-weight: 600;
  color: #6f4e37;
}

.bean-empty-hint {
  font-size: 14px;
}

.bean-link {
  color: #6f4e37;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
}

.bean-link:hover {
  text-decoration: underline;
}
</style>
