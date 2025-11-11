<template>
  <div class="user-profile">
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0">👤 个人中心</h5>
      </div>
      <div class="card-body">
        
        <!-- 用户信息卡片 -->
        <div class="row mb-4">
          <div class="col-md-4">
            <div class="card bg-light">
              <div class="card-body text-center">
                <div class="avatar-circle bg-primary text-white mb-3">
                  {{ userInitials }}
                </div>
                <h6 class="mb-1">{{ userInfo.username }}</h6>
                <p class="text-muted mb-0">{{ userInfo.email }}</p>
                <small class="text-muted">
                  注册于 {{ formatDate(userInfo.createdAt) }}
                </small>
              </div>
            </div>
          </div>
          
          <div class="col-md-8">
            <div class="card">
              <div class="card-body">
                <h6 class="card-title">📊 使用统计</h6>
                <div class="row text-center">
                  <div class="col-4">
                    <div class="stat-value">{{ viewHistory.length }}</div>
                    <div class="stat-label">浏览游戏</div>
                  </div>
                  <div class="col-4">
                    <div class="stat-value">{{ favoriteGenres.length }}</div>
                    <div class="stat-label">喜欢类型</div>
                  </div>
                  <div class="col-4">
                    <div class="stat-value">{{ favoritePlatforms.length }}</div>
                    <div class="stat-label">常用平台</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 选项卡 -->
        <ul class="nav nav-tabs mb-3" role="tablist">
          <li class="nav-item">
            <button 
              class="nav-link" 
              :class="{ active: activeTab === 'history' }"
              @click="activeTab = 'history'">
              📜 浏览历史
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link" 
              :class="{ active: activeTab === 'preferences' }"
              @click="activeTab = 'preferences'">
              ⚙️ 偏好设置
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link" 
              :class="{ active: activeTab === 'settings' }"
              @click="activeTab = 'settings'">
              🔧 账号设置
            </button>
          </li>
        </ul>

        <!-- 浏览历史 -->
        <div v-if="activeTab === 'history'" class="tab-content">
          <h6>最近浏览的游戏</h6>
          <div v-if="viewHistory.length === 0" class="text-center text-muted py-5">
            <p>暂无浏览记录</p>
            <small>浏览游戏后会显示在这里</small>
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>游戏名称</th>
                  <th>平台</th>
                  <th>类型</th>
                  <th>销量</th>
                  <th>浏览时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in viewHistory.slice(0, 20)" :key="index">
                  <td><strong>{{ item.game.Name }}</strong></td>
                  <td>
                    <span class="badge bg-secondary">{{ item.game.Platform }}</span>
                  </td>
                  <td>
                    <span class="badge bg-info">{{ item.game.Genre }}</span>
                  </td>
                  <td>{{ item.game.Global_Sales?.toFixed(2) }}M</td>
                  <td class="text-muted">{{ formatDateTime(item.viewedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 偏好设置 -->
        <div v-if="activeTab === 'preferences'" class="tab-content">
          <h6 class="mb-3">个性化偏好</h6>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">喜欢的游戏类型</label>
              <div class="genre-tags">
                <span 
                  v-for="genre in allGenres" 
                  :key="genre"
                  class="badge me-2 mb-2 cursor-pointer"
                  :class="favoriteGenres.includes(genre) ? 'bg-primary' : 'bg-light text-dark'"
                  @click="toggleGenre(genre)">
                  {{ genre }}
                </span>
              </div>
            </div>
            
            <div class="col-md-6 mb-3">
              <label class="form-label">喜欢的平台</label>
              <div class="platform-tags">
                <span 
                  v-for="platform in allPlatforms" 
                  :key="platform"
                  class="badge me-2 mb-2 cursor-pointer"
                  :class="favoritePlatforms.includes(platform) ? 'bg-success' : 'bg-light text-dark'"
                  @click="togglePlatform(platform)">
                  {{ platform }}
                </span>
              </div>
            </div>
          </div>

          <button @click="savePreferences" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
            {{ saving ? '保存中...' : '💾 保存偏好' }}
          </button>

          <div v-if="saveMessage" class="alert alert-success mt-3">
            {{ saveMessage }}
          </div>
        </div>

        <!-- 账号设置 -->
        <div v-if="activeTab === 'settings'" class="tab-content">
          <h6 class="mb-3">账号安全</h6>
          
          <div class="alert alert-info">
            <strong>💡 提示:</strong> 修改密码功能开发中...
          </div>

          <div class="mt-4">
            <h6 class="text-danger">危险操作</h6>
            <p class="text-muted">删除账号将永久删除您的所有数据，此操作不可恢复。</p>
            <button class="btn btn-danger" @click="handleDeleteAccount">
              🗑️ 删除账号
            </button>
          </div>

          <div class="mt-4">
            <button @click="handleLogout" class="btn btn-outline-secondary">
              🚪 退出登录
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const emit = defineEmits(['logout'])

const activeTab = ref('history')
const userInfo = ref({
  username: '',
  email: '',
  createdAt: new Date()
})
const viewHistory = ref([])
const favoriteGenres = ref([])
const favoritePlatforms = ref([])
const allGenres = ref([])
const allPlatforms = ref([])
const saving = ref(false)
const saveMessage = ref('')

// 计算属性
const userInitials = computed(() => {
  if (!userInfo.value.username) return '?'
  return userInfo.value.username.charAt(0).toUpperCase()
})

// 方法
const loadUserProfile = async () => {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    
    const response = await axios.get('http://localhost:3000/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    userInfo.value = response.data
    favoriteGenres.value = response.data.preferences?.favoriteGenres || []
    favoritePlatforms.value = response.data.preferences?.favoritePlatforms || []
    viewHistory.value = response.data.preferences?.viewHistory || []
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

const loadFilterOptions = async () => {
  try {
    const response = await axios.get('http://localhost:3000/filter-options')
    allGenres.value = response.data.genres || []
    allPlatforms.value = response.data.platforms || []
  } catch (error) {
    console.error('加载筛选选项失败:', error)
  }
}

const toggleGenre = (genre) => {
  const index = favoriteGenres.value.indexOf(genre)
  if (index > -1) {
    favoriteGenres.value.splice(index, 1)
  } else {
    favoriteGenres.value.push(genre)
  }
}

const togglePlatform = (platform) => {
  const index = favoritePlatforms.value.indexOf(platform)
  if (index > -1) {
    favoritePlatforms.value.splice(index, 1)
  } else {
    favoritePlatforms.value.push(platform)
  }
}

const savePreferences = async () => {
  saving.value = true
  saveMessage.value = ''

  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    
    await axios.put('http://localhost:3000/api/user/preferences', {
      preferences: {
        favoriteGenres: favoriteGenres.value,
        favoritePlatforms: favoritePlatforms.value
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    saveMessage.value = '✅ 偏好设置已保存'
    
    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('保存偏好失败:', error)
    saveMessage.value = '❌ 保存失败，请重试'
  } finally {
    saving.value = false
  }
}

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userInfo')
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('userInfo')
    
    emit('logout')
  }
}

const handleDeleteAccount = () => {
  const confirmed = confirm(
    '⚠️ 警告：删除账号将永久删除您的所有数据！\n\n此操作不可恢复，确定要继续吗？'
  )
  
  if (confirmed) {
    const doubleConfirm = confirm('请再次确认：真的要删除账号吗？')
    
    if (doubleConfirm) {
      alert('账号删除功能开发中...')
    }
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadUserProfile()
  loadFilterOptions()
})
</script>

<style scoped>
.user-profile {
  max-width: 1200px;
  margin: 0 auto;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  margin: 0 auto;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #0d6efd;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
}

.nav-tabs .nav-link {
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6c757d;
}

.nav-tabs .nav-link:hover {
  color: #0d6efd;
  border-bottom-color: #dee2e6;
}

.nav-tabs .nav-link.active {
  color: #0d6efd;
  border-bottom-color: #0d6efd;
  background: none;
}

.tab-content {
  min-height: 300px;
}

.cursor-pointer {
  cursor: pointer;
  transition: all 0.2s;
}

.cursor-pointer:hover {
  transform: scale(1.05);
}

.genre-tags, .platform-tags {
  display: flex;
  flex-wrap: wrap;
}

.table th {
  background-color: #f8f9fa;
  font-weight: 600;
}
</style>