/**
 * MongoDB 缓存管理模块
 * 用于缓存 MapReduce 计算结果，提升查询性能
 */

const { MongoClient } = require('mongodb')

class MongoDBCache {
  constructor() {
    this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
    this.dbName = 'game_analytics'
    this.client = null
    this.db = null
  }

  /**
   * 连接 MongoDB
   */
  async connect() {
    try {
      console.log('? 连接 MongoDB...')
      this.client = new MongoClient(this.uri)
      await this.client.connect()
      this.db = this.client.db(this.dbName)
      console.log('? MongoDB 连接成功')
      return true
    } catch (error) {
      console.error('? MongoDB 连接失败:', error)
      return false
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.client) {
      await this.client.close()
      console.log('? MongoDB 连接已关闭')
    }
  }

  /**
   * 保存分析结果到缓存
   */
  async saveAnalysisResult(type, filters, data) {
    try {
      const collection = this.db.collection('analysis_cache')
      
      // 生成缓存键
      const cacheKey = this.generateCacheKey(type, filters)
      
      const document = {
        cacheKey,
        type,
        filters,
        data,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000) // 1小时后过期
      }

      await collection.updateOne(
        { cacheKey },
        { $set: document },
        { upsert: true }
      )

      console.log(`? 缓存已保存: ${type}`)
      return true
    } catch (error) {
      console.error('? 保存缓存失败:', error)
      return false
    }
  }

  /**
   * 从缓存读取分析结果
   */
  async getAnalysisResult(type, filters) {
    try {
      const collection = this.db.collection('analysis_cache')
      const cacheKey = this.generateCacheKey(type, filters)

      const cached = await collection.findOne({
        cacheKey,
        expiresAt: { $gt: new Date() } // 未过期
      })

      if (cached) {
        console.log(`? 缓存命中: ${type}`)
        return cached.data
      } else {
        console.log(`? 缓存未命中: ${type}`)
        return null
      }
    } catch (error) {
      console.error('? 读取缓存失败:', error)
      return null
    }
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(type, filters) {
    const filterStr = JSON.stringify(filters || {})
    return `${type}_${filterStr}`
  }

  /**
   * 清除过期缓存
   */
  async clearExpiredCache() {
    try {
      const collection = this.db.collection('analysis_cache')
      const result = await collection.deleteMany({
        expiresAt: { $lt: new Date() }
      })
      console.log(`??  清除了 ${result.deletedCount} 条过期缓存`)
      return result.deletedCount
    } catch (error) {
      console.error('? 清除缓存失败:', error)
      return 0
    }
  }

  /**
   * 清除所有缓存
   */
  async clearAllCache() {
    try {
      const collection = this.db.collection('analysis_cache')
      const result = await collection.deleteMany({})
      console.log(`??  清除了 ${result.deletedCount} 条缓存`)
      return result.deletedCount
    } catch (error) {
      console.error('? 清除所有缓存失败:', error)
      return 0
    }
  }

  /**
   * 保存原始游戏数据
   */
  async saveGamesData(gamesData) {
    try {
      const collection = this.db.collection('games')
      
      // 清空旧数据
      await collection.deleteMany({})
      
      // 批量插入
      const result = await collection.insertMany(gamesData)
      console.log(`? 保存了 ${result.insertedCount} 条游戏数据`)
      return result.insertedCount
    } catch (error) {
      console.error('? 保存游戏数据失败:', error)
      return 0
    }
  }

  /**
   * 从 MongoDB 读取游戏数据
   */
  async getGamesData(filters = {}) {
    try {
      const collection = this.db.collection('games')
      
      // 构建查询条件
      const query = {}
      
      if (filters.platform) {
        query.Platform = filters.platform
      }
      if (filters.genre) {
        query.Genre = filters.genre
      }
      if (filters.startYear || filters.endYear) {
        query.Year_of_Release = {}
        if (filters.startYear) {
          query.Year_of_Release.$gte = parseInt(filters.startYear)
        }
        if (filters.endYear) {
          query.Year_of_Release.$lte = parseInt(filters.endYear)
        }
      }
      if (filters.minSales || filters.maxSales) {
        query.Global_Sales = {}
        if (filters.minSales) {
          query.Global_Sales.$gte = parseFloat(filters.minSales)
        }
        if (filters.maxSales) {
          query.Global_Sales.$lte = parseFloat(filters.maxSales)
        }
      }

      const games = await collection.find(query).toArray()
      console.log(`? 从 MongoDB 读取 ${games.length} 条数据`)
      return games
    } catch (error) {
      console.error('? 读取游戏数据失败:', error)
      return []
    }
  }

  /**
   * 使用 MongoDB 聚合管道进行分析
   */
  async aggregateRegionSales() {
    try {
      const collection = this.db.collection('games')
      
      const results = await collection.aggregate([
        {
          $group: {
            _id: null,
            NA: { $sum: '$NA_Sales' },
            EU: { $sum: '$EU_Sales' },
            JP: { $sum: '$JP_Sales' },
            Other: { $sum: '$Other_Sales' }
          }
        },
        {
          $project: {
            _id: 0,
            regions: [
              { category: 'NA', value: '$NA' },
              { category: 'EU', value: '$EU' },
              { category: 'JP', value: '$JP' },
              { category: 'Other', value: '$Other' }
            ]
          }
        },
        { $unwind: '$regions' },
        { $replaceRoot: { newRoot: '$regions' } }
      ]).toArray()

      return results
    } catch (error) {
      console.error('? MongoDB 聚合失败:', error)
      return []
    }
  }

  /**
   * MongoDB 聚合：按类型统计
   */
  async aggregateGenreSales() {
    try {
      const collection = this.db.collection('games')
      
      const results = await collection.aggregate([
        {
          $group: {
            _id: '$Genre',
            value: { $sum: '$Global_Sales' }
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            value: 1
          }
        },
        { $sort: { value: -1 } }
      ]).toArray()

      return results
    } catch (error) {
      console.error('? MongoDB 聚合失败:', error)
      return []
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    try {
      const collection = this.db.collection('analysis_cache')
      
      const total = await collection.countDocuments()
      const expired = await collection.countDocuments({
        expiresAt: { $lt: new Date() }
      })
      const valid = total - expired

      return {
        total,
        valid,
        expired,
        hitRate: 0 // 需要额外跟踪
      }
    } catch (error) {
      console.error('? 获取缓存统计失败:', error)
      return null
    }
  }

  /**
   * 创建索引以优化查询
   */
  async createIndexes() {
    try {
      const gamesCollection = this.db.collection('games')
      const cacheCollection = this.db.collection('analysis_cache')

      // 游戏数据索引
      await gamesCollection.createIndex({ Platform: 1 })
      await gamesCollection.createIndex({ Genre: 1 })
      await gamesCollection.createIndex({ Year_of_Release: 1 })
      await gamesCollection.createIndex({ Global_Sales: -1 })

      // 缓存索引
      await cacheCollection.createIndex({ cacheKey: 1 }, { unique: true })
      await cacheCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

      console.log('? MongoDB 索引创建完成')
    } catch (error) {
      console.error('? 创建索引失败:', error)
    }
  }
}

module.exports = MongoDBCache