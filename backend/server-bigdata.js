/**
 * 大数据架构版服务器
 * 集成 HDFS + MapReduce + MongoDB
 */

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const csv = require('csv-parser')

// 导入大数据模块
const HDFSManager = require('./hdfs-manager')
const MapReduceAnalyzer = require('./mapreduce-analyzer')
const MongoDBCache = require('./mongodb-cache')

const app = express()
app.use(cors())
app.use(express.json())
// 导入市场洞察模块
const MarketInsights = require('./market-insights')
// 配置
const PORT = process.env.PORT || 3000
const USE_HDFS = process.env.USE_HDFS === 'true'
const USE_MONGODB = process.env.USE_MONGODB === 'true'
const USE_MAPREDUCE = process.env.USE_MAPREDUCE !== 'false' // 默认开启

// 初始化模块
const hdfsManager = USE_HDFS ? new HDFSManager() : null
const mongoCache = USE_MONGODB ? new MongoDBCache() : null

// 数据存储
let gamesData = []
let mapReduceAnalyzer = null
let isDataLoaded = false
let marketInsights = null
// ==================== 数据加载 ====================

async function loadData() {
  console.log('\n? 开始数据加载流程...\n')

  try {
    // 方式1：从 HDFS 加载
    if (USE_HDFS && hdfsManager) {
      console.log('? 数据源: HDFS')
      await hdfsManager.initialize()
      gamesData = await hdfsManager.readGameData()
    }
    // 方式2：从本地 CSV 加载
    else {
      console.log('? 数据源: 本地 CSV')
      gamesData = await loadFromLocalCSV()
    }

    if (gamesData.length === 0) {
      throw new Error('未加载到任何数据')
    }

    console.log(`? 数据加载完成: ${gamesData.length} 条记录\n`)
    
    console.log('=== server-bigdata.js 数据统计 ===')
    console.log('总记录数:', gamesData.length)
    console.log('游戏类型示例:', [...new Set(gamesData.map(g => g.Genre))].slice(0, 5))
    console.log('平台示例:', [...new Set(gamesData.map(g => g.Platform))].slice(0, 5))
    console.log('有年份的记录:', gamesData.filter(g => g.Year_of_Release).length)
    console.log('有评分的记录:', gamesData.filter(g => g.User_Score > 0).length)
    console.log('===============================\n')
    
    // 初始化 MapReduce 分析器
    if (USE_MAPREDUCE) {
      mapReduceAnalyzer = new MapReduceAnalyzer(gamesData)
      console.log('? MapReduce 分析器已初始化\n')
    }
       marketInsights = new MarketInsights(gamesData)
       console.log('? 市场洞察引擎已初始化\n')
    // 保存到 MongoDB
    if (USE_MONGODB && mongoCache) {
      await mongoCache.connect()
      await mongoCache.createIndexes()
      await mongoCache.saveGamesData(gamesData)
      console.log('? 数据已同步到 MongoDB\n')
      
      // 预计算并缓存所有结果
      await precomputeAndCache()
    }

    isDataLoaded = true
    return true

  } catch (error) {
    console.error('? 数据加载失败:', error)
    return false
  }
}

// 从本地 CSV 加载
function loadFromLocalCSV() {
  return new Promise((resolve, reject) => {
    const results = []
    
    fs.createReadStream('games.csv')
      .on('error', reject)
      .pipe(csv())
      .on('data', (row) => {
        if (!row.Name || !row.Platform) return
        
        results.push({
          Name: row.Name,
          Platform: row.Platform,
          Genre: row.Genre || 'Unknown',
          Publisher: row.Publisher,
          Year_of_Release: parseInt(row.Year_of_Release) || null,
          NA_Sales: parseFloat(row.NA_Sales) || 0,
          EU_Sales: parseFloat(row.EU_Sales) || 0,
          JP_Sales: parseFloat(row.JP_Sales) || 0,
          Other_Sales: parseFloat(row.Other_Sales) || 0,
          Global_Sales: parseFloat(row.Global_Sales) || 0,
          User_Score: parseFloat(row.User_Score) || null,
          Critic_Score: parseFloat(row.Critic_Score) || null
        })
      })
      .on('end', () => resolve(results))
  })
}

