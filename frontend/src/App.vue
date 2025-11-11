<template>
   <router-view v-if="$route.path !== '/'"></router-view>
  <div class="d-flex">
    <!-- 左侧导航栏 -->
    <nav class="sidebar bg-dark text-white d-flex flex-column p-3">
      <h4 class="sidebar-title text-center mb-4">🎮 游戏数据分析</h4>

      <!-- 用户信息显示 -->
      <div v-if="userAuthStatus" class="user-info mb-4 p-3 bg-primary rounded text-center">
        <div class="avatar-circle bg-white text-primary mb-2 mx-auto">
          {{ userInitials }}
        </div>
        <h6 class="mb-1">{{ currentUser.username }}</h6>
        <small class="text-light">{{ currentUser.email }}</small>
        <div class="mt-2">
          <button @click="openUserProfile" class="btn btn-sm btn-outline-light me-1">
            👤 个人中心
          </button>
          <button @click="handleLogout" class="btn btn-sm btn-outline-light">
            🚪 退出
          </button>
        </div>
      </div>

      <ul class="nav nav-pills flex-column mb-auto">
        <!-- 数据分析主选项 -->
        <li class="nav-item mb-2">
          <a
            href="#"
            class="nav-link d-flex align-items-center justify-content-between main-nav-item"
            :class="{ active: currentSection === 'analytics' }"
            @click.prevent="toggleAnalyticsSection"
          >
            <span class="d-flex align-items-center">
              <span class="me-2">📊</span>数据分析
            </span>
            <span class="arrow">{{ isAnalyticsExpanded ? '▼' : '►' }}</span>
          </a>
          
          <!-- 数据分析子菜单 -->
          <div v-if="isAnalyticsExpanded" class="sub-menu mt-2 ps-4">
            <a
              v-for="chart in analyticsCharts"
              :key="chart.type"
              href="#"
              class="nav-link sub-nav-link d-flex align-items-center mb-2"
              :class="{ active: selectedChart === chart.type }"
              @click.prevent="selectAnalyticsChart(chart.type)"
            >
              <span class="me-2">{{ chart.icon }}</span>{{ chart.label }}
            </a>
          </div>
        </li>

        <!-- 市场洞察主选项 -->
        <li class="nav-item mb-2">
          <a
            href="#"
            class="nav-link d-flex align-items-center justify-content-between main-nav-item"
            :class="{ active: currentSection === 'insights' }"
            @click.prevent="toggleInsightsSection"
          >
            <span class="d-flex align-items-center">
              <span class="me-2">🔍</span>市场洞察
            </span>
            <span class="arrow">{{ isInsightsExpanded ? '▼' : '►' }}</span>
          </a>
          
          <!-- 市场洞察子菜单 -->
          <div v-if="isInsightsExpanded" class="sub-menu mt-2 ps-4">
            <a
              v-for="insight in insightsOptions"
              :key="insight.type"
              href="#"
              class="nav-link sub-nav-link d-flex align-items-center mb-2"
              :class="{ active: selectedInsight === insight.type }"
              @click.prevent="selectInsight(insight.type)"
            >
              <span class="me-2">{{ insight.icon }}</span>{{ insight.label }}
            </a>
          </div>
        </li>

        <!-- 智能推荐选项 -->
        <li class="nav-item">
          <a
            href="#"
            class="nav-link d-flex align-items-center main-nav-item"
            :class="{ active: currentSection === 'recommendation' }"
            @click.prevent="selectRecommendation"
          >
            <span class="me-2">🤖</span>智能推荐
          </a>
        </li>
      </ul>

      <div class="mt-auto">
        <a
          v-if="!userAuthStatus"
          href="#"
          class="nav-link d-flex align-items-center login-btn"
          @click.prevent="openLogin"
        >
          🔑 <span class="ms-2">登录 / 注册</span>
        </a>
        <div v-else class="text-center">
          <small class="text-muted">已登录</small>
        </div>
      </div>
    </nav>

    <!-- 右侧主内容 -->
    <main class="flex-grow-1 p-4 bg-light">
      <!-- 顶部栏 -->
      <div class="top-bar mb-4">
        <div class="d-flex justify-content-between align-items-center">
          <!-- 当前页面标题 -->
          <div class="page-title">
            <h4 class="mb-1">{{ currentPageTitle }}</h4>
            <small class="text-muted">{{ currentPageDescription }}</small>
          </div>
          
          <!-- 视图切换 - 只在数据分析的图表视图显示 -->
          <div class="view-mode" v-if="currentSection === 'analytics' && viewMode !== 'compare'">
            <div class="btn-group" role="group">
              <button type="button" class="btn btn-outline-primary btn-sm"
                      :class="{ active: viewMode === 'chart' }"
                      @click="viewMode = 'chart'">
                📊 图表视图
              </button>
              <button type="button" class="btn btn-outline-primary btn-sm"
                      :class="{ active: viewMode === 'compare' }"
                      @click="viewMode = 'compare'">
                ⚖️ 对比视图
              </button>
            </div>
          </div>

          <!-- 用户状态指示器 -->
          <div class="user-status">
            <span v-if="userAuthStatus" class="badge bg-success">
              ✅ 已登录: {{ currentUser.username }}
            </span>
            <span v-else class="badge bg-warning text-dark">
              🔒 未登录 - <a href="#" @click.prevent="openLogin" class="text-dark">立即登录</a>
            </span>
          </div>
        </div>
      </div>

      <!-- 对比视图 -->
      <CompareView v-if="viewMode === 'compare'" :currentFilters="currentFilters" />
      
      <!-- 智能推荐视图 -->
      <RecommendationView v-else-if="currentSection === 'recommendation'" />
      
      <!-- 市场洞察视图 -->
      <MarketInsightsView v-else-if="currentSection === 'insights'" 
                         :selectedInsight="selectedInsight" />
      
      <!-- 数据分析视图 -->
      <div v-else-if="currentSection === 'analytics'">
        <!-- 数据洞察卡片 -->
        <DataInsights 
          :chartData="currentChartData" 
          :chartType="selectedChart"
        />
        
        <!-- 高级筛选 -->
        <AdvancedFilters 
          @filterChange="handleFilterChange"
          ref="advancedFiltersRef"
        />
        
        <!-- 图表展示 -->
        <ChartDemo 
          :type="selectedChart" 
          :filters="currentFilters"
          @data-loaded="handleDataLoaded"
          :key="`chart-${selectedChart}-${filterKey}`"
        />
      </div>
    </main>

    <!-- 登录组件 -->
    <LoginEnhanced ref="loginRef" 
                  @loginSuccess="handleLoginSuccess" 
                  @registerSuccess="handleRegisterSuccess" />
    
    <!-- 用户个人中心模态框 -->
    <UserProfile v-if="showUserProfile" 
                @logout="handleLogout"
                @close="showUserProfile = false" />
  </div>
  
