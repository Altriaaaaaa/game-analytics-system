<template>
  <div class="chart-container">
    <!-- 工具栏 -->
    <div class="chart-toolbar mb-3 d-flex justify-content-between align-items-center">
      <div class="btn-group" role="group">
        <button @click="toggleDataView" class="btn btn-outline-secondary btn-sm">
          {{ showDataTable ? '📊 图表视图' : '📋 数据视图' }}
        </button>
        <button v-if="props.type === 'region' && !showDataTable" 
                @click="toggleRegionView" 
                class="btn btn-outline-secondary btn-sm">
          {{ regionViewMode === 'bar' ? '🌍 地理视图' : '📊 柱状图' }}
        </button>
        <button v-if="!showDataTable" @click="exportChart" class="btn btn-outline-primary btn-sm">
          💾 导出图表
        </button>
      </div>
      
      <div v-if="isLoading || mapLoading" class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">{{ mapLoading ? '加载地图...' : '加载中...' }}</span>
      </div>
    </div>

    <!-- 数据表格视图 -->
    <div v-if="showDataTable" class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th @click="sortTable('category')" class="sortable">
                  类别 {{ getSortIcon('category') }}
                </th>
                <th @click="sortTable('value')" class="sortable">
                  销量(百万) {{ getSortIcon('value') }}
                </th>
                <th @click="sortTable('percentage')" class="sortable">
                  占比 {{ getSortIcon('percentage') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in sortedTableData" :key="item.category">
                <td>{{ item.category }}</td>
                <td>{{ item.value.toFixed(2) }}</td>
                <td>
                  <div class="d-flex align-items-center">
                    <div class="progress flex-grow-1 me-2" style="height: 20px;">
                      <div class="progress-bar" 
                           :style="{ width: item.percentage + '%' }"
                           role="progressbar">
                      </div>
                    </div>
                    <span>{{ item.percentage.toFixed(1) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 图表视图 -->
    <div v-else class="card">
      <div class="card-body">
        <div ref="chartRef" style="width: 100%; height: 500px;"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import axios from 'axios'

const emit = defineEmits(['data-loaded'])

const chartRef = ref(null)
const props = defineProps({
  type: { type: String, default: 'region' },
  filters: { type: Object, default: () => ({}) }
})

const chart = ref(null)
const showDataTable = ref(false)
const sortField = ref('value')
const sortDirection = ref('desc')
const chartData = ref([])
const isLoading = ref(false)
const hasInitialized = ref(false)
const regionViewMode = ref('bar')
const mapLoaded = ref(false)
const mapLoading = ref(false)

// 计算属性
const totalSales = computed(() => 
  chartData.value.reduce((sum, item) => sum + item.value, 0)
)

const sortedTableData = computed(() => {
  const total = totalSales.value
  const dataWithPercentage = chartData.value.map(item => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0
  }))
  
  return dataWithPercentage.sort((a, b) => {
    const modifier = sortDirection.value === 'asc' ? 1 : -1
    return a[sortField.value] > b[sortField.value] ? modifier : -modifier
  })
})

// 记录用户行为
const recordUserAction = async (actionType, details = {}) => {
  try {
    await axios.post('http://localhost:3000/user-action', {
      userId: 'default',
      action: {
        type: actionType,
        chartType: props.type,
        filters: props.filters,
        ...details
      }
    })
    console.log(`✅ 记录用户行为: ${actionType}`, details)
  } catch (error) {
    console.error('❌ 记录用户行为失败:', error)
    // 不阻止后续操作，即使记录失败也继续
  }
}

// 记录图表浏览
const recordChartView = async () => {
  await recordUserAction('view_chart', {
    chartType: props.type,
    viewMode: regionViewMode.value,
    dataCount: chartData.value.length
  })
}

// 记录数据点点击
const recordDataPointClick = async (data) => {
  let details = {}
  
  // 根据图表类型提取信息
  switch (props.type) {
    case 'genre':
      details = { 
        genre: data.name, 
        value: data.value,
        itemType: 'genre'
      }
      break
    case 'platform':
      details = { 
        platform: data.name, 
        value: data.value,
        itemType: 'platform'
      }
      break
    case 'region':
      details = { 
        region: data.name, 
        value: data.value,
        itemType: 'region'
      }
      break
    case 'yearly':
      details = { 
        year: data.name, 
        value: data.value,
        itemType: 'year'
      }
      break
    case 'rating':
      details = { 
        score: data.value[0], 
        sales: data.value[1],
        itemType: 'rating_point'
      }
      break
    default:
      details = { 
        dataName: data.name,
        value: data.value,
        itemType: 'data_point'
      }
  }
  
  await recordUserAction('click_data_point', details)
}

// 加载世界地图数据
const loadWorldMap = async () => {
  if (mapLoaded.value) return true
  
  mapLoading.value = true
  console.log('开始加载世界地图...')
  
  const mapSources = [
    'https://cdn.jsdelivr.net/npm/echarts@5.4.3/map/json/world.json',
    'https://unpkg.com/echarts@5.4.3/map/json/world.json',
    null
  ]
  
  for (const source of mapSources) {
    try {
      if (source === null) {
        const simpleWorldMap = getSimplifiedWorldGeoJSON()
        echarts.registerMap('world', simpleWorldMap)
        mapLoaded.value = true
        mapLoading.value = false
        console.log('✅ 世界地图加载成功（内置版本）')
        return true
      }
      
      console.log('尝试从以下地址加载:', source)
      const response = await axios.get(source, { timeout: 5000 })
      
      if (response.data) {
        echarts.registerMap('world', response.data)
        mapLoaded.value = true
        mapLoading.value = false
        console.log('✅ 世界地图加载成功')
        return true
      }
    } catch (error) {
      console.warn(`❌ 从 ${source} 加载失败:`, error.message)
      continue
    }
  }
  
  mapLoading.value = false
  console.error('❌ 所有地图源加载失败')
  alert('地图数据加载失败，将使用柱状图显示')
  regionViewMode.value = 'bar'
  return false
}

// 简化的世界地图 GeoJSON
const getSimplifiedWorldGeoJSON = () => {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "United States of America" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-125, 50], [-125, 25], [-65, 25], [-65, 50], [-125, 50]
          ]]
        }
      },
      {
        type: "Feature",
        properties: { name: "Germany" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [5, 55], [5, 45], [20, 45], [20, 55], [5, 55]
          ]]
        }
      },
      {
        type: "Feature",
        properties: { name: "Japan" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [130, 45], [130, 30], [145, 30], [145, 45], [130, 45]
          ]]
        }
      },
      {
        type: "Feature",
        properties: { name: "Australia" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [110, -10], [110, -45], [155, -45], [155, -10], [110, -10]
          ]]
        }
      }
    ]
  }
}

