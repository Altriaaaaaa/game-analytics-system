<template>
  <div class="compare-view">
    <div class="row">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">对比图表 A</h6>
            <select v-model="compareChartA" class="form-select form-select-sm" style="width: auto;">
              <option v-for="chart in availableCharts" :key="chart.type" :value="chart.type">
                {{ chart.label }}
              </option>
            </select>
          </div>
          <div class="card-body">
            <ChartDemo 
              :type="compareChartA" 
              :filters="currentFilters"
              :key="'compare-a-' + compareChartA + '-' + filterKey" 
            />
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">对比图表 B</h6>
            <select v-model="compareChartB" class="form-select form-select-sm" style="width: auto;">
              <option v-for="chart in availableCharts" :key="chart.type" :value="chart.type">
                {{ chart.label }}
              </option>
            </select>
          </div>
          <div class="card-body">
            <ChartDemo 
              :type="compareChartB" 
              :filters="currentFilters"
              :key="'compare-b-' + compareChartB + '-' + filterKey" 
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 对比分析结果 -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0">📋 对比分析</h6>
          </div>
          <div class="card-body">
            <div class="comparison-insights">
              <p v-if="comparisonResult">{{ comparisonResult }}</p>
              <p v-else class="text-muted">选择两个不同的图表类型进行对比分析</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ChartDemo from './ChartDemo.vue'

const props = defineProps({
  currentFilters: { type: Object, default: () => ({}) }
})

const compareChartA = ref('region')
const compareChartB = ref('genre')
const filterKey = ref(0)

const availableCharts = [
  { type: 'region', label: '地区销量' },
  { type: 'genre', label: '类型占比' },
  { type: 'yearly', label: '年度趋势' },
  { type: 'platform', label: '平台对比' },
  { type: 'rating', label: '评分分析' },
]

const comparisonResult = computed(() => {
  if (compareChartA.value === compareChartB.value) {
    return null
  }
  
  return `正在对比 ${getChartLabel(compareChartA.value)} 和 ${getChartLabel(compareChartB.value)} 的数据模式...`
})

const getChartLabel = (type) => {
  const chart = availableCharts.find(c => c.type === type)
  return chart ? chart.label : type
}

// 监听筛选条件变化
watch(() => props.currentFilters, () => {
  filterKey.value++
}, { deep: true })
</script>

<style scoped>
.comparison-insights {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>