</template>

<script setup>
import { ref, computed, onMounted,  watch } from 'vue'
import { useRouter ,useRoute} from 'vue-router'
import LoginEnhanced from './components/LoginEnhanced.vue'
import ChartDemo from './components/ChartDemo.vue'
import AdvancedFilters from './components/AdvancedFilters.vue'
import DataInsights from './components/DataInsights.vue'
import CompareView from './components/CompareView.vue'
import RecommendationView from './components/RecommendationView.vue'
import MarketInsightsView from './components/MarketInsightsView.vue'
import UserProfile from './components/UserProfile.vue'
import { 
  isAuthenticated, 
  getUserInfo, 
  clearToken, 
  verifyToken,
  logout as authLogout,
  getToken 
} from './authUtils'

// 数据分析图表配置
const analyticsCharts = [
  { type: 'region', label: '地区销量分析', icon: '🌍' },
  { type: 'genre', label: '类型占比分析', icon: '🥧' },
  { type: 'yearly', label: '年度趋势分析', icon: '📈' },
  { type: 'platform', label: '平台对比分析', icon: '🖥️' },
  { type: 'rating', label: '评分分析', icon: '⭐' },
]

// 市场洞察选项配置
const insightsOptions = [
  { type: 'opportunities', label: '市场机会分析', icon: '🚀' },
  { type: 'competition', label: '竞争分析', icon: '🎯' },
  { type: 'pricing', label: '价格策略分析', icon: '💰' },
]

