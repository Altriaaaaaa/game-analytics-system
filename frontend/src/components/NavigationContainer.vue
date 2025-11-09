<template>
  <div class="navigation-container">
    <!-- 面包屑导航 -->
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <a href="#" @click.prevent="$emit('update:selectedChart', 'region')">首页</a>
        </li>
        <li class="breadcrumb-item active">{{ currentChart.label }}</li>
      </ol>
    </nav>
    
    <!-- 快捷图表切换 -->
    <div class="quick-nav mb-4">
      <div class="d-flex flex-wrap gap-2">
        <button v-for="chart in charts" :key="chart.type"
                class="btn btn-outline-primary btn-sm"
                :class="{ active: selectedChart === chart.type }"
                @click="$emit('update:selectedChart', chart.type)">
          {{ chart.icon }} {{ chart.label }}
        </button>
      </div>
    </div>
    
    <!-- 视图模式切换 -->
    <div class="view-mode mb-3">
      <div class="btn-group" role="group">
        <button type="button" class="btn btn-outline-secondary"
                :class="{ active: viewMode === 'chart' }"
                @click="$emit('update:viewMode', 'chart')">
          📊 图表视图
        </button>
        <button type="button" class="btn btn-outline-secondary"
                :class="{ active: viewMode === 'table' }"
                @click="$emit('update:viewMode', 'table')">
          📋 表格视图
        </button>
        <button type="button" class="btn btn-outline-secondary"
                :class="{ active: viewMode === 'compare' }"
                @click="$emit('update:viewMode', 'compare')">
          ⚖️ 对比视图
        </button>
      </div>
    </div>
  </div>
  <!-- 在快捷图表切换部分添加 -->
<div class="quick-nav mb-4">
  <div class="d-flex flex-wrap gap-2">
    <button v-for="chart in charts" :key="chart.type"
            class="btn btn-outline-primary btn-sm"
            :class="{ active: selectedChart === chart.type }"
            @click="$emit('update:selectedChart', chart.type)">
      {{ chart.icon }} {{ chart.label }}
    </button>
    <!-- 添加推荐按钮 -->
    <button class="btn btn-outline-success btn-sm"
            @click="$emit('update:selectedChart', 'recommendation')">
      🤖 智能推荐
    </button>
  </div>
</div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  selectedChart: { type: String, default: 'region' },
  viewMode: { type: String, default: 'chart' }
})

const emit = defineEmits(['update:selectedChart', 'update:viewMode'])

const charts = [
  { type: 'region', label: '地区销量', icon: '📊' },
  { type: 'genre', label: '类型占比', icon: '🥧' },
  { type: 'yearly', label: '年度趋势', icon: '📈' },
  { type: 'platform', label: '平台对比', icon: '🖥️' },
  { type: 'rating', label: '评分分析', icon: '⭐' },
  { type: 'recommendation', label: '智能推荐', icon: '🤖' } 
]

const currentChart = computed(() => 
  charts.find(chart => chart.type === props.selectedChart) || charts[0]
)
</script>