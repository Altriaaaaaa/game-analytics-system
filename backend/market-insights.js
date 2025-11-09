class MarketInsights {
  constructor(gamesData) {
    this.gamesData = gamesData
  }

  findMarketOpportunities() {
    console.log('🔍 分析市场机会...\n')

    const combinations = new Map()

    this.gamesData.forEach(game => {
      const key = `${game.Genre}_${game.Platform}`
      if (!combinations.has(key)) {
        combinations.set(key, {
          genre: game.Genre,
          platform: game.Platform,
          totalSales: 0,
          count: 0,
          totalScore: 0,
          scoreCount: 0
        })
      }

      const combo = combinations.get(key)
      combo.totalSales += game.Global_Sales
      combo.count += 1
      if (game.User_Score) {
        combo.totalScore += game.User_Score
        combo.scoreCount += 1
      }
    })

    // 过滤掉游戏数量少于3的组合
    const filteredCombinations = Array.from(combinations.values())
      .filter(combo => combo.count >= 3)

    const opportunities = filteredCombinations
      .map(combo => {
        const avgSales = combo.totalSales / combo.count
        const avgScore = combo.scoreCount > 0 ? combo.totalScore / combo.scoreCount : 5
        
        return {
          ...combo,
          avgSales: avgSales,
          avgScore: avgScore,
          potential: this._calculatePotential(avgSales, avgScore, combo.count)
        }
      })
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 10)

    return opportunities.map(opp => ({
      combination: `${opp.genre} on ${opp.platform}`,
      avgSales: opp.avgSales.toFixed(2) + 'M',
      gameCount: opp.count,
      avgScore: opp.avgScore.toFixed(1),
      potential: opp.potential.toFixed(2),
      recommendation: this._getOpportunityRecommendation(opp.potential)
    }))
  }

  _calculatePotential(avgSales, avgScore, count) {
    // 简化公式，避免复杂的数学运算
    // 潜力 = 平均销量 * (1 + 评分加成) * 市场成熟度因子
    
    const salesFactor = avgSales
    const scoreBonus = (avgScore - 5) * 0.2  // 评分高于5分有加成，低于5分有惩罚
    const maturityFactor = Math.min(Math.log(count + 1), 3)  // 限制成熟度因子的最大值
    
    const potential = salesFactor * (1 + scoreBonus) * maturityFactor
    
    // 确保返回有效数字
    return isFinite(potential) ? Math.max(potential, 0) : 0
  }

  _getOpportunityRecommendation(potential) {
    if (potential > 10) {
      return '🔥 极高潜力 - 强烈推荐'
    } else if (potential > 5) {
      return '✅ 高潜力 - 推荐进入'
    } else if (potential > 2) {
      return '⚠️ 中等潜力 - 谨慎考虑'
    } else if (potential > 0.5) {
      return '🔶 低潜力 - 需要创新'
    } else {
      return '❌ 不建议进入'
    }
  }

  analyzeCompetition(genre) {
    console.log(`🎯 分析 ${genre} 市场竞争...\n`)

    const genreGames = this.gamesData.filter(g => g.Genre === genre)

    if (genreGames.length === 0) {
      return { error: '该类型无数据' }
    }

    const yearlyStats = {}
    genreGames.forEach(game => {
      const year = game.Year_of_Release || 'Unknown'
      if (!yearlyStats[year]) {
        yearlyStats[year] = { count: 0, totalSales: 0 }
      }
      yearlyStats[year].count += 1
      yearlyStats[year].totalSales += game.Global_Sales
    })

    const publishers = {}
    genreGames.forEach(game => {
      const pub = game.Publisher || 'Unknown'
      publishers[pub] = (publishers[pub] || 0) + game.Global_Sales
    })

    const totalSales = Object.values(publishers).reduce((a, b) => a + b, 0)
    const hhi = Object.values(publishers).reduce((sum, sales) => {
      const marketShare = sales / totalSales
      return sum + marketShare * marketShare
    }, 0)

    const topPublishers = Object.entries(publishers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pub, sales]) => ({
        publisher: pub,
        sales: sales.toFixed(2) + 'M',
        marketShare: ((sales / totalSales) * 100).toFixed(1) + '%'
      }))

    return {
      genre,
      totalGames: genreGames.length,
      totalSales: totalSales.toFixed(2) + 'M',
      avgSalesPerGame: (totalSales / genreGames.length).toFixed(2) + 'M',
      marketConcentration: this._interpretHHI(hhi),
      hhi: hhi.toFixed(4),
      topPublishers,
      yearlyTrend: Object.entries(yearlyStats)
        .sort(([a], [b]) => a - b)
        .slice(-5)
        .map(([year, stats]) => ({
          year,
          games: stats.count,
          sales: stats.totalSales.toFixed(2) + 'M'
        }))
    }
  }

  _interpretHHI(hhi) {
    if (hhi < 0.15) {
      return '低集中度 - 竞争激烈'
    } else if (hhi < 0.25) {
      return '中等集中度 - 有主要竞争者'
    } else {
      return '高集中度 - 寡头垄断'
    }
  }

  analyzePriceStrategy(genre, platform) {
    console.log(`💰 分析 ${genre} ${platform} 价格策略...\n`)

    const filtered = this.gamesData.filter(g => 
      g.Genre === genre && g.Platform === platform
    )

    if (filtered.length < 5) {
      return { error: '数据不足，至少需要5款游戏进行分析' }
    }

    const highSales = filtered.filter(g => g.Global_Sales > 2)
    const mediumSales = filtered.filter(g => g.Global_Sales > 0.5 && g.Global_Sales <= 2)
    const lowSales = filtered.filter(g => g.Global_Sales <= 0.5)

    return {
      genre,
      platform,
      totalGames: filtered.length,
      salesDistribution: {
        high: {
          count: highSales.length,
          avgScore: this._avgScore(highSales),
          characteristics: '大作级别（>2M销量）'
        },
        medium: {
          count: mediumSales.length,
          avgScore: this._avgScore(mediumSales),
          characteristics: '中等热度（0.5-2M销量）'
        },
        low: {
          count: lowSales.length,
          avgScore: this._avgScore(lowSales),
          characteristics: '小众游戏（<0.5M销量）'
        }
      },
      recommendation: this._getPriceRecommendation(highSales, mediumSales, lowSales)
    }
  }

  _avgScore(games) {
    const scores = games.filter(g => g.User_Score).map(g => g.User_Score)
    if (scores.length === 0) return 'N/A'
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  }

  _getPriceRecommendation(high, medium, low) {
    const total = high.length + medium.length + low.length
    const highRatio = high.length / total
    const mediumRatio = medium.length / total

    if (highRatio > 0.4) {
      return '🎯 市场认可度高，可采用高价策略（$40-60）'
    } else if (mediumRatio > 0.5) {
      return '✅ 中等价格区间较安全（$20-40）'
    } else if (highRatio + mediumRatio > 0.3) {
      return '⚠️ 建议低价策略吸引用户（$10-20）'
    } else {
      return '💡 考虑免费+内购模式或捆绑销售'
    }
  }
}

module.exports = MarketInsights