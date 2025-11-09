const express = require('express')
const cors = require('cors')
const fs = require('fs')
const csv = require('csv-parser')

const app = express()
app.use(cors())
app.use(express.json())

// ========== 配置 ==========
const PORT = process.env.PORT || 3000
const CSV_FILE = process.env.CSV_FILE || 'games.csv'

// ========== 数据存储 ==========
let gamesData = []
let cachedAggregations = {}
let isDataLoaded = false

// ========== 数据加载 ==========
function loadCSVData() {
  console.log('? 开始加载 CSV 数据...')
  
  fs.createReadStream(CSV_FILE)
    .on('error', (error) => {
      console.error('? CSV 文件读取失败:', error.message)
      console.error('请确保 games.csv 文件存在于项目根目录')
      process.exit(1)
    })
    .pipe(csv())
    .on('data', (row) => {
      // 数据验证
      if (!row.Name || !row.Platform) {
        return // 跳过无效行
      }
      
      // 类型转换和清洗
      const cleanedRow = {
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
      }
      
      gamesData.push(cleanedRow)
    })
    .on('end', () => {
      if (gamesData.length === 0) {
        console.error('? 未加载到任何有效数据')
        process.exit(1)
      }
      
      console.log(`? CSV 数据加载完成，共 ${gamesData.length} 条记录`)
      precomputeAggregations()
      isDataLoaded = true
    })
}

// ========== 预计算聚合数据 ==========
function precomputeAggregations() {
  console.log('? 开始预计算聚合数据...')
  
  // 地区聚合
  cachedAggregations.region = [
    { category: 'NA', value: gamesData.reduce((sum, g) => sum + g.NA_Sales, 0) },
    { category: 'EU', value: gamesData.reduce((sum, g) => sum + g.EU_Sales, 0) },
    { category: 'JP', value: gamesData.reduce((sum, g) => sum + g.JP_Sales, 0) },
    { category: 'Other', value: gamesData.reduce((sum, g) => sum + g.Other_Sales, 0) }
  ]

  // 类型聚合
  const genreMap = {}
  gamesData.forEach(g => {
    genreMap[g.Genre] = (genreMap[g.Genre] || 0) + g.Global_Sales
  })
  cachedAggregations.genre = Object.entries(genreMap)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)

  // 年度聚合
  const yearMap = {}
  gamesData.forEach(g => {
    if (g.Year_of_Release && g.Year_of_Release <= 2016) {
      yearMap[g.Year_of_Release] = (yearMap[g.Year_of_Release] || 0) + g.Global_Sales
    }
  })
  cachedAggregations.yearly = Object.entries(yearMap)
    .map(([category, value]) => ({ category: parseInt(category), value }))
    .sort((a, b) => a.category - b.category)

  // 平台聚合
  const platformMap = {}
  gamesData.forEach(g => {
    platformMap[g.Platform] = (platformMap[g.Platform] || 0) + g.Global_Sales
  })
  cachedAggregations.platform = Object.entries(platformMap)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)

  console.log('? 聚合数据预计算完成')
}

// ========== 数据筛选工具 ==========
function applyFilters(data, filters) {
  return data.filter(game => {
    // 平台筛选
    if (filters.platform && game.Platform !== filters.platform) {
      return false
    }
    
    // 类型筛选
    if (filters.genre && game.Genre !== filters.genre) {
      return false
    }
    
    // 年份范围
    if (filters.startYear && game.Year_of_Release < parseInt(filters.startYear)) {
      return false
    }
    if (filters.endYear && game.Year_of_Release > parseInt(filters.endYear)) {
      return false
    }
    
    // 销量范围
    if (filters.minSales && game.Global_Sales < parseFloat(filters.minSales)) {
      return false
    }
    if (filters.maxSales && game.Global_Sales > parseFloat(filters.maxSales)) {
      return false
    }
    
    return true
  })
}

// ========== 聚合计算函数 ==========
function aggregateRegion(data) {
  return [
    { category: 'NA', value: data.reduce((sum, g) => sum + g.NA_Sales, 0) },
    { category: 'EU', value: data.reduce((sum, g) => sum + g.EU_Sales, 0) },
    { category: 'JP', value: data.reduce((sum, g) => sum + g.JP_Sales, 0) },
    { category: 'Other', value: data.reduce((sum, g) => sum + g.Other_Sales, 0) }
  ]
}

function aggregateGenre(data) {
  const map = {}
  data.forEach(g => {
    map[g.Genre] = (map[g.Genre] || 0) + g.Global_Sales
  })
  return Object.entries(map)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
}

function aggregateYearly(data) {
  const map = {}
  data.forEach(g => {
    if (g.Year_of_Release && g.Year_of_Release <= 2016) {
      map[g.Year_of_Release] = (map[g.Year_of_Release] || 0) + g.Global_Sales
    }
  })
  return Object.entries(map)
    .map(([category, value]) => ({ category: parseInt(category), value }))
    .sort((a, b) => a.category - b.category)
}

