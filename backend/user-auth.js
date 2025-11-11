/**
 * 用户认证系统
 * 处理用户注册、登录、会话管理
 */

class UserAuth {
  constructor() {
    // 使用内存存储（生产环境应使用数据库）
    this.users = new Map()
    this.sessions = new Map()
    
    // 添加默认测试用户
    this.users.set('demo@example.com', {
      id: 'user_001',
      username: 'Demo User',
      email: 'demo@example.com',
      password: this.hashPassword('demo123'),
      createdAt: new Date('2024-01-01'),
      preferences: {
        favoriteGenres: [],
        favoritePlatforms: [],
        viewHistory: []
      }
    })
  }

  /**
   * 简单密码哈希（生产环境应使用 bcrypt）
   */
  hashPassword(password) {
    // 实际应用中使用 bcrypt.hash(password, 10)
    return `hashed_${password}_${password.length}`
  }

  /**
   * 验证密码
   */
  verifyPassword(password, hashedPassword) {
    return this.hashPassword(password) === hashedPassword
  }

  /**
   * 生成会话令牌
   */
  generateToken() {
    return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 用户注册
   */
  register(username, email, password) {
    // 验证输入
    if (!username || !email || !password) {
      return { 
        success: false, 
        error: '用户名、邮箱和密码不能为空' 
      }
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { 
        success: false, 
        error: '邮箱格式不正确' 
      }
    }

    // 验证密码强度
    if (password.length < 6) {
      return { 
        success: false, 
        error: '密码至少6位' 
      }
    }

    // 检查邮箱是否已存在
    if (this.users.has(email)) {
      return { 
        success: false, 
        error: '该邮箱已被注册' 
      }
    }

    // 创建用户
    const userId = 'user_' + Date.now()
    const user = {
      id: userId,
      username,
      email,
      password: this.hashPassword(password),
      createdAt: new Date(),
      preferences: {
        favoriteGenres: [],
        favoritePlatforms: [],
        viewHistory: []
      }
    }

    this.users.set(email, user)

    // 创建会话
    const token = this.generateToken()
    this.sessions.set(token, {
      userId,
      email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天
    })

    console.log(`✅ 新用户注册成功: ${email}`)

    return {
      success: true,
      user: {
        id: userId,
        username,
        email
      },
      token
    }
  }

  /**
   * 用户登录
   */
  login(email, password) {
    // 验证输入
    if (!email || !password) {
      return { 
        success: false, 
        error: '邮箱和密码不能为空' 
      }
    }

    // 查找用户
    const user = this.users.get(email)
    if (!user) {
      return { 
        success: false, 
        error: '邮箱或密码错误' 
      }
    }

    // 验证密码
    if (!this.verifyPassword(password, user.password)) {
      return { 
        success: false, 
        error: '邮箱或密码错误' 
      }
    }

    // 创建会话
    const token = this.generateToken()
    this.sessions.set(token, {
      userId: user.id,
      email: user.email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天
    })

    console.log(`✅ 用户登录成功: ${email}`)

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    }
  }

  /**
   * 验证会话令牌
   */
  verifyToken(token) {
    if (!token) {
      return { valid: false, error: '未提供令牌' }
    }

    const session = this.sessions.get(token)
    if (!session) {
      return { valid: false, error: '无效的令牌' }
    }

    // 检查是否过期
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token)
      return { valid: false, error: '令牌已过期' }
    }

    const user = this.users.get(session.email)
    if (!user) {
      return { valid: false, error: '用户不存在' }
    }

    return {
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    }
  }

  /**
   * 登出
   */
  logout(token) {
    if (this.sessions.has(token)) {
      this.sessions.delete(token)
      console.log('✅ 用户登出成功')
      return { success: true }
    }
    return { success: false, error: '无效的令牌' }
  }

  /**
   * 获取用户信息
   */
  getUserInfo(email) {
    const user = this.users.get(email)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      preferences: user.preferences
    }
  }

  /**
   * 更新用户偏好
   */
  updatePreferences(email, preferences) {
    const user = this.users.get(email)
    if (!user) {
      return { success: false, error: '用户不存在' }
    }

    user.preferences = {
      ...user.preferences,
      ...preferences
    }

    return { 
      success: true, 
      preferences: user.preferences 
    }
  }

  /**
   * 记录浏览历史
   */
  addToViewHistory(email, gameData) {
    const user = this.users.get(email)
    if (!user) return

    const viewHistory = user.preferences.viewHistory || []
    
    // 添加到历史记录（最多保留50条）
    viewHistory.unshift({
      game: gameData,
      viewedAt: new Date()
    })

    user.preferences.viewHistory = viewHistory.slice(0, 50)
  }

  /**
   * 清理过期会话
   */
  cleanExpiredSessions() {
    const now = Date.now()
    let cleaned = 0

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 清理了 ${cleaned} 个过期会话`)
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalUsers: this.users.size,
      activeSessions: this.sessions.size,
      timestamp: new Date()
    }
  }
}

module.exports = UserAuth