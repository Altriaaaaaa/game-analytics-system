<template>
  <div class="market-insights-view">
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">🔍 市场洞察与预测分析</h5>
        <small class="text-muted">为游戏发行商、投资者提供决策支持</small>
      </div>
      <div class="card-body">
        
        <!-- 市场机会分析 -->
        <div v-if="selectedInsight === 'opportunities'" class="insight-section">
          <h6>🚀 市场机会分析</h6>
          <p class="text-muted mb-3">找出最有潜力的游戏类型和平台组合</p>
          
          <div class="row mb-3">
            <div class="col-md-6">
              <button @click="analyzeOpportunities" class="btn btn-primary" :disabled="loading">
                {{ loading ? '分析中...' : '开始分析' }}
              </button>
            </div>
          </div>

          <div v-if="opportunitiesData.length > 0" class="results-section">
            <h6>🎯 十大市场机会</h6>
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>组合</th>
                    <th>平均销量</th>
                    <th>游戏数量</th>
                    <th>平均评分</th>
                    <th>潜力分数</th>
                    <th>建议</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(opp, index) in opportunitiesData" :key="index">
                    <td><strong>{{ opp.combination }}</strong></td>
                    <td>{{ opp.avgSales }}</td>
                    <td>{{ opp.gameCount }}</td>
                    <td>{{ opp.avgScore }}</td>
                    <td>{{ opp.potential }}</td>
                    <td>
                      <span :class="getRecommendationClass(opp.recommendation)">
                        {{ opp.recommendation }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 竞争分析 -->
        <div v-else-if="selectedInsight === 'competition'" class="insight-section">
          <h6>🎯 市场竞争分析</h6>
          <p class="text-muted mb-3">分析特定游戏类型的市场饱和度</p>
          
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">选择游戏类型</label>
              <select v-model="competitionGenre" class="form-select">
                <option value="">请选择类型</option>
                <option v-for="genre in genres" :key="genre" :value="genre">
                  {{ genre }}
                </option>
              </select>
            </div>
            <div class="col-md-6 d-flex align-items-end">
              <button @click="analyzeCompetition" class="btn btn-primary" 
                      :disabled="!competitionGenre || loading">
                {{ loading ? '分析中...' : '分析竞争' }}
              </button>
            </div>
          </div>

          <div v-if="competitionData" class="results-section">
            <div class="row">
              <div class="col-md-6">
                <div class="card">
                  <div class="card-body">
                    <h6>市场概况</h6>
                    <p>总游戏数: <strong>{{ competitionData.totalGames }}</strong></p>
                    <p>总销量: <strong>{{ competitionData.totalSales }}</strong></p>
                    <p>平均销量: <strong>{{ competitionData.avgSalesPerGame }}</strong></p>
                    <p>市场集中度: <strong>{{ competitionData.marketConcentration }}</strong></p>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card">
                  <div class="card-body">
                    <h6>Top 发行商</h6>
                    <div v-for="pub in competitionData.topPublishers" :key="pub.publisher" class="mb-2">
                      <div class="d-flex justify-content-between">
                        <span>{{ pub.publisher }}</span>
                        <span class="text-muted">{{ pub.marketShare }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 价格策略分析 -->
        <div v-else-if="selectedInsight === 'pricing'" class="insight-section">
          <h6>💰 价格策略分析</h6>
          <p class="text-muted mb-3">找出最优价格区间</p>
          
          <div class="row mb-3">
            <div class="col-md-4">
              <label class="form-label">游戏类型</label>
              <select v-model="pricingGenre" class="form-select">
                <option value="">请选择类型</option>
                <option v-for="genre in genres" :key="genre" :value="genre">
                  {{ genre }}
                </option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">平台</label>
              <select v-model="pricingPlatform" class="form-select">
                <option value="">请选择平台</option>
                <option v-for="platform in platforms" :key="platform" :value="platform">
                  {{ platform }}
                </option>
              </select>
            </div>
            <div class="col-md-4 d-flex align-items-end">
              <button @click="analyzePricing" class="btn btn-primary" 
                      :disabled="!pricingGenre || !pricingPlatform || loading">
                {{ loading ? '分析中...' : '分析价格' }}
              </button>
            </div>
          </div>

          <div v-if="pricingData" class="results-section">
            <div class="alert alert-info">
              <h6>💡 价格策略建议</h6>
              <p class="mb-0">{{ pricingData.recommendation }}</p>
            </div>
            
            <h6>📊 销量分布分析</h6>
            <div class="row">
              <div class="col-md-4" v-for="(dist, key) in pricingData.salesDistribution" :key="key">
                <div class="card text-center">
                  <div class="card-body">
                    <h6>{{ dist.characteristics }}</h6>
                    <p class="mb-1">游戏数量: {{ dist.count }}</p>
                    <p class="mb-0">平均评分: {{ dist.avgScore }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 默认提示 -->
        <div v-else class="insight-section">
          <div class="alert alert-info text-center py-5">
            <h6>🎯 请选择上方的分析类型</h6>
            <p class="mb-0">从左侧菜单中选择要进行的市场洞察分析</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  selectedInsight: {
    type: String,
    default: 'opportunities'
  }
})

const loading = ref(false)
const opportunitiesData = ref([])
const competitionData = ref(null)
const pricingData = ref(null)
const genres = ref([])
const platforms = ref([])
const competitionGenre = ref('')
const pricingGenre = ref('')
const pricingPlatform = ref('')

const getRecommendationClass = (recommendation) => {
  if (recommendation.includes('极高潜力')) return 'text-success fw-bold'
  if (recommendation.includes('高潜力')) return 'text-primary fw-bold'
  if (recommendation.includes('中等潜力')) return 'text-warning'
  return 'text-muted'
}

const analyzeOpportunities = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:3000/market-opportunities')
    opportunitiesData.value = response.data.opportunities
  } catch (error) {
    console.error('分析市场机会失败:', error)
    alert('分析失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const analyzeCompetition = async () => {
  if (!competitionGenre.value) return
  
  loading.value = true
  try {
    const response = await axios.get('http://localhost:3000/competition-analysis', {
      params: { genre: competitionGenre.value }
    })
    competitionData.value = response.data
  } catch (error) {
    console.error('分析竞争失败:', error)
    alert('分析失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const analyzePricing = async () => {
  if (!pricingGenre.value || !pricingPlatform.value) return
  
  loading.value = true
  try {
    const response = await axios.get('http://localhost:3000/pricing-analysis', {
      params: { 
        genre: pricingGenre.value,
        platform: pricingPlatform.value
      }
    })
    pricingData.value = response.data
  } catch (error) {
    console.error('分析价格策略失败:', error)
    alert('分析失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/filter-options')
    genres.value = response.data.genres || []
    platforms.value = response.data.platforms || []
  } catch (error) {
    console.error('加载筛选选项失败:', error)
  }
})
</script>

<style scoped>
.market-insights-view {
  min-height: 600px;
}

.insight-section {
  min-height: 400px;
}

.results-section {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  border: 1px solid rgba(0, 0, 0, 0.125);
}

.table th {
  background-color: #f8f9fa;
  font-weight: 600;
}
</style>