// 预计算所有分析结果并缓存
async function precomputeAndCache() {
  if (!mapReduceAnalyzer || !mongoCache) return

  console.log('? 预计算所有分析结果...\n')

  const analyses = {
    region: mapReduceAnalyzer.analyzeRegionSales(),
    genre: mapReduceAnalyzer.analyzeGenreSales(),
    yearly: mapReduceAnalyzer.analyzeYearlySales(),
    platform: mapReduceAnalyzer.analyzePlatformSales()
  }

  for (const [type, data] of Object.entries(analyses)) {
    await mongoCache.saveAnalysisResult(type, {}, data)
  }

  console.log('? 预计算完成\n')
}

// ==================== API 路由 ====================

// 健康检查
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    dataLoaded: isDataLoaded,
    recordCount: gamesData.length,
    services: {
      hdfs: USE_HDFS,
      mongodb: USE_MONGODB,
      mapreduce: USE_MAPREDUCE
    }
  }

  if (USE_MONGODB && mongoCache) {
    health.cacheStats = await mongoCache.getCacheStats()
  }

  res.json(health)
})

// 主数据接口
app.get('/chart-data', async (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({ 
        error: '数据正在加载中，请稍后重试' 
      })
    }

    const { 
      type = 'region',
      platform,
      genre,
      startYear,
      endYear,
      minSales,
      maxSales
    } = req.query

    const filters = { platform, genre, startYear, endYear, minSales, maxSales }
    const hasFilters = Object.values(filters).some(v => v !== undefined)

    // 1. 尝试从 MongoDB 缓存读取
    if (USE_MONGODB && mongoCache && !hasFilters) {
      const cached = await mongoCache.getAnalysisResult(type, filters)
      if (cached) {
        return res.json(cached)
      }
    }

    // 2. 使用 MapReduce 计算
    let result = []
    
    if (USE_MAPREDUCE && mapReduceAnalyzer) {
      if (hasFilters) {
        result = mapReduceAnalyzer.analyzeWithFilters({ type, ...filters })
      } else {
        switch (type) {
          case 'region':
            result = mapReduceAnalyzer.analyzeRegionSales()
            break
          case 'genre':
            result = mapReduceAnalyzer.analyzeGenreSales()
            break
          case 'yearly':
            result = mapReduceAnalyzer.analyzeYearlySales()
            break
          case 'platform':
            result = mapReduceAnalyzer.analyzePlatformSales()
            break
          case 'rating':
            result = mapReduceAnalyzer.analyzeRatingVsSales()
            break
        }
      }

      // 保存到缓存
      if (USE_MONGODB && mongoCache && result.length > 0) {
        await mongoCache.saveAnalysisResult(type, filters, result)
      }
    }
    // 3. 降级：使用普通聚合
    else {
      result = fallbackAnalysis(type, filters)
    }

    res.json(result)

  } catch (error) {
    console.error('? API 处理错误:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// 获取筛选选项
app.get('/filter-options', async (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({ error: '数据尚未加载完成' })
    }

    // 使用 MongoDB 聚合或内存计算
    let platforms, genres, years

    if (USE_MONGODB && mongoCache) {
      const collection = mongoCache.db.collection('games')
      platforms = await collection.distinct('Platform')
      genres = await collection.distinct('Genre')
      years = await collection.distinct('Year_of_Release', { Year_of_Release: { $ne: null } })
    } else {
      platforms = [...new Set(gamesData.map(g => g.Platform))].sort()
      genres = [...new Set(gamesData.map(g => g.Genre))].sort()
      years = [...new Set(gamesData.map(g => g.Year_of_Release).filter(y => y))].sort((a, b) => a - b)
    }

    res.json({
      platforms,
      genres,
      yearRange: {
        min: Math.min(...years),
        max: Math.max(...years)
      }
    })
  } catch (error) {
    console.error('? 获取筛选选项失败:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// 批量分析接口
app.get('/batch-analysis', async (req, res) => {
  try {
    if (!isDataLoaded || !mapReduceAnalyzer) {
      return res.status(503).json({ error: '服务未就绪' })
    }

    const results = mapReduceAnalyzer.runAllAnalyses()
    
    // 缓存所有结果
    if (USE_MONGODB && mongoCache) {
      for (const [type, data] of Object.entries(results)) {
        if (type !== 'rating' && type !== 'platformGenre') {
          await mongoCache.saveAnalysisResult(type, {}, data)
        }
      }
    }

    res.json(results)
  } catch (error) {
    console.error('? 批量分析失败:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// 缓存管理接口
app.post('/cache/clear', async (req, res) => {
  try {
    if (USE_MONGODB && mongoCache) {
      const count = await mongoCache.clearAllCache()
      res.json({ message: '缓存已清除', count })
    } else {
      res.json({ message: 'MongoDB 未启用' })
    }
  } catch (error) {
    res.status(500).json({ error: '清除缓存失败' })
  }
})

// 系统统计接口
app.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalGames: gamesData.length,
      dataSource: USE_HDFS ? 'HDFS' : 'Local CSV',
      useMapReduce: USE_MAPREDUCE,
      useMongoDB: USE_MONGODB
    }

    if (USE_MONGODB && mongoCache) {
      stats.cache = await mongoCache.getCacheStats()
    }

    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: '获取统计失败' })
  }
})
app.get('/market-opportunities', (req, res) => {
  try {
    if (!marketInsights) {
      return res.status(503).json({ error: '市场洞察引擎未初始化' })
    }

    const opportunities = marketInsights.findMarketOpportunities()
    const filteredOpportunities = opportunities.filter(opp => opp.gameCount >= 3)
    res.json({
      opportunities,
      count: opportunities.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('? 市场机会分析错误:', error)
    res.status(500).json({ error: '市场机会分析失败' })
  }
})

app.get('/competition-analysis', (req, res) => {
  try {
    const { genre } = req.query
    
    if (!genre) {
      return res.status(400).json({ error: '需要提供游戏类型' })
    }

    if (!marketInsights) {
      return res.status(503).json({ error: '市场洞察引擎未初始化' })
    }

    const analysis = marketInsights.analyzeCompetition(genre)
    res.json(analysis)
  } catch (error) {
    console.error('? 竞争分析错误:', error)
    res.status(500).json({ error: '竞争分析失败' })
  }
})

app.get('/pricing-analysis', (req, res) => {
  try {
    const { genre, platform } = req.query
    
    if (!genre || !platform) {
      return res.status(400).json({ error: '需要提供游戏类型和平台' })
    }

    if (!marketInsights) {
      return res.status(503).json({ error: '市场洞察引擎未初始化' })
    }

    const analysis = marketInsights.analyzePriceStrategy(genre, platform)
    res.json(analysis)
  } catch (error) {
    console.error('? 价格分析错误:', error)
    res.status(500).json({ error: '价格分析失败' })
  }
})
// 简单推荐接口 - 基于平台和类型筛选
app.get('/simple-recommendations', (req, res) => {
  try {
    const { platform, genre, minScore = 7, limit = 6 } = req.query
    
    if (!gamesData || gamesData.length === 0) {
      return res.status(503).json({ error: '数据未加载完成' })
    }

    let filtered = [...gamesData]

    // 应用筛选条件
    if (platform) {
      filtered = filtered.filter(g => g.Platform === platform)
    }
    if (genre) {
      filtered = filtered.filter(g => g.Genre === genre)
    }
    if (minScore) {
      filtered = filtered.filter(g => g.User_Score >= parseFloat(minScore))
    }

    // 按销量排序并返回
    const recommendations = filtered
      .sort((a, b) => b.Global_Sales - a.Global_Sales)
      .slice(0, parseInt(limit))
      .map(game => ({
        name: game.Name,
        platform: game.Platform,
        genre: game.Genre,
        sales: game.Global_Sales,
        score: game.User_Score,
        year: game.Year_of_Release,
        publisher: game.Publisher
      }))

    res.json({
      recommendations,
      count: recommendations.length,
      filters: { platform, genre, minScore, limit }
    })
  } catch (error) {
    console.error('? 简单推荐错误:', error)
    res.status(500).json({ error: '推荐失败' })
  }
})

// 降级分析函数 - 修复完整版本
function fallbackAnalysis(type, filters) {
  console.log(`? 使用降级分析: ${type}`)
  
  // 应用筛选条件
  let filtered = gamesData.filter(g => {
    if (filters.platform && g.Platform !== filters.platform) return false
    if (filters.genre && g.Genre !== filters.genre) return false
    if (filters.startYear && g.Year_of_Release < parseInt(filters.startYear)) return false
    if (filters.endYear && g.Year_of_Release > parseInt(filters.endYear)) return false
    if (filters.minSales && g.Global_Sales < parseFloat(filters.minSales)) return false
    if (filters.maxSales && g.Global_Sales > parseFloat(filters.maxSales)) return false
    return true
  })

  console.log(`   筛选后记录数: ${filtered.length}`)

  switch (type) {
    case 'region':
      return [
        { category: 'NA', value: filtered.reduce((s, g) => s + g.NA_Sales, 0) },
        { category: 'EU', value: filtered.reduce((s, g) => s + g.EU_Sales, 0) },
        { category: 'JP', value: filtered.reduce((s, g) => s + g.JP_Sales, 0) },
        { category: 'Other', value: filtered.reduce((s, g) => s + g.Other_Sales, 0) }
      ]
    
    case 'genre':
      const genreMap = {}
      filtered.forEach(g => {
        const genre = g.Genre || 'Unknown'
        genreMap[genre] = (genreMap[genre] || 0) + g.Global_Sales
      })
      return Object.entries(genreMap)
        .map(([category, value]) => ({ category, value }))
        .sort((a, b) => b.value - a.value)
    
    case 'yearly':
      const yearMap = {}
      filtered.forEach(g => {
        if (g.Year_of_Release && g.Year_of_Release <= 2016) {
          yearMap[g.Year_of_Release] = (yearMap[g.Year_of_Release] || 0) + g.Global_Sales
        }
      })
      return Object.entries(yearMap)
        .map(([category, value]) => ({ category: parseInt(category), value }))
        .sort((a, b) => a.category - b.category)
    
    case 'platform':
      const platformMap = {}
      filtered.forEach(g => {
        platformMap[g.Platform] = (platformMap[g.Platform] || 0) + g.Global_Sales
      })
      return Object.entries(platformMap)
        .map(([category, value]) => ({ category, value }))
        .sort((a, b) => b.value - a.value)
    
    case 'rating':
      return filtered
        .filter(game => game.User_Score > 0 && game.Global_Sales > 0)
        .map(game => ({
          score: game.User_Score,
          sales: game.Global_Sales
        }))
    
    default:
      console.log(`? 未知图表类型: ${type}`)
      return []
  }
}

// ==================== 启动服务器 ====================

async function startServer() {
  console.log('\n' + '='.repeat(60))
  console.log('? 游戏数据分析系统 - 大数据版本')
  console.log('='.repeat(60) + '\n')

  console.log('配置信息:')
  console.log(`  - HDFS: ${USE_HDFS ? '? 启用' : '? 禁用'}`)
  console.log(`  - MongoDB: ${USE_MONGODB ? '? 启用' : '? 禁用'}`)
  console.log(`  - MapReduce: ${USE_MAPREDUCE ? '? 启用' : '? 禁用'}\n`)

  // 加载数据
  const success = await loadData()
  
  if (!success) {
    console.error('? 服务器启动失败')
    process.exit(1)
  }

  // 启动 HTTP 服务
  app.listen(PORT, () => {
    console.log('='.repeat(60))
    console.log('? 服务器启动成功！')
    console.log(`? 地址: http://localhost:${PORT}`)
    console.log(`? API: http://localhost:${PORT}/chart-data?type=region`)
    console.log(`? 健康检查: http://localhost:${PORT}/health`)
    console.log(`? 批量分析: http://localhost:3000/batch-analysis`)
    console.log(`? 简单推荐: http://localhost:3000/simple-recommendations?platform=PS4&genre=Action`)
    console.log('='.repeat(60) + '\n')
  })
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n\n? 正在关闭服务器...')
  
  if (USE_MONGODB && mongoCache) {
    await mongoCache.close()
  }
  
  process.exit(0)
})

// 启动
startServer().catch(error => {
  console.error('? 启动失败:', error)
  process.exit(1)
})
