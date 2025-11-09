<template>
  <div class="advanced-filters">
    <div class="card">
      <!-- 卡片头部 -->
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">🔍 高级筛选</h6>
        <button 
          @click="toggleCollapse" 
          class="btn btn-sm btn-outline-secondary"
          type="button"
        >
          {{ isCollapsed ? '展开' : '收起' }}
        </button>
      </div>
      
      <!-- 筛选内容区域 -->
      <div v-show="!isCollapsed">
        <div class="card-body">
          <div class="row g-3">
            <!-- 平台筛选 -->
            <div class="col-md-3">
              <label class="form-label">平台</label>
              <select v-model="filters.platform" class="form-select" @change="onFilterChange">
                <option value="">所有平台</option>
                <option v-for="platform in platformOptions" :key="platform" :value="platform">
                  {{ platform }}
                </option>
              </select>
            </div>
            
            <!-- 类型筛选 -->
            <div class="col-md-3">
              <label class="form-label">游戏类型</label>
              <select v-model="filters.genre" class="form-select" @change="onFilterChange">
                <option value="">所有类型</option>
                <option v-for="genre in genreOptions" :key="genre" :value="genre">
                  {{ genre }}
                </option>
              </select>
            </div>
            
            <!-- 年份范围 -->
            <div class="col-md-3">
              <label class="form-label">开始年份</label>
              <input v-model.number="filters.startYear" type="number" class="form-control" 
                     placeholder="1980" min="1980" max="2023" @input="onFilterChange">
            </div>
            
            <div class="col-md-3">
              <label class="form-label">结束年份</label>
              <input v-model.number="filters.endYear" type="number" class="form-control" 
                     placeholder="2016" min="1980" max="2023" @input="onFilterChange">
            </div>
            
            <!-- 销量范围 -->
            <div class="col-md-6">
              <label class="form-label">销量范围 (百万)</label>
              <div class="d-flex align-items-center">
                <input v-model.number="filters.minSales" type="number" class="form-control" 
                       placeholder="最小" step="0.1" @input="onFilterChange">
                <span class="mx-2">-</span>
                <input v-model.number="filters.maxSales" type="number" class="form-control" 
                       placeholder="最大" step="0.1" @input="onFilterChange">
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="col-md-6 d-flex align-items-end">
              <button @click="resetFilters" class="btn btn-outline-secondary me-2">
                🔄 重置
              </button>
              <button @click="saveFilterPreset" class="btn btn-outline-primary">
                💾 保存筛选
              </button>
            </div>
          </div>
          
          <!-- 保存的筛选预设 -->
          <div v-if="filterPresets.length > 0" class="mt-3">
            <label class="form-label">筛选预设:</label>
            <div class="d-flex flex-wrap gap-2">
              <span v-for="preset in filterPresets" :key="preset.id" 
                    class="badge bg-light text-dark cursor-pointer"
                    @click="loadFilterPreset(preset)">
                {{ preset.name }} 
                <span @click.stop="deleteFilterPreset(preset.id)" class="ms-1">❌</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const emit = defineEmits(['filterChange'])

// 收起/展开状态
const isCollapsed = ref(false)

const filters = reactive({
  platform: '',
  genre: '',
  startYear: null,
  endYear: null,
  minSales: null,
  maxSales: null
})

const filterPresets = ref([])
const platformOptions = ref([])
const genreOptions = ref([])

// 从后端加载筛选选项
const loadFilterOptions = async () => {
  try {
    const res = await axios.get('http://localhost:3000/filter-options')
    platformOptions.value = res.data.platforms || []
    genreOptions.value = res.data.genres || []
    console.log('筛选选项加载成功:', res.data)
  } catch (error) {
    console.error('加载筛选选项失败:', error)
    // 使用默认值
    platformOptions.value = ['PS4', 'XOne', 'Switch', 'PC', 'PS3', 'X360', 'Wii']
    genreOptions.value = ['Action', 'Sports', 'Shooter', 'Role-Playing', 'Platform']
  }
}

// 使用内存存储代替 localStorage
const storageKey = 'chartFilterPresets'
const presetStorage = ref([])

// 从内存加载预设
const loadPresetsFromStorage = () => {
  filterPresets.value = [...presetStorage.value]
}

// 保存预设到内存
const savePresetsToStorage = () => {
  presetStorage.value = [...filterPresets.value]
}

onMounted(() => {
  loadFilterOptions()
  loadPresetsFromStorage()
})

// 切换收起/展开
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const onFilterChange = () => {
  // 清理空值
  const cleanedFilters = {}
  Object.keys(filters).forEach(key => {
    if (filters[key] !== null && filters[key] !== '') {
      cleanedFilters[key] = filters[key]
    }
  })
  
  emit('filterChange', cleanedFilters)
}

const resetFilters = () => {
  filters.platform = ''
  filters.genre = ''
  filters.startYear = null
  filters.endYear = null
  filters.minSales = null
  filters.maxSales = null
  onFilterChange()
}

const saveFilterPreset = () => {
  const name = prompt('请输入预设名称:')
  if (name && name.trim()) {
    const preset = {
      id: Date.now(),
      name: name.trim(),
      filters: { ...filters }
    }
    filterPresets.value.push(preset)
    savePresetsToStorage()
    alert('筛选预设已保存!')
  }
}

const loadFilterPreset = (preset) => {
  Object.assign(filters, preset.filters)
  onFilterChange()
}

const deleteFilterPreset = (presetId) => {
  if (confirm('确定要删除这个筛选预设吗?')) {
    filterPresets.value = filterPresets.value.filter(p => p.id !== presetId)
    savePresetsToStorage()
  }
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.advanced-filters .card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.advanced-filters .btn-sm {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.badge {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
}

.badge:hover {
  background-color: #e9ecef !important;
}
</style>