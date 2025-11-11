<template>
  <div class="user-profile-view">
    <div class="container-fluid">
      <!-- 顶部导航 -->
      <nav class="navbar navbar-light bg-light mb-4">
        <div class="container-fluid">
          <a class="navbar-brand" href="/">
            <span class="me-2">🎮</span>游戏数据分析系统
          </a>
          <div class="d-flex">
            <button @click="goBack" class="btn btn-outline-secondary me-2">
              ← 返回首页
            </button>
            <button @click="handleLogout" class="btn btn-outline-danger">
              🚪 退出登录
            </button>
          </div>
        </div>
      </nav>

      <div class="row">
        <!-- 左侧个人信息 -->
        <div class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body text-center">
              <div class="avatar-section mb-4">
                <div class="avatar-circle bg-primary text-white mx-auto mb-3">
                  {{ userInitials }}
                </div>
                <h4 class="mb-1">{{ userInfo.username }}</h4>
                <p class="text-muted mb-2">{{ userInfo.email }}</p>
                <small class="text-muted">
                  注册于 {{ formatDate(userInfo.createdAt) }}
                </small>
              </div>

              <!-- 统计卡片 -->
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ viewHistory.length }}</div>
                  <div class="stat-label">浏览记录</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ favoriteGenres.length }}</div>
                  <div class="stat-label">喜欢类型</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ favoritePlatforms.length }}</div>
                  <div class="stat-label">常用平台</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 快速操作 -->
          <div class="card shadow-sm mt-3">
            <div class="card-body">
              <h6 class="card-title">🔧 快速操作</h6>
              <div class="d-grid gap-2">
                <button @click="activeTab = 'preferences'" 
                        class="btn btn-outline-primary text-start">
                  ⚙️ 编辑偏好设置
                </button>
                <button @click="exportUserData" 
                        class="btn btn-outline-info text-start">
                  💾 导出我的数据
                </button>
                <button @click="showDeleteConfirm = true" 
                        class="btn btn-outline-danger text-start">
                  🗑️ 删除账号
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧内容区域 -->
        <div class="col-md-8">
          <div class="card shadow-sm">
            <div class="card-body">
              <!-- 选项卡 -->
              <ul class="nav nav-tabs mb-4">
                <li class="nav-item">
                  <button class="nav-link" 
                          :class="{ active: activeTab === 'history' }"
                          @click="activeTab = 'history'">
                    📜 浏览历史
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link" 
                          :class="{ active: activeTab === 'preferences' }"
                          @click="activeTab = 'preferences'">
                    ⚙️ 偏好设置
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link" 
                          :class="{ active: activeTab === 'security' }"
                          @click="activeTab = 'security'">
                    🔒 账号安全
                  </button>
                </li>
              </ul>

              <!-- 浏览历史 -->
              <div v-if="activeTab === 'history'" class="tab-content">
                <h5 class="mb-3">最近浏览的游戏</h5>
                <div v-if="viewHistory.length === 0" class="text-center py-5 text-muted">
                  <div class="mb-3">
                    <span style="font-size: 3rem;">🎮</span>
                  </div>
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
                        <th>评分</th>
                        <th>浏览时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in viewHistory" :key="index" 
                          @click="viewGameDetails(item.game)" class="cursor-pointer">
                        <td>
                          <strong>{{ item.game.Name }}</strong>
                          <br>
                          <small class="text-muted">{{ item.game.Publisher }}</small>
                        </td>
                        <td>
                          <span class="badge bg-secondary">{{ item.game.Platform }}</span>
                        </td>
                        <td>
                          <span class="badge bg-info">{{ item.game.Genre }}</span>
                        </td>
                        <td>{{ item.game.Global_Sales?.toFixed(2) }}M</td>
                        <td>
                          <span v-if="item.game.User_Score" class="badge bg-warning">
                            ⭐ {{ item.game.User_Score }}
                          </span>
                          <span v-else class="text-muted">-</span>
                        </td>
                        <td class="text-muted">
                          <small>{{ formatDateTime(item.viewedAt) }}</small>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 偏好设置 -->
              <div v-if="activeTab === 'preferences'" class="tab-content">
                <h5 class="mb-3">个性化偏好设置</h5>
                
                <div class="row">
                  <div class="col-md-6 mb-4">
                    <label class="form-label fw-bold">🎮 喜欢的游戏类型</label>
                    <p class="text-muted small mb-3">点击选择您感兴趣的游戏类型</p>
                    <div class="preference-tags">
                      <span 
                        v-for="genre in allGenres" 
                        :key="genre"
                        class="badge me-2 mb-2 preference-tag"
                        :class="favoriteGenres.includes(genre) ? 'bg-primary' : 'bg-light text-dark'"
                        @click="togglePreference('genre', genre)">
                        {{ genre }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="col-md-6 mb-4">
                    <label class="form-label fw-bold">🖥️ 喜欢的平台</label>
                    <p class="text-muted small mb-3">选择您常用的游戏平台</p>
                    <div class="preference-tags">
                      <span 
                        v-for="platform in allPlatforms" 
                        :key="platform"
                        class="badge me-2 mb-2 preference-tag"
                        :class="favoritePlatforms.includes(platform) ? 'bg-success' : 'bg-light text-dark'"
                        @click="togglePreference('platform', platform)">
                        {{ platform }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-12">
                    <button @click="savePreferences" class="btn btn-primary" :disabled="saving">
                      <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                      {{ saving ? '保存中...' : '💾 保存偏好设置' }}
                    </button>
                    
                    <div v-if="saveMessage" class="alert alert-success mt-3">
                      {{ saveMessage }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 账号安全 -->
              <div v-if="activeTab === 'security'" class="tab-content">
                <h5 class="mb-3">账号安全设置</h5>
                
                <div class="alert alert-info">
                  <strong>💡 提示:</strong> 密码修改功能正在开发中，敬请期待...
                </div>

                <div class="card border-warning mt-4">
                  <div class="card-header bg-warning text-dark">
                    <strong>⚠️ 危险操作</strong>
                  </div>
                  <div class="card-body">
                    <p class="text-muted">
                      删除账号将永久删除您的所有数据，包括浏览记录、个人偏好等。
                      <strong>此操作不可恢复！</strong>
                    </p>
                    <button @click="showDeleteConfirm = true" class="btn btn-danger">
                      🗑️ 删除我的账号
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirm" class="modal fade show d-block" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">⚠️ 确认删除账号</h5>
          </div>
          <div class="modal-body">
            <p>您确定要永久删除账号吗？此操作将：</p>
            <ul>
              <li>删除所有个人数据</li>
              <li>清除浏览记录和偏好设置</li>
              <li>无法恢复账号</li>
            </ul>
            <p class="text-danger"><strong>此操作不可撤销！</strong></p>
            <div class="form-check">
              <input v-model="deleteConfirmed" class="form-check-input" type="checkbox">
              <label class="form-check-label">
                我理解此操作不可恢复，确认删除我的账号
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showDeleteConfirm = false" class="btn btn-secondary">取消</button>
            <button @click="deleteAccount" 
                    :disabled="!deleteConfirmed"
                    class="btn btn-danger">
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  getUserInfo, 
  clearToken, 
  logout as authLogout,
  updatePreferences,
  getUserProfile,
  formatDate,
  formatDateTime
} from '../authUtils'

const router = useRouter()

const activeTab = ref('history')
const userInfo = ref({})
const viewHistory = ref([])
const favoriteGenres = ref([])
const favoritePlatforms = ref([])
const allGenres = ref([])
const allPlatforms = ref([])
const saving = ref(false)
const saveMessage = ref('')
const showDeleteConfirm = ref(false)
const deleteConfirmed = ref(false)

const userInitials = computed(() => {
  if (!userInfo.value.username) return '?'
  return userInfo.value.username.charAt(0).toUpperCase()
})

const loadUserData = async () => {
  try {
    const profile = await getUserProfile()
    userInfo.value = profile
    favoriteGenres.value = profile.preferences?.favoriteGenres || []
    favoritePlatforms.value = profile.preferences?.favoritePlatforms || []
    viewHistory.value = profile.preferences?.viewHistory || []
  } catch (error) {
    console.error('加载用户数据失败:', error)
  }
}

const loadFilterOptions = async () => {
  try {
    const response = await fetch('http://localhost:3000/filter-options')
    const data = await response.json()
    allGenres.value = data.genres || []
    allPlatforms.value = data.platforms || []
  } catch (error) {
    console.error('加载筛选选项失败:', error)
  }
}

const togglePreference = (type, value) => {
  if (type === 'genre') {
    const index = favoriteGenres.value.indexOf(value)
    if (index > -1) {
      favoriteGenres.value.splice(index, 1)
    } else {
      favoriteGenres.value.push(value)
    }
  } else if (type === 'platform') {
    const index = favoritePlatforms.value.indexOf(value)
    if (index > -1) {
      favoritePlatforms.value.splice(index, 1)
    } else {
      favoritePlatforms.value.push(value)
    }
  }
}

const savePreferences = async () => {
  saving.value = true
  saveMessage.value = ''

  try {
    await updatePreferences({
      favoriteGenres: favoriteGenres.value,
      favoritePlatforms: favoritePlatforms.value
    })
    saveMessage.value = '✅ 偏好设置已保存'
    setTimeout(() => saveMessage.value = '', 3000)
  } catch (error) {
    console.error('保存偏好失败:', error)
    saveMessage.value = '❌ 保存失败，请重试'
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.push('/')
}

const handleLogout = async () => {
  if (confirm('确定要退出登录吗？')) {
    try {
      await authLogout()
    } catch (error) {
      console.error('退出登录失败:', error)
    } finally {
      router.push('/')
    }
  }
}

const viewGameDetails = (game) => {
  // 这里可以跳转到游戏详情页面
  console.log('查看游戏详情:', game.Name)
}

const exportUserData = () => {
  const userData = {
    userInfo: userInfo.value,
    preferences: {
      favoriteGenres: favoriteGenres.value,
      favoritePlatforms: favoritePlatforms.value
    },
    viewHistory: viewHistory.value,
    exportDate: new Date().toISOString()
  }
  
  const dataStr = JSON.stringify(userData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `user-data-${userInfo.value.username}-${new Date().getTime()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const deleteAccount = () => {
  if (deleteConfirmed.value) {
    alert('账号删除功能开发中...')
    showDeleteConfirm.value = false
    deleteConfirmed.value = false
  }
}

onMounted(() => {
  loadUserData()
  loadFilterOptions()
})
</script>

<style scoped>
.user-profile-view {
  min-height: 100vh;
  background-color: #f8f9fa;
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
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
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

.preference-tags {
  display: flex;
  flex-wrap: wrap;
}

.preference-tag {
  cursor: pointer;
  transition: all 0.2s;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.preference-tag:hover {
  transform: scale(1.05);
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: #f8f9fa;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>