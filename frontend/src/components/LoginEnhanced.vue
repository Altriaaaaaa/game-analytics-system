<template>
  <div class="modal fade" tabindex="-1" ref="loginModalRef">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content shadow-lg">
        <!-- 头部 -->
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">
            {{ isRegistering ? '🎮 创建账号' : '🔑 欢迎回来' }}
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
        </div>

        <!-- 主体 -->
        <div class="modal-body">
          <!-- 错误提示 -->
          <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
            {{ errorMessage }}
            <button type="button" class="btn-close" @click="errorMessage = ''"></button>
          </div>

          <!-- 成功提示 -->
          <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
            {{ successMessage }}
            <button type="button" class="btn-close" @click="successMessage = ''"></button>
          </div>

          <form @submit.prevent="submit">
            <!-- 用户名（仅注册时显示） -->
            <div v-if="isRegistering" class="mb-3">
              <label class="form-label">用户名 *</label>
              <input
                v-model="username"
                type="text"
                class="form-control"
                :class="{ 'is-invalid': usernameError }"
                placeholder="请输入用户名"
                @blur="validateUsername"
              />
              <div v-if="usernameError" class="invalid-feedback">{{ usernameError }}</div>
            </div>

            <!-- 邮箱 -->
            <div class="mb-3">
              <label class="form-label">邮箱 *</label>
              <input
                v-model="email"
                type="email"
                class="form-control"
                :class="{ 'is-invalid': emailError }"
                placeholder="your@email.com"
                @blur="validateEmail"
              />
              <div v-if="emailError" class="invalid-feedback">{{ emailError }}</div>
            </div>

            <!-- 密码 -->
            <div class="mb-3">
              <label class="form-label">密码 *</label>
              <div class="input-group">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-control"
                  :class="{ 'is-invalid': passwordError }"
                  placeholder="至少6位"
                  @input="validatePassword"
                />
                <button 
                  class="btn btn-outline-secondary" 
                  type="button"
                  @click="showPassword = !showPassword">
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              <div v-if="passwordError" class="invalid-feedback d-block">{{ passwordError }}</div>
              
              <!-- 密码强度指示器 -->
              <div v-if="password && isRegistering" class="mt-2">
                <div class="d-flex align-items-center">
                  <small class="text-muted me-2">密码强度:</small>
                  <div class="progress flex-grow-1" style="height: 8px;">
                    <div 
                      class="progress-bar" 
                      :class="strengthClass"
                      :style="{ width: strengthPercentage + '%' }"
                      role="progressbar">
                    </div>
                  </div>
                  <small :class="strengthTextClass" class="ms-2">{{ passwordStrength }}</small>
                </div>
              </div>
            </div>

            <!-- 确认密码（仅注册时显示） -->
            <div v-if="isRegistering" class="mb-3">
              <label class="form-label">确认密码 *</label>
              <input
                v-model="confirmPassword"
                type="password"
                class="form-control"
                :class="{ 'is-invalid': confirmPasswordError }"
                placeholder="再次输入密码"
                @blur="validateConfirmPassword"
              />
              <div v-if="confirmPasswordError" class="invalid-feedback">{{ confirmPasswordError }}</div>
            </div>

            <!-- 记住我（仅登录时显示） -->
            <div v-if="!isRegistering" class="mb-3 form-check">
              <input v-model="rememberMe" type="checkbox" class="form-check-input" id="rememberMe">
              <label class="form-check-label" for="rememberMe">
                记住我
              </label>
            </div>

            <!-- 提交按钮 -->
            <button 
              type="submit" 
              class="btn btn-primary w-100 mb-2"
              :disabled="loading || !isFormValid">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? '处理中...' : (isRegistering ? '注册' : '登录') }}
            </button>
          </form>

          <!-- 切换模式 -->
          <div class="text-center">
            <button type="button" class="btn btn-link text-decoration-none" @click="toggleMode">
              {{ isRegistering ? '已有账号？立即登录' : '没有账号？立即注册' }}
            </button>
          </div>

          <!-- 测试账号提示 -->
          <div class="alert alert-info mt-3 mb-0" role="alert">
            <small>
              <strong>💡 测试账号:</strong><br>
              邮箱: demo@example.com<br>
              密码: demo123
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineEmits, defineExpose } from 'vue'
import * as bootstrap from 'bootstrap'
import axios from 'axios'

const emit = defineEmits(['loginSuccess', 'registerSuccess'])

const loginModalRef = ref(null)
let modalInstance = null

// 表单字段
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const isRegistering = ref(false)
const loading = ref(false)

// 验证错误
const usernameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const errorMessage = ref('')
const successMessage = ref('')

// 密码强度
const passwordStrength = ref('')

// 计算属性
const strengthPercentage = computed(() => {
  if (!password.value) return 0
  if (passwordStrength.value === '弱') return 33
  if (passwordStrength.value === '中') return 66
  if (passwordStrength.value === '强') return 100
  return 0
})

const strengthClass = computed(() => {
  if (passwordStrength.value === '弱') return 'bg-danger'
  if (passwordStrength.value === '中') return 'bg-warning'
  if (passwordStrength.value === '强') return 'bg-success'
  return ''
})

