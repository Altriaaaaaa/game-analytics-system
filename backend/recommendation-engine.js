
/**
 * 游戏推荐引擎
 * 基于协同过滤和内容过滤实现个性化推荐
 */

class RecommendationEngine {
  constructor(gamesData) {
    this.gamesData = gamesData
    this.userPreferences = new Map() // 存储用户偏好
  }

  /**
   * 记录用户行为（浏览、收藏、搜索等）
   */
  recordUserAction(userId, action) {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        favoriteGenres: {},
        favoritePlatforms: {},
        priceRange: { min: 0, max: 100 },
        scoreThreshold: 0
      })
    }

    const prefs = this.userPreferences.get(userId)

    switch (action.type) {
      case 'favorite':
        this._updateGenrePreference(prefs, action.genre, 2) // 权重更高
        break
      case 'filter':
        if (action.genre) this._updateGenrePreference(prefs, action.genre)
        if (action.platform) this._updatePlatformPreference(prefs, action.platform)
        break
    }
  }

  _updateGenrePreference(prefs, genre, weight = 1) {
    prefs.favoriteGenres[genre] = (prefs.favoriteGenres[genre] || 0) + weight
  }

  _updatePlatformPreference(prefs, platform, weight = 1) {
    prefs.favoritePlatforms[platform] = (prefs.favoritePlatforms[platform] || 0) + weight
  }

  /**
   * 基于内容的推荐
   */
  recommendByContent(userId, limit = 10) {
    const prefs = this.userPreferences.get(userId)
    if (!prefs) {
      return this._getPopularGames(limit)
    }

    // 计算每个游戏的推荐分数
    const scoredGames = this.gamesData.map(game => {
      let score = 0

      // 类型匹配度
      const genreScore = prefs.favoriteGenres[game.Genre] || 0
      score += genreScore * 3

      // 平台匹配度
      const platformScore = prefs.favoritePlatforms[game.Platform] || 0
      score += platformScore * 2

      // 用户评分
      if (game.User_Score) {
        score += game.User_Score * 0.5
      }

      // 销量热度
      score += Math.log(game.Global_Sales + 1) * 2

      return { ...game, recommendScore: score }
    })

    // 排序并返回
    return scoredGames
      .sort((a, b) => b.recommendScore - a.recommendScore)
      .slice(0, limit)
      .map(game => ({
        name: game.Name,
        platform: game.Platform,
        genre: game.Genre,
        score: game.User_Score,
        sales: game.Global_Sales,
        recommendScore: game.recommendScore.toFixed(2),
        reason: this._getRecommendReason(game, prefs)
      }))
  }

  /**
   * 相似游戏推荐
   */
  findSimilarGames(gameName, limit = 5) {
    const targetGame = this.gamesData.find(g => g.Name === gameName)
    if (!targetGame) return []

    const similarities = this.gamesData
      .filter(g => g.Name !== gameName)
      .map(game => ({
        ...game,
        similarity: this._calculateSimilarity(targetGame, game)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return similarities.map(game => ({
      name: game.Name,
      platform: game.Platform,
      genre: game.Genre,
      similarity: (game.similarity * 100).toFixed(1) + '%',
      reason: this._getSimilarityReason(targetGame, game)
    }))
  }

  /**
   * 计算游戏相似度
   */
  _calculateSimilarity(game1, game2) {
    let similarity = 0

    // 类型相同
    if (game1.Genre === game2.Genre) similarity += 0.4

    // 平台相同
    if (game1.Platform === game2.Platform) similarity += 0.2

    // 发行商相同
    if (game1.Publisher === game2.Publisher) similarity += 0.1

    // 年份接近
    if (game1.Year_of_Release && game2.Year_of_Release) {
      const yearDiff = Math.abs(game1.Year_of_Release - game2.Year_of_Release)
      similarity += Math.max(0, 0.2 - yearDiff * 0.02)
    }

    // 评分接近
    if (game1.User_Score && game2.User_Score) {
      const scoreDiff = Math.abs(game1.User_Score - game2.User_Score)
      similarity += Math.max(0, 0.1 - scoreDiff * 0.01)
    }

    return similarity
  }

  /**
   * 热门游戏推荐（新用户）
   */
  _getPopularGames(limit = 10) {
    return this.gamesData
      .filter(g => g.Global_Sales > 1) // 销量超过100万
      .sort((a, b) => {
        // 综合销量和评分
        const scoreA = a.Global_Sales * 0.7 + (a.User_Score || 0) * 0.3
        const scoreB = b.Global_Sales * 0.7 + (b.User_Score || 0) * 0.3
        return scoreB - scoreA
      })
      .slice(0, limit)
      .map(game => ({
        name: game.Name,
        platform: game.Platform,
        genre: game.Genre,
        sales: game.Global_Sales,
        score: game.User_Score,
        reason: '热门推荐'
      }))
  }

  /**
   * 生成推荐理由
   */
  _getRecommendReason(game, prefs) {
    const reasons = []

    if (prefs.favoriteGenres[game.Genre]) {
      reasons.push(`你喜欢${game.Genre}类型`)
    }
    if (prefs.favoritePlatforms[game.Platform]) {
      reasons.push(`${game.Platform}平台`)
    }
    if (game.User_Score >= 8) {
      reasons.push('高评分游戏')
    }
    if (game.Global_Sales > 5) {
      reasons.push('热门游戏')
    }

    return reasons.length > 0 ? reasons.join(' · ') : '为你推荐'
  }

  /**
   * 生成相似性理由
   */
  _getSimilarityReason(game1, game2) {
    const reasons = []

    if (game1.Genre === game2.Genre) {
      reasons.push('相同类型')
    }
    if (game1.Platform === game2.Platform) {
      reasons.push('相同平台')
    }
    if (game1.Publisher === game2.Publisher) {
      reasons.push('同一发行商')
    }

    return reasons.join(' · ')
  }

  /**
   * 趋势预测：预测某类型游戏的未来销量
   */
  predictTrend(genre) {
    // 获取该类型历年销量数据
    const yearlyData = {}
    
    this.gamesData
      .filter(g => g.Genre === genre && g.Year_of_Release)
      .forEach(game => {
        const year = game.Year_of_Release
        yearlyData[year] = (yearlyData[year] || 0) + game.Global_Sales
      })

    const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b)
    const sales = years.map(y => yearlyData[y])

    // 简单线性回归预测
    const prediction = this._linearRegression(years, sales)

    return {
      genre,
      historicalData: years.map((y, i) => ({ year: y, sales: sales[i] })),
      trend: prediction.slope > 0 ? '上升' : '下降',
      predictedNextYear: {
        year: Math.max(...years) + 1,
        sales: prediction.slope * (Math.max(...years) + 1) + prediction.intercept
      },
      confidence: this._calculateConfidence(years, sales, prediction)
    }
  }

  /**
   * 简单线性回归
   */
  _linearRegression(x, y) {
    const n = x.length
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return { slope, intercept }
  }

  /**
   * 计算预测置信度
   */
  _calculateConfidence(x, y, prediction) {
    const predictions = x.map(xi => prediction.slope * xi + prediction.intercept)
    const errors = y.map((yi, i) => Math.abs(yi - predictions[i]))
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length
    const avgValue = y.reduce((a, b) => a + b, 0) / y.length

    const confidence = Math.max(0, 1 - avgError / avgValue)
    return (confidence * 100).toFixed(1) + '%'
  }

  /**
   * 用户画像分析
   */
  getUserProfile(userId) {
    const prefs = this.userPreferences.get(userId)
    if (!prefs) return null

    // 最喜欢的类型
    const topGenres = Object.entries(prefs.favoriteGenres)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre)

    // 最喜欢的平台
    const topPlatforms = Object.entries(prefs.favoritePlatforms)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([platform]) => platform)

    return {
      userId,
      favoriteGenres: topGenres,
      favoritePlatforms: topPlatforms,
      profile: this._determineUserType(prefs)
    }
  }

  /**
   * 判断用户类型
   */
  _determineUserType(prefs) {
    const topGenre = Object.entries(prefs.favoriteGenres)
      .sort(([, a], [, b]) => b - a)[0]

    if (!topGenre) return '新用户'

    const [genre, count] = topGenre

    if (count > 10) {
      return `${genre}游戏爱好者`
    } else if (count > 5) {
      return `${genre}游戏玩家`
    } else {
      return '休闲玩家'
    }
  }

  /**
   * 冷启动推荐：基于流行度的推荐
   */
  coldStartRecommendation(params = {}) {
    const { platform, genre, minScore = 7 } = params

    let filtered = this.gamesData

    if (platform) {
      filtered = filtered.filter(g => g.Platform === platform)
    }
    if (genre) {
      filtered = filtered.filter(g => g.Genre === genre)
    }
    if (minScore) {
      filtered = filtered.filter(g => g.User_Score >= minScore)
    }

    return filtered
      .sort((a, b) => b.Global_Sales - a.Global_Sales)
      .slice(0, 10)
      .map(game => ({
        name: game.Name,
        platform: game.Platform,
        genre: game.Genre,
        sales: game.Global_Sales,
        score: game.User_Score
      }))
  }
}

module.exports = RecommendationEngine
