<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
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
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import dayjs from 'dayjs'
import { useBrewStore } from '@/stores/brew'
import type { BrewFormModel } from '@/types/brew'
import { formatBrewTime } from '@/utils/format'

const router = useRouter()
const message = useMessage()
const brewStore = useBrewStore()
const formRef = ref<FormInst | null>(null)

const formModel = ref<BrewFormModel>({
  templateId: null,
  rating: 3,
  notes: '',
  date: Date.now(),
})

const templateOptions = computed(() =>
  brewStore.templates.map((t) => ({
    label: t.name,
    value: t.id,
  }))
)

const selectedTemplate = computed(() =>
  formModel.value.templateId
    ? brewStore.getTemplateById(formModel.value.templateId)
    : undefined
)

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

/** 提交表单 */
async function handleSubmit() {
  await formRef.value?.validate()

  const template = selectedTemplate.value
  if (!template || formModel.value.date === null) return

  brewStore.addRecord({
    templateId: template.id,
    templateName: template.name,
    ratio: template.ratio,
    waterTemp: template.waterTemp,
    brewTime: template.brewTime,
    rating: formModel.value.rating,
    notes: formModel.value.notes.trim(),
    date: dayjs(formModel.value.date).format('YYYY-MM-DD'),
  })

  message.success('记录已保存')
  router.push({ name: 'history' })
}

/** 取消返回历史页 */
function handleCancel() {
  router.push({ name: 'history' })
}
</script>

<template>
  <div class="new-page">
    <h1 class="page-title">新建冲煮记录</h1>

    <NCard>
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
            placeholder="选择 Mock 模板"
            clearable
          />
        </NFormItem>

        <NFormItem v-if="selectedTemplate" label="模板参数">
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
            <NButton type="primary" @click="handleSubmit">保存记录</NButton>
            <NButton @click="handleCancel">取消</NButton>
          </NSpace>
        </NFormItem>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.new-page {
  width: 100%;
}

.page-title {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 600;
  color: #6f4e37;
}
</style>