const strengthTextClass = computed(() => {
  if (passwordStrength.value === '弱') return 'text-danger'
  if (passwordStrength.value === '中') return 'text-warning'
  if (passwordStrength.value === '强') return 'text-success'
  return ''
})

const isFormValid = computed(() => {
  if (isRegistering.value) {
    return username.value && 
           email.value && 
           password.value.length >= 6 && 
           password.value === confirmPassword.value &&
           !usernameError.value &&
           !emailError.value &&
           !passwordError.value
  } else {
    return email.value && password.value.length >= 6
  }
})

// 方法
const openModal = () => {
  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(loginModalRef.value, {
      backdrop: 'static',
      keyboard: true
    })
  }
  modalInstance.show()
}

const closeModal = () => {
  if (modalInstance) modalInstance.hide()
  resetForm()
}

const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  resetForm()
  errorMessage.value = ''
  successMessage.value = ''
}

const resetForm = () => {
  username.value = ''
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  rememberMe.value = false
  showPassword.value = false
  usernameError.value = ''
  emailError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''
  passwordStrength.value = ''
}

// 验证函数
const validateUsername = () => {
  if (!isRegistering.value) return true
  
  if (!username.value.trim()) {
    usernameError.value = '用户名不能为空'
    return false
  }
  if (username.value.length < 2) {
    usernameError.value = '用户名至少2个字符'
    return false
  }
  usernameError.value = ''
  return true
}

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email.value.trim()) {
    emailError.value = '邮箱不能为空'
    return false
  }
  if (!emailRegex.test(email.value)) {
    emailError.value = '邮箱格式不正确'
    return false
  }
  emailError.value = ''
  return true
}

const validatePassword = () => {
  const pwd = password.value
  
  if (!pwd) {
    passwordStrength.value = ''
    passwordError.value = '密码不能为空'
    return false
  }
  
  if (pwd.length < 6) {
    passwordStrength.value = '弱'
    passwordError.value = '密码至少6位'
    return false
  }
  
  // 计算密码强度
  let strength = 0
  if (pwd.length >= 8) strength++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
  if (/[0-9]/.test(pwd)) strength++
  if (/[^a-zA-Z0-9]/.test(pwd)) strength++
  
  if (strength <= 1) passwordStrength.value = '弱'
  else if (strength <= 2) passwordStrength.value = '中'
  else passwordStrength.value = '强'
  
  passwordError.value = ''
  return true
}

const validateConfirmPassword = () => {
  if (!isRegistering.value) return true
  
  if (!confirmPassword.value) {
    confirmPasswordError.value = '请确认密码'
    return false
  }
  if (confirmPassword.value !== password.value) {
    confirmPasswordError.value = '两次密码不一致'
    return false
  }
  confirmPasswordError.value = ''
  return true
}

const validateForm = () => {
  let valid = true
  
  if (isRegistering.value) {
    if (!validateUsername()) valid = false
  }
  if (!validateEmail()) valid = false
  if (!validatePassword()) valid = false
  if (isRegistering.value) {
    if (!validateConfirmPassword()) valid = false
  }
  
  return valid
}

// 提交处理
const submit = async () => {
  if (!validateForm()) {
    errorMessage.value = '请检查表单输入'
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isRegistering.value) {
      await handleRegister()
    } else {
      await handleLogin()
    }
  } catch (error) {
    console.error('提交错误:', error)
    errorMessage.value = error.response?.data?.error || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  const response = await axios.post('http://localhost:3000/api/auth/register', {
    username: username.value,
    email: email.value,
    password: password.value
  })

  if (response.data.success) {
    successMessage.value = '注册成功！正在跳转...'
    
    // 保存令牌
    localStorage.setItem('authToken', response.data.token)
    localStorage.setItem('userInfo', JSON.stringify(response.data.user))
    
    setTimeout(() => {
      emit('registerSuccess', response.data.user)
      closeModal()
    }, 1500)
  }
}

const handleLogin = async () => {
  const response = await axios.post('http://localhost:3000/api/auth/login', {
    email: email.value,
    password: password.value
  })

  if (response.data.success) {
    successMessage.value = '登录成功！'
    
    // 保存令牌
    if (rememberMe.value) {
      localStorage.setItem('authToken', response.data.token)
      localStorage.setItem('userInfo', JSON.stringify(response.data.user))
    } else {
      sessionStorage.setItem('authToken', response.data.token)
      sessionStorage.setItem('userInfo', JSON.stringify(response.data.user))
    }
    
    setTimeout(() => {
      emit('loginSuccess', response.data.user)
      closeModal()
    }, 1000)
  }
}

defineExpose({ openModal })
</script>

<style scoped>
.modal-header {
  border-bottom: none;
}

.form-label {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-control:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.btn-primary {
  font-weight: 500;
  padding: 0.75rem;
}

.btn-link {
  font-size: 0.9rem;
}

.progress {
  border-radius: 10px;
}

.alert {
  border-radius: 0.5rem;
}
</style>