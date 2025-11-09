<template>
  <!-- 评分分析时不显示任何内容（包括容器） -->
  <div v-if="!isRatingAnalysis" class="insights-container mb-4">
    <div class="row">
      <!-- 总销量洞察 -->
      <div class="col-md-3">
        <div class="card insight-card">
          <div class="card-body text-center">
            <div class="insight-icon">💰</div>
            <h4 class="insight-value">{{ formatNumber(totalSales) }}M</h4>
            <p class="insight-label">总销量</p>
          </div>
        </div>
      </div>
      
      <!-- 平均销量 -->
      <div class="col-md-3">
        <div class="card insight-card">
          <div class="card-body text-center">
            <div class="insight-icon">📊</div>
            <h4 class="insight-value">{{ averageSales.toFixed(2) }}M</h4>
            <p class="insight-label">平均销量</p>
          </div>
        </div>
      </div>
      
      <!-- 最高销量 -->
      <div class="col-md-3">
        <div class="card insight-card">
          <div class="card-body text-center">
            <div class="insight-icon">🏆</div>
            <h4 class="insight-value">{{ topItem.category }}</h4>
            <p class="insight-label">销量最高</p>
            <small class="text-muted">{{ topItem.value.toFixed(2) }}M</small>
          </div>
        </div>
      </div>
      
      <!-- 数据分布 -->
      <div class="col-md-3">
        <div class="card insight-card">
          <div class="card-body text-center">
            <div class="insight-icon">📈</div>
            <h4 class="insight-value">{{ dataDistribution }}</h4>
            <p class="insight-label">数据分布</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  chartData: {
    type: Array,
    default: () => []
  },
  chartType: {
    type: String,
    default: 'region'
  }
})

// 判断是否是评分分析
const isRatingAnalysis = computed(() => props.chartType === 'rating')

// 计算属性
const totalSales = computed(() => {
  if (!props.chartData || props.chartData.length === 0) return 0
  return props.chartData.reduce((sum, item) => sum + (item.value || 0), 0)
})

const averageSales = computed(() => {
  if (!props.chartData || props.chartData.length === 0) return 0
  return totalSales.value / props.chartData.length
})

const topItem = computed(() => {
  if (!props.chartData || props.chartData.length === 0) {
    return { value: 0, category: '-' }
  }
  return props.chartData.reduce((max, item) => 
    (item.value || 0) > (max.value || 0) ? item : max, 
    { value: 0, category: '-' }
  )
})

const dataDistribution = computed(() => {
  const count = props.chartData.length
  if (count === 0) return '无数据'
  if (count <= 5) return '集中'
  if (count <= 15) return '均衡'
  return '分散'
})

const formatNumber = (num) => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
</script>

<style scoped>
.insight-card {
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.insight-card:hover {
  transform: translateY(-2px);
}

.insight-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.insight-value {
  font-weight: bold;
  color: #2c3e50;
  margin: 0.5rem 0;
}

.insight-label {
  color: #6c757d;
  margin: 0;
}
</style>