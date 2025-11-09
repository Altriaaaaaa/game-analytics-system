/**
 * MapReduce 数据分析模块
 * 使用 MapReduce 模式处理游戏销售数据
 */

class MapReduceAnalyzer {
  constructor(gamesData) {
    this.gamesData = gamesData
  }

  /**
   * Map 阶段：将数据转换为 key-value 对
   */
  map(mapFunction) {
    console.log('??  执行 Map 阶段...')
    const mappedData = []
    
    for (const game of this.gamesData) {
      const results = mapFunction(game)
      if (Array.isArray(results)) {
        mappedData.push(...results)
      } else if (results) {
        mappedData.push(results)
      }
    }
    
    console.log(`   Map 输出: ${mappedData.length} 个键值对`)
    return mappedData
  }

  /**
   * Shuffle 阶段：按 key 分组
   */
  shuffle(mappedData) {
    console.log('? 执行 Shuffle 阶段...')
    const shuffled = new Map()
    
    for (const { key, value } of mappedData) {
      if (!shuffled.has(key)) {
        shuffled.set(key, [])
      }
      shuffled.get(key).push(value)
    }
    
    console.log(`   Shuffle 输出: ${shuffled.size} 个分组`)
    return shuffled
  }

  /**
   * Reduce 阶段：聚合数据
   */
  reduce(shuffledData, reduceFunction) {
    console.log('? 执行 Reduce 阶段...')
    const results = []
    
    for (const [key, values] of shuffledData.entries()) {
      const result = reduceFunction(key, values)
      if (result) {
        results.push(result)
      }
    }
    
    console.log(`   Reduce 输出: ${results.length} 条结果`)
    return results
  }

  /**
   * 完整的 MapReduce 流程
   */
  execute(mapFunction, reduceFunction) {
    const startTime = Date.now()
    console.log('\n? 开始 MapReduce 任务...')
    
    // 1. Map
    const mapped = this.map(mapFunction)
    
    // 2. Shuffle
    const shuffled = this.shuffle(mapped)
    
    // 3. Reduce
    const results = this.reduce(shuffled, reduceFunction)
    
    const duration = Date.now() - startTime
    console.log(`? MapReduce 完成，耗时: ${duration}ms\n`)
    
    return results
  }

  // ==================== 预定义分析任务 ====================

  /**
   * 任务1：按地区统计销量
   */
  analyzeRegionSales() {
    console.log('? 任务：按地区统计销量')
    
    const mapFunc = (game) => [
      { key: 'NA', value: game.NA_Sales },
      { key: 'EU', value: game.EU_Sales },
      { key: 'JP', value: game.JP_Sales },
      { key: 'Other', value: game.Other_Sales }
    ]
    
    const reduceFunc = (region, sales) => ({
      category: region,
      value: sales.reduce((sum, s) => sum + s, 0)
    })
    
    return this.execute(mapFunc, reduceFunc)
  }

  /**
   * 任务2：按游戏类型统计销量
   */
  analyzeGenreSales() {
    console.log('? 任务：按游戏类型统计销量')
    
    const mapFunc = (game) => ({
      key: game.Genre,
      value: game.Global_Sales
    })
    
    const reduceFunc = (genre, sales) => ({
      category: genre,
      value: sales.reduce((sum, s) => sum + s, 0)
    })
    
    return this.execute(mapFunc, reduceFunc)
  }

  /**
   * 任务3：按年份统计销量
   */
  analyzeYearlySales() {
    console.log('? 任务：按年份统计销量')
    
    const mapFunc = (game) => {
      if (game.Year_of_Release && game.Year_of_Release <= 2016) {
        return {
          key: game.Year_of_Release,
          value: game.Global_Sales
        }
      }
      return null
    }
    
    const reduceFunc = (year, sales) => ({
      category: year,
      value: sales.reduce((sum, s) => sum + s, 0)
    })
    
    const results = this.execute(mapFunc, reduceFunc)
    return results.sort((a, b) => a.category - b.category)
  }