function aggregatePlatform(data) {
  const map = {}
  data.forEach(g => {
    map[g.Platform] = (map[g.Platform] || 0) + g.Global_Sales
  })
  return Object.entries(map)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
}

function aggregateRating(data) {
  return data
    .filter(g => g.User_Score > 0 && g.Global_Sales > 0)
    .map(g => ({ 
      score: g.User_Score, 
      sales: g.Global_Sales 
    }))
}

// ========== API 路由 ==========

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    dataLoaded: isDataLoaded,
    recordCount: gamesData.length
  })
})

// 主数据接口
app.get('/chart-data', (req, res) => {
  try {
    // 检查数据是否加载完成
    if (!isDataLoaded) {
      return res.status(503).json({ 
        error: '数据正在加载中，请稍后重试',
        retryAfter: 5
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

    // 检查是否有筛选条件
    const hasFilters = platform || genre || startYear || endYear || minSales || maxSales
    
    // 无筛选时使用缓存
    if (!hasFilters && type !== 'rating' && cachedAggregations[type]) {
      return res.json(cachedAggregations[type])
    }

    // 应用筛选
    const filteredData = hasFilters 
      ? applyFilters(gamesData, { platform, genre, startYear, endYear, minSales, maxSales })
      : gamesData

    // 根据类型聚合数据
    let result = []
    switch(type) {
      case 'region':
        result = aggregateRegion(filteredData)
        break
      case 'genre':
        result = aggregateGenre(filteredData)
        break
      case 'yearly':
        result = aggregateYearly(filteredData)
        break
      case 'platform':
        result = aggregatePlatform(filteredData)
        break
      case 'rating':
        result = aggregateRating(filteredData)
        break
      default:
        return res.status(400).json({ 
          error: '不支持的图表类型',
          supportedTypes: ['region', 'genre', 'yearly', 'platform', 'rating']
        })
    }

    res.json(result)

  } catch (error) {
    console.error('? API 处理错误:', error)
    res.status(500).json({ 
      error: '服务器内部错误',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})
// 记录用户浏览游戏
app.post('/record-game-view', express.json(), (req, res) => {
  try {
    const { userId, gameName } = req.body
    
    if (!userId || !gameName) {
      return res.status(400).json({ error: '需要提供userId和gameName' })
    }

    if (!recommendationEngine) {
      return res.status(503).json({ error: '推荐引擎未初始化' })
    }

    // 查找游戏数据
    const gameData = gamesData.find(g => g.Name === gameName)
    
    recommendationEngine.recordGameView(userId, gameName, gameData)
    
    res.json({
      success: true,
      message: '浏览记录成功',
      userId,
      gameName
    })
  } catch (error) {
    console.error('? 记录浏览行为错误:', error)
    res.status(500).json({ error: '记录浏览行为失败' })
  }
})

// 获取用户浏览历史
app.get('/user-view-history', (req, res) => {
  try {
    const { userId } = req.query
    
    if (!userId) {
      return res.status(400).json({ error: '需要提供userId' })
    }

    if (!recommendationEngine) {
      return res.status(503).json({ error: '推荐引擎未初始化' })
    }

    const viewHistory = recommendationEngine.getUserViewHistory(userId)
    
    res.json({
      userId,
      viewHistory,
      count: viewHistory.length
    })
  } catch (error) {
    console.error('? 获取浏览历史错误:', error)
    res.status(500).json({ error: '获取浏览历史失败' })
  }
})
// 获取筛选选项
app.get('/filter-options', (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({ error: '数据尚未加载完成' })
    }

    const platforms = [...new Set(gamesData.map(g => g.Platform))].sort()
    const genres = [...new Set(gamesData.map(g => g.Genre))].sort()
    const years = [...new Set(gamesData.map(g => g.Year_of_Release).filter(y => y))]
      .sort((a, b) => a - b)

    res.json({
      platforms,
      genres,
      yearRange: {
        min: Math.min(...years),
        max: Math.max(...years)
      },
      salesRange: {
        min: Math.min(...gamesData.map(g => g.Global_Sales)),
        max: Math.max(...gamesData.map(g => g.Global_Sales))
      }
    })
  } catch (error) {
    console.error('? 获取筛选选项失败:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// ========== 启动服务器 ==========
loadCSVData()

app.listen(PORT, () => {
  console.log(`\n? 服务器启动成功！`)
  console.log(`? 地址: http://localhost:${PORT}`)
  console.log(`? API: http://localhost:${PORT}/chart-data?type=region`)
  console.log(`? 健康检查: http://localhost:${PORT}/health\n`)
})