// 方法
const sortTable = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
  
  // 记录排序行为
  recordUserAction('sort_table', {
    field: field,
    direction: sortDirection.value
  })
}

const getSortIcon = (field) => {
  if (sortField.value !== field) return '↕️'
  return sortDirection.value === 'asc' ? '↑' : '↓'
}

const exportChart = () => {
  if (chart.value) {
    const url = chart.value.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })
    
    const link = document.createElement('a')
    link.href = url
    link.download = `游戏数据图表_${props.type}_${regionViewMode.value}_${new Date().getTime()}.png`
    link.click()
    
    // 记录导出行为
    recordUserAction('export_chart', {
      chartType: props.type,
      format: 'png'
    })
  }
}

const toggleDataView = () => {
  showDataTable.value = !showDataTable.value
  
  // 记录视图切换
  recordUserAction('toggle_view', {
    viewType: showDataTable.value ? 'table' : 'chart'
  })
  
  if (!showDataTable.value && chart.value) {
    nextTick(() => {
      setTimeout(() => {
        chart.value.resize()
        renderChart()
      }, 100)
    })
  }
}

const toggleRegionView = async () => {
  console.log('切换视图，当前模式:', regionViewMode.value)
  
  if (regionViewMode.value === 'bar') {
    const loaded = await loadWorldMap()
    if (!loaded) return
  }
  
  regionViewMode.value = regionViewMode.value === 'bar' ? 'map' : 'bar'
  
  // 记录地图视图切换
  recordUserAction('toggle_map_view', {
    viewMode: regionViewMode.value
  })
  
  nextTick(() => {
    renderChart()
  })
}