  /**
   * 任务4：按平台统计销量
   */
  analyzePlatformSales() {
    console.log('??  任务：按平台统计销量')
    
    const mapFunc = (game) => ({
      key: game.Platform,
      value: game.Global_Sales
    })
    
    const reduceFunc = (platform, sales) => ({
      category: platform,
      value: sales.reduce((sum, s) => sum + s, 0)
    })
    
    const results = this.execute(mapFunc, reduceFunc)
    return results.sort((a, b) => b.value - a.value)
  }

  /**
   * 任务5：按发行商统计销量（Top 10）
   */
  analyzePublisherSales() {
    console.log('? 任务：按发行商统计销量')
    
    const mapFunc = (game) => {
      if (game.Publisher) {
        return {
          key: game.Publisher,
          value: game.Global_Sales
        }
      }
      return null
    }
    
    const reduceFunc = (publisher, sales) => ({
      category: publisher,
      value: sales.reduce((sum, s) => sum + s, 0)
    })
    
    const results = this.execute(mapFunc, reduceFunc)
    return results.sort((a, b) => b.value - a.value).slice(0, 10)
  }

  /**
   * 任务6：评分与销量关系分析
   */
  analyzeRatingVsSales() {
    console.log('? 任务：评分与销量关系分析')
    
    // 不使用 MapReduce，直接过滤
    return this.gamesData
      .filter(game => game.User_Score > 0 && game.Global_Sales > 0)
      .map(game => ({
        score: game.User_Score,
        sales: game.Global_Sales
      }))
  }

  /**
   * 任务7：多维度聚合（平台+类型）
   */
  analyzePlatformGenre() {
    console.log('? 任务：平台与类型交叉分析')
    
    const mapFunc = (game) => ({
      key: `${game.Platform}_${game.Genre}`,
      value: {
        platform: game.Platform,
        genre: game.Genre,
        sales: game.Global_Sales
      }
    })
    
    const reduceFunc = (key, values) => {
      const first = values[0]
      return {
        platform: first.platform,
        genre: first.genre,
        totalSales: values.reduce((sum, v) => sum + v.sales, 0),
        count: values.length
      }
    }
    
    return this.execute(mapFunc, reduceFunc)
  }

  /**
   * 任务8：筛选 + 聚合
   */
  analyzeWithFilters(filters) {
    console.log('? 任务：带筛选的数据分析')
    
    // 先过滤数据
    let filteredData = this.gamesData.filter(game => {
      if (filters.platform && game.Platform !== filters.platform) return false
      if (filters.genre && game.Genre !== filters.genre) return false
      if (filters.startYear && game.Year_of_Release < filters.startYear) return false
      if (filters.endYear && game.Year_of_Release > filters.endYear) return false
      if (filters.minSales && game.Global_Sales < filters.minSales) return false
      if (filters.maxSales && game.Global_Sales > filters.maxSales) return false
      return true
    })

    console.log(`   筛选后: ${filteredData.length} 条记录`)

    // 创建临时分析器
    const tempAnalyzer = new MapReduceAnalyzer(filteredData)
    
    // 根据 filters.type 决定分析类型
    switch (filters.type) {
      case 'region':
        return tempAnalyzer.analyzeRegionSales()
      case 'genre':
        return tempAnalyzer.analyzeGenreSales()
      case 'yearly':
        return tempAnalyzer.analyzeYearlySales()
      case 'platform':
        return tempAnalyzer.analyzePlatformSales()
      case 'rating':
        return tempAnalyzer.analyzeRatingVsSales()
      default:
        return []
    }
  }

  /**
   * 运行所有分析任务（批处理模式）
   */
  runAllAnalyses() {
    console.log('\n? 运行所有 MapReduce 分析任务...\n')
    
    const results = {
      region: this.analyzeRegionSales(),
      genre: this.analyzeGenreSales(),
      yearly: this.analyzeYearlySales(),
      platform: this.analyzePlatformSales(),
      publisher: this.analyzePublisherSales(),
      rating: this.analyzeRatingVsSales(),
      platformGenre: this.analyzePlatformGenre()
    }
    
    console.log('? 所有分析任务完成！')
    return results
  }
}

module.exports = MapReduceAnalyzer