// 响应式数据
const router = useRouter() 
const route = useRoute() 
const currentSection = ref('analytics') // 'analytics' | 'insights' | 'recommendation'
const selectedChart = ref('region')
const selectedInsight = ref('opportunities')
const viewMode = ref('chart')
const isAnalyticsExpanded = ref(true)
const isInsightsExpanded = ref(false)
const currentChartData = ref([])
const currentFilters = ref({})
const filterKey = ref(0)
const loginRef = ref(null)
const advancedFiltersRef = ref(null)
const showUserProfile = ref(false)

// 用户状态
const userAuthStatus = ref(false)
const currentUser = ref({})

// 计算属性
const currentPageTitle = computed(() => {
  switch (currentSection.value) {
    case 'recommendation':
      return '智能游戏推荐'
    case 'insights':
      const insight = insightsOptions.find(i => i.type === selectedInsight.value)
      return insight ? insight.label : '市场洞察'
    default:
      const chart = analyticsCharts.find(c => c.type === selectedChart.value)
      return chart ? chart.label : '数据分析'
  }
})

const currentPageDescription = computed(() => {
  switch (currentSection.value) {
    case 'recommendation':
      return userAuthStatus.value ? '基于您的偏好推荐热门游戏' : '登录后享受个性化推荐'
    case 'insights':
      return '为游戏发行商、投资者提供决策支持'
    default:
      return '探索游戏销售数据的深度洞察'
  }
})

const userInitials = computed(() => {
  if (!currentUser.value.username) return '?'
  return currentUser.value.username.charAt(0).toUpperCase()
})

// 方法
const checkAuthStatus = async () => {
  console.log('检查认证状态...')
  const token = getToken()
  console.log('本地token:', token ? '存在' : '不存在')
  
  if (!token) {
    userAuthStatus.value = false
    currentUser.value = {}
    console.log('无token，设置为未登录状态')
    return
  }
  
  try {
    console.log('发送验证请求...')
    const authenticated = await verifyToken()
    console.log('服务器验证结果:', authenticated)
    
    userAuthStatus.value = authenticated
    
    if (authenticated) {
      const userInfo = getUserInfo()
      console.log('获取用户信息成功:', userInfo)
      currentUser.value = userInfo || {}
    } else {
      console.log('Token无效，清除状态')
      currentUser.value = {}
      clearToken()
    }
  } catch (error) {
    console.error('认证检查出错:', error)
    userAuthStatus.value = false
    currentUser.value = {}
    clearToken()
  }
}

const openLogin = () => {
  loginRef.value?.openModal()
}

const openUserProfile = () => {
  console.log('🔍 点击个人中心按钮')
  console.log('当前认证状态:', userAuthStatus.value)
  console.log('当前用户:', currentUser.value)
  
  if (!userAuthStatus.value) {
    console.log('用户未登录，打开登录弹窗')
    openLogin()
    return
  }
  
  console.log('准备跳转到个人中心')
  console.log('router 对象:', router)
  
  try {
    router.push('/profile')
    console.log('✅ 路由跳转指令已发送')
  } catch (error) {
    console.error('❌ 路由跳转失败:', error)
    // 备用方案：使用原生跳转
    window.location.href = '/profile'
  }
}
const handleLoginSuccess = (userData) => {
  console.log('登录成功:', userData)
  userAuthStatus.value = true
  currentUser.value = userData
  // 可以在这里加载用户偏好数据
}

const handleRegisterSuccess = (userData) => {
  console.log('注册成功:', userData)
  userAuthStatus.value = true
  currentUser.value = userData
}