const initChart = () => {
  if (!chartRef.value) {
    console.error('图表容器未找到')
    return null
  }
  
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }
  
  try {
    chart.value = echarts.init(chartRef.value)
    console.log('图表实例初始化成功')
    hasInitialized.value = true
    
    // 添加图表点击事件监听
    chart.value.on('click', (params) => {
      console.log('图表点击:', params)
      if (params.data) {
        recordDataPointClick(params.data)
      }
    })
    
    // 添加图表其他交互事件
    chart.value.on('datazoom', (params) => {
      recordUserAction('zoom_chart', {
        start: params.start,
        end: params.end
      })
    })
    
    return chart.value
  } catch (error) {
    console.error('图表实例初始化失败:', error)
    return null
  }
}

const ensureChartVisible = async () => {
  if (!chart.value) {
    console.log('图表实例不存在，重新初始化')
    initChart()
  }
  
  await nextTick()
  
  if (chart.value) {
    chart.value.resize()
    renderChart()
  }
}

const handleResize = () => {
  if (chart.value) {
    chart.value.resize()
  }
}

onMounted(() => {
  console.log('ChartDemo mounted, 类型:', props.type)
  
  const chartInstance = initChart()
  if (chartInstance) {
    window.addEventListener('resize', handleResize)
    fetchAndRender()
    
    // 记录图表初始化
    recordChartView()
  }
})

onUnmounted(() => {
  console.log('ChartDemo unmounted')
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }
  window.removeEventListener('resize', handleResize)
})

watch(() => props.type, (newType, oldType) => {
  console.log('图表类型变化:', oldType, '->', newType)
  if (newType !== 'region') {
    regionViewMode.value = 'bar'
  }
  fetchAndRender()
  
  // 记录图表类型切换
  recordUserAction('switch_chart_type', {
    from: oldType,
    to: newType
  })
})

watch(() => props.filters, (newFilters, oldFilters) => {
  console.log('筛选条件变化，重新获取数据', newFilters)
  fetchAndRender()
  
  // 记录筛选条件变化
  recordUserAction('apply_filters', {
    filters: newFilters,
    changedFrom: oldFilters
  })
}, { deep: true })

watch(showDataTable, (newVal) => {
  if (!newVal) {
    console.log('切换回图表视图')
    nextTick(() => {
      setTimeout(() => {
        ensureChartVisible()
      }, 150)
    })
  }
})

