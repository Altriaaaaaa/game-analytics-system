<template>
  <div class="recommendation-view">
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">🤖 智能游戏推荐</h5>
      </div>
      <div class="card-body">
        
        <!-- 偏好设置 -->
        <div class="preference-panel mb-4 p-3 bg-light rounded">
          <h6>🎯 设置推荐偏好</h6>
          <div class="row">
            <div class="col-md-6">
              <label class="form-label">选择平台</label>
              <select v-model="preferences.platform" class="form-select" @change="loadRecommendations">
                <option value="">所有平台</option>
                <option v-for="platform in platforms" :key="platform" :value="platform">
                  {{ platform }}
                </option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">选择类型</label>
              <select v-model="preferences.genre" class="form-select" @change="loadRecommendations">
                <option value="">所有类型</option>
                <option v-for="genre in genres" :key="genre" :value="genre">
                  {{ genre }}
                </option>
              </select>
            </div>
          </div>
          <div class="row mt-3">
            <div class="col-md-6">
              <label class="form-label">最低评分</label>
              <input v-model.number="preferences.minScore" type="number" class="form-control" 
                     min="0" max="10" step="0.1" placeholder="7.0" @input="loadRecommendations">
            </div>
            <div class="col-md-6">
              <label class="form-label">显示数量</label>
              <select v-model="preferences.limit" class="form-select" @change="loadRecommendations">
                <option value="6">6款游戏</option>
                <option value="12">12款游戏</option>
                <option value="18">18款游戏</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 推荐结果 -->
        <div v-if="recommendations.length > 0" class="recommendation-results">
          <h6>🎮 推荐游戏 ({{ recommendations.length }} 款)</h6>
          <div class="row">
            <div v-for="(game, index) in recommendations" :key="index" class="col-md-6 col-lg-4 mb-3">
              <div class="card h-100 game-card">
                <div class="card-body">
                  <h6 class="card-title">{{ game.name }}</h6>
                  <div class="card-text">
                    <div class="game-badges mb-2">
                      <span class="badge bg-secondary me-1">{{ game.platform }}</span>
                      <span class="badge bg-info me-1">{{ game.genre }}</span>
                      <span v-if="game.score" class="badge bg-warning">⭐ {{ game.score }}</span>
                    </div>
                    <div class="game-stats">
                      <small class="text-muted">销量: {{ game.sales?.toFixed(2) }}M</small>
                      <span v-if="game.year" class="text-muted ms-2">| {{ game.year }}年</span>
                    </div>
                    <div v-if="game.publisher" class="game-publisher text-muted small">
                      发行: {{ game.publisher }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center text-muted py-5">
          <p>🎯 请选择平台和类型来获取游戏推荐</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const recommendations = ref([])
const platforms = ref([])
const genres = ref([])

const preferences = ref({
  platform: '',
  genre: '',
  minScore: 7.0,
  limit: 6
})

// 加载推荐
const loadRecommendations = async () => {
  try {
    const response = await axios.get('http://localhost:3000/simple-recommendations', {
      params: preferences.value
    })
    recommendations.value = response.data.recommendations
  } catch (error) {
    console.error('获取推荐失败:', error)
  }
}

// 初始化时加载平台和类型列表
onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/filter-options')
    platforms.value = response.data.platforms || []
    genres.value = response.data.genres || []
    
    // 默认加载推荐
    loadRecommendations()
  } catch (error) {
    console.error('加载筛选选项失败:', error)
  }
})
</script>

<style scoped>
.recommendation-view {
  min-height: 600px;
}

.preference-panel {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 0.5rem;
}

.game-card {
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.game-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  border-color: #0d6efd;
}

.game-badges {
  min-height: 2rem;
}

.card-title {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.game-stats {
  margin-top: 0.5rem;
}

.game-publisher {
  margin-top: 0.25rem;
  font-style: italic;
}
</style>
