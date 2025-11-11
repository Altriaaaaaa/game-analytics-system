/**
 * 认证工具函数
 * 处理令牌、用户信息的存储和验证
 */

import axios from 'axios'

const API_BASE = 'http://localhost:3000'

/**
 * 获取存储的令牌
 */
export function getToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
}

/**
 * 保存令牌
 */
export function saveToken(token, remember = false) {
  if (remember) {
    localStorage.setItem('authToken', token)
  } else {
    sessionStorage.setItem('authToken', token)
  }
}

/**
 * 清除令牌
 */
export function clearToken() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('userInfo')
  sessionStorage.removeItem('authToken')
  sessionStorage.removeItem('userInfo')
}

/**
 * 获取存储的用户信息
 */
export function getUserInfo() {
  const userJson = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
  return userJson ? JSON.parse(userJson) : null
}

/**
 * 保存用户信息
 */
export function saveUserInfo(userInfo, remember = false) {
  const userJson = JSON.stringify(userInfo)
  if (remember) {
    localStorage.setItem('userInfo', userJson)
  } else {
    sessionStorage.setItem('userInfo', userJson)
  }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated() {
  return !!getToken()
}

/**
 * 验证令牌是否有效
 */
export async function verifyToken() {
  const token = getToken()
  if (!token) {
    console.log('没有token')
    return false
  }

  try {
    const response = await axios.get(`${API_BASE}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    })
    
    console.log('令牌验证响应:', response.data)
    return response.data.valid === true
    
  } catch (error) {
    console.error('令牌验证失败:', error.response?.data || error.message)
    clearToken()
    return false
  }
}

/**
 * 带认证的 axios 请求
 */
export function createAuthAxios() {
  const instance = axios.create({
    baseURL: API_BASE
  })

  // 请求拦截器：自动添加令牌
  instance.interceptors.request.use(
    (config) => {
      const token = getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器：处理认证错误
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 令牌无效，清除并重定向到登录
        clearToken()
        window.location.href = '/?login=required'
      }
      return Promise.reject(error)
    }
  )

  return instance
}

/**
 * 登录
 */
export async function login(email, password, rememberMe = false) {
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email,
      password
    })

    if (response.data.success) {
      saveToken(response.data.token, rememberMe)
      saveUserInfo(response.data.user, rememberMe)
      return {
        success: true,
        user: response.data.user
      }
    }
    
    return {
      success: false,
      error: '登录失败'
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || '登录失败，请重试'
    }
  }
}

/**
 * 注册
 */
export async function register(username, email, password) {
  try {
    const response = await axios.post(`${API_BASE}/api/auth/register`, {
      username,
      email,
      password
    })

    if (response.data.success) {
      saveToken(response.data.token, true)
      saveUserInfo(response.data.user, true)
      return {
        success: true,
        user: response.data.user
      }
    }
    
    return {
      success: false,
      error: '注册失败'
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || '注册失败，请重试'
    }
  }
}

/**
 * 登出
 */
export async function logout() {
  const token = getToken()
  
  if (token) {
    try {
      await axios.post(`${API_BASE}/api/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('登出请求失败:', error)
    }
  }
  
  clearToken()
}

/**
 * 记录游戏浏览
 */
export async function recordGameView(gameName) {
  if (!isAuthenticated()) return

  const authAxios = createAuthAxios()
  
  try {
    await authAxios.post('/api/user/view-game', { gameName })
  } catch (error) {
    console.error('记录浏览失败:', error)
  }
}

/**
 * 获取用户个人资料
 */
export async function getUserProfile() {
  const authAxios = createAuthAxios()
  
  try {
    const response = await authAxios.get('/api/user/profile')
    return response.data
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw error
  }
}

/**
 * 更新用户偏好
 */
export async function updatePreferences(preferences) {
  const authAxios = createAuthAxios()
  
  try {
    const response = await authAxios.put('/api/user/preferences', { preferences })
    return response.data
  } catch (error) {
    console.error('更新偏好失败:', error)
    throw error
  }
}

/**
 * 格式化日期
 */
export function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * 格式化时间
 */
export function formatDateTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}