const fetchAndRender = async () => {
  if (isLoading.value) {
    console.log('请求进行中，跳过重复请求')
    return
  }
  
  isLoading.value = true
  console.log('开始获取数据:', props.type, '筛选条件:', props.filters)
  
  try {
    const params = new URLSearchParams({ type: props.type })
    
    if (props.filters.platform) params.append('platform', props.filters.platform)
    if (props.filters.genre) params.append('genre', props.filters.genre)
    if (props.filters.startYear) params.append('startYear', props.filters.startYear)
    if (props.filters.endYear) params.append('endYear', props.filters.endYear)
    if (props.filters.minSales) params.append('minSales', props.filters.minSales)
    if (props.filters.maxSales) params.append('maxSales', props.filters.maxSales)
    
    const res = await axios.get(`http://localhost:3000/chart-data?${params.toString()}`)
    console.log('获取到数据:', res.data.length, '条记录')
    
    chartData.value = res.data
    emit('data-loaded', chartData.value)
    
    if (!chart.value) {
      console.log('重新初始化图表实例')
      initChart()
    }
    
    if (!chart.value) {
      console.error('图表实例初始化失败，无法渲染')
      return
    }
    
    await renderChart()
    
  } catch (err) {
    console.error('获取图表数据失败：', err)
    chartData.value = []
    emit('data-loaded', [])
    
    if (chart.value) {
      chart.value.clear()
      chart.value.setOption({
        title: {
          text: '数据加载失败',
          subtext: '请检查网络连接或服务器状态',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      })
    }
  } finally {
    isLoading.value = false
  }
}

const renderChart = () => {
  return new Promise((resolve) => {
    nextTick(() => {
      if (!chart.value) {
        console.error('图表实例不存在，无法渲染')
        resolve()
        return
      }

      if (chartData.value.length === 0) {
        console.warn('图表数据为空')
        chart.value.clear()
        chart.value.setOption({
          title: {
            text: '暂无数据',
            left: 'center',
            top: 'center',
            textStyle: {
              color: '#999',
              fontSize: 16
            }
          }
        })
        resolve()
        return
      }

      try {
        let option = {}
        
        switch (props.type) {
          case 'region':
            option = regionViewMode.value === 'map' ? getRegionMapOption() : getRegionBarOption()
            break
          case 'genre':
            option = getGenreOption()
            break
          case 'yearly':
            option = getYearlyOption()
            break
          case 'platform':
            option = getPlatformOption()
            break
          case 'rating':
            option = getRatingOption()
            break
          default:
            console.warn('未定义的图表类型:', props.type)
        }
        
        if (Object.keys(option).length > 0) {
          option.textStyle = {
            fontFamily: 'Noto Sans SC, Microsoft YaHei, sans-serif'
          }
          
          chart.value.setOption(option, true)
          console.log('图表渲染完成:', props.type, '模式:', regionViewMode.value)
        }
        
      } catch (error) {
        console.error('图表渲染错误:', error)
      }
      
      resolve()
    })
  })
}

const getRegionBarOption = () => {
  const categories = chartData.value.map(d => String(d.category))
  const values = chartData.value.map(d => d.value)
  
  return {
    title: { 
      text: '按地区销量', 
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: { 
      trigger: 'axis',
      formatter: (params) => {
        const value = params[0].value
        return `${params[0].name}: ${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}M`
      }
    },
    grid: { 
      left: '8%', 
      right: '5%', 
      bottom: '15%', 
      top: '15%',
      containLabel: true 
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { alignWithLabel: true },
      axisLabel: { 
        rotate: 0, 
        interval: 0,
        fontSize: 12
      }
    },
    yAxis: { 
      type: 'value',
      name: '销量(百万)',
      nameTextStyle: {
        fontSize: 12
      },
      axisLabel: {
        formatter: (value) => {
          return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)
        }
      }
    },
    series: [{
      type: 'bar',
      data: values,
      barGap: 0,
      barCategoryGap: '20%',
      itemStyle: { 
        color: '#0d6efd',
        borderRadius: [2, 2, 0, 0]
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params) => {
          const value = params.value
          return (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) + 'M'
        },
        fontSize: 11
      }
    }]
  }
}

const getRegionMapOption = () => {
  const regionMapping = {
    'NA': 'United States of America',
    'EU': 'Germany',
    'JP': 'Japan',
    'Other': 'Australia'
  }
  
  const regionNames = {
    'NA': '北美地区',
    'EU': '欧洲地区',
    'JP': '日本地区',
    'Other': '其他地区'
  }
  
  const mapData = chartData.value.map(item => ({
    name: regionMapping[item.category],
    value: item.value,
    displayName: regionNames[item.category]
  }))
  
  const maxValue = Math.max(...chartData.value.map(d => d.value))
  
  return {
    title: {
      text: '全球地区销量分布',
      subtext: '基于实际销售数据',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.data) {
          return `${params.data.displayName}<br/>销量: ${params.data.value.toFixed(2)}M`
        }
        return params.name
      }
    },
    visualMap: {
      type: 'continuous',
      min: 0,
      max: maxValue,
      text: ['高', '低'],
      realtime: false,
      calculable: true,
      inRange: {
        color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
      },
      textStyle: {
        color: '#000'
      },
      left: 'left',
      bottom: '10%'
    },
    series: [{
      name: '游戏销量',
      type: 'map',
      map: 'world',
      roam: true,
      zoom: 1.2,
      scaleLimit: {
        min: 1,
        max: 3
      },
      itemStyle: {
        areaColor: '#f0f0f0',
        borderColor: '#999',
        borderWidth: 0.5
      },
      emphasis: {
        itemStyle: {
          areaColor: '#ffd700',
          borderColor: '#333',
          borderWidth: 1
        },
        label: {
          show: true,
          color: '#000'
        }
      },
      data: mapData
    }]
  }
}

const getGenreOption = () => {
  return {
    title: { 
      text: '按类型销量占比', 
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: { 
      trigger: 'item', 
      formatter: '{b}: {c}M ({d}%)' 
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
      textStyle: {
        fontSize: 12
      }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '55%'],
      data: chartData.value.map(d => ({ 
        value: d.value, 
        name: d.category 
      })),
      emphasis: {
        itemStyle: { 
          shadowBlur: 10, 
          shadowOffsetX: 0, 
          shadowColor: 'rgba(0,0,0,0.5)' 
        }
      },
      label: {
        formatter: '{b}: {d}%',
        fontSize: 12
      }
    }]
  }
}