const handleLogout = async () => {
  if (confirm('确定要退出登录吗？')) {
    try {
      await authLogout()
    } catch (error) {
      console.error('退出登录请求失败:', error)
    } finally {
      // 无论如何都清除本地状态
      userAuthStatus.value = false
      currentUser.value = {}
      showUserProfile.value = false
      // 强制清除所有存储
      localStorage.clear()
      sessionStorage.clear()
      console.log('已退出登录，清除所有状态')
    }
  }
}

const toggleAnalyticsSection = () => {
  if (currentSection.value === 'analytics') {
    isAnalyticsExpanded.value = !isAnalyticsExpanded.value
  } else {
    currentSection.value = 'analytics'
    isAnalyticsExpanded.value = true
    isInsightsExpanded.value = false
    selectedChart.value = 'region'
    viewMode.value = 'chart'
  }
}

const toggleInsightsSection = () => {
  if (currentSection.value === 'insights') {
    isInsightsExpanded.value = !isInsightsExpanded.value
  } else {
    currentSection.value = 'insights'
    isInsightsExpanded.value = true
    isAnalyticsExpanded.value = false
    selectedInsight.value = 'opportunities'
  }
}

const selectAnalyticsChart = (chartType) => {
  selectedChart.value = chartType
  viewMode.value = 'chart'
  currentSection.value = 'analytics'
}

const selectInsight = (insightType) => {
  selectedInsight.value = insightType
  currentSection.value = 'insights'
}

const selectRecommendation = () => {
  currentSection.value = 'recommendation'
  isAnalyticsExpanded.value = false
  isInsightsExpanded.value = false
}

const handleFilterChange = (filters) => {
  console.log('筛选条件变化:', filters)
  currentFilters.value = { ...filters }
  filterKey.value++ // 强制重新渲染
}

const handleDataLoaded = (data) => {
  currentChartData.value = data
  console.log('图表数据已加载:', data.length, '条')
}

// 初始化
onMounted(() => {
  isAnalyticsExpanded.value = true
  checkAuthStatus()
})
</script>

<style scoped>
.sidebar {
  width: 300px;
  min-height: 100vh;
  border-radius: 0 10px 10px 0;
  box-shadow: 3px 0 10px rgba(0,0,0,0.15);
  background: linear-gradient(180deg, #343a40, #212529);
}

.sidebar-title {
  font-weight: 700;
  font-size: 1.2rem;
  border-bottom: 1px solid rgba(255,255,255,0.3);
  padding-bottom: 0.5rem;
}

.main-nav-item {
  border-radius: 0.5rem;
  transition: all 0.2s;
  border: none;
  padding: 0.75rem 1rem;
  font-weight: 500;
}

.main-nav-item:hover {
  background-color: rgba(255,255,255,0.15);
  transform: translateX(3px);
}

.main-nav-item.active {
  background-color: #0d6efd;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(13,110,253,0.5);
}

/* 子菜单样式 */
.sub-menu {
  border-left: 2px solid rgba(255,255,255,0.2);
  margin-left: 0.5rem;
}

.sub-nav-link {
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255,255,255,0.05);
  border-radius: 0.375rem;
  border: none;
}

.sub-nav-link:hover {
  background-color: rgba(255,255,255,0.1);
  transform: translateX(2px);
}

.sub-nav-link.active {
  background-color: rgba(13,110,253,0.8);
  color: white;
}

.arrow {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* 用户信息样式 */
.user-info {
  background: linear-gradient(135deg, #0d6efd, #198754) !important;
}

.avatar-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
}

.login-btn {
  background: linear-gradient(90deg, #0d6efd, #198754);
  border-radius: 0.5rem;
  justify-content: center;
  transition: all 0.2s;
  padding: 0.75rem 1rem;
  font-weight: 500;
}

.login-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(13,110,253,0.5);
}

.top-bar {
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.page-title h4 {
  color: #2c3e50;
  font-weight: 600;
}

.view-mode .btn {
  border-radius: 20px;
  font-weight: 500;
}

.user-status .badge {
  font-size: 0.8rem;
  padding: 0.5rem 0.75rem;
}
</style>