const getYearlyOption = () => {
  const filteredData = chartData.value
    .map(d => ({ category: parseInt(d.category), value: d.value }))
    .filter(d => d.category && d.category <= 2016)
    .sort((a, b) => a.category - b.category)

  return {
    title: { 
      text: '年度全球销量趋势（1980-2016）', 
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: { 
      trigger: 'axis',
      formatter: '{b}年: {c}M'
    },
    grid: { 
      left: '8%', 
      right: '5%', 
      bottom: '15%', 
      top: '15%',
      containLabel: true 
    },
    xAxis: { 
      type: 'category', 
      data: filteredData.map(d => d.category),
      axisLabel: {
        fontSize: 12
      }
    },
    yAxis: { 
      type: 'value',
      name: '销量(百万)',
      nameTextStyle: {
        fontSize: 12
      }
    },
    series: [{
      type: 'line',
      data: filteredData.map(d => d.value),
      smooth: true,
      itemStyle: { color: '#198754' },
      lineStyle: {
        width: 3
      },
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(25, 135, 84, 0.3)'
          }, {
            offset: 1, color: 'rgba(25, 135, 84, 0.1)'
          }]
        }
      }
    }]
  }
}

const getPlatformOption = () => {
  const categories = chartData.value.map(d => String(d.category))
  const values = chartData.value.map(d => d.value)
  
  return {
    title: { 
      text: '平台销量对比', 
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: { 
      trigger: 'axis',
      formatter: (params) => {
        const value = params[0].value
        return `${params[0].name}: ${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}M`
      }
    },
    grid: { 
      left: '8%', 
      right: '5%', 
      bottom: '15%', 
      top: '15%',
      containLabel: true 
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { alignWithLabel: true },
      axisLabel: { 
        rotate: 45, 
        interval: 0,
        fontSize: 11
      }
    },
    yAxis: { 
      type: 'value',
      name: '销量(百万)',
      nameTextStyle: {
        fontSize: 12
      },
      axisLabel: {
        formatter: (value) => {
          return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)
        }
      }
    },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: { 
        color: '#0d6efd',
        borderRadius: [2, 2, 0, 0]
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params) => {
          const value = params.value
          return (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) + 'M'
        },
        fontSize: 11
      }
    }]
  }
}

const getRatingOption = () => {
  const ratingData = chartData.value
    .filter(d => d.sales > 0 && d.score != null)
    .map(d => ({ score: d.score, sales: d.sales }))

  const salesValues = ratingData.map(d => d.sales)
  const scoreValues = ratingData.map(d => d.score)
  const salesMin = Math.min(...salesValues)
  const salesMax = Math.max(...salesValues)
  const scoreMin = Math.min(...scoreValues)
  const scoreMax = Math.max(...scoreValues)

  const scatterSeriesData = ratingData.map(d => ({
    value: [d.score, d.sales],
    symbolSize: 8 + 15 * ((d.sales - salesMin) / (salesMax - salesMin)),
    itemStyle: {
      color: `rgb(${Math.round(255 * ((d.score - scoreMin) / (scoreMax - scoreMin)))}, 100, 150)`
    }
  }))

  return {
    title: { 
      text: '用户评分分析', 
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: params => `评分: ${params.value[0].toFixed(1)}<br>销量: ${params.value[1].toFixed(2)}M`
    },
    xAxis: { 
      type: 'value', 
      name: '评分',
      nameTextStyle: {
        fontSize: 12
      }
    },
    yAxis: { 
      type: 'log', 
      name: '销量(百万)',
      nameTextStyle: {
        fontSize: 12
      },
      minorSplitLine: { show: true } 
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'inside', yAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0, bottom: 10 },
      { type: 'slider', yAxisIndex: 0, right: 10 }
    ],
    series: [{
      type: 'scatter',
      data: scatterSeriesData
    }]
  }
}
</script>

<style scoped>
.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background-color: #f8f9fa;
}

.chart-toolbar {
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 0.5rem;
}

.progress {
  background-color: #e9ecef;
}

.chart-container {
  min-height: 400px;
}
</style>