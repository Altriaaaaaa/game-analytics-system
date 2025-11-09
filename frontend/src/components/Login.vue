<template>
  <div class="modal fade" tabindex="-1" ref="loginModalRef">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content shadow-lg">
        <div class="modal-header">
          <h5 class="modal-title">{{ isRegistering ? '注册' : '登录' }}</h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <div class="modal-body">
          <!-- 用户名 -->
          <input
            v-model="username"
            type="text"
            class="form-control mb-2"
            :class="{ 'is-invalid': usernameError }"
            placeholder="用户名"
            @input="usernameError = username.value.trim() ? '' : '用户名不能为空'"
          />
          <div class="invalid-feedback">{{ usernameError }}</div>

          <!-- 密码 -->
          <input
            v-model="password"
            type="password"
            class="form-control mb-1"
            :class="{ 'is-invalid': passwordError }"
            placeholder="密码"
            @input="onPasswordInput"
          />
          <div class="text-muted mb-2" v-if="passwordStrength">
            密码强度：
            <span :class="strengthClass">{{ passwordStrength }}</span>
          </div>
          <div class="invalid-feedback">{{ passwordError }}</div>

          <!-- 确认密码 -->
          <input
            v-if="isRegistering"
            v-model="confirmPassword"
            type="password"
            class="form-control mb-2"
            :class="{ 'is-invalid': confirmPasswordError }"
            placeholder="确认密码"
            @input="confirmPasswordError = confirmPassword.value === password.value ? '' : '两次密码不一致'"
          />
          <div v-if="isRegistering" class="invalid-feedback">{{ confirmPasswordError }}</div>
        </div>

        <div class="modal-footer d-flex flex-column align-items-stretch">
          <button type="button" class="btn btn-primary mb-2" @click="submit">
            {{ isRegistering ? '注册' : '登录' }}
          </button>
          <button type="button" class="btn btn-link" @click="toggleMode">
            {{ isRegistering ? '已有账号？登录' : '没有账号？注册' }}
          </button>
          <button type="button" class="btn btn-secondary mt-2" @click="closeModal">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits, defineExpose, computed } from 'vue'
import * as bootstrap from 'bootstrap'

const emit = defineEmits(['login', 'register'])
const loginModalRef = ref(null)
let modalInstance = null

// 表单字段
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const isRegistering = ref(false)

// 验证提示
const usernameError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')

// 密码强度
const passwordStrength = ref('')

// 打开/关闭 Modal
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

// 切换模式
const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  resetForm()
}

// 重置表单
const resetForm = () => {
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  usernameError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''
  passwordStrength.value = ''
}

// 密码输入时更新强度和错误
const onPasswordInput = () => {
  const pwd = password.value
  if (!pwd) passwordStrength.value = ''
  else if (pwd.length < 6) passwordStrength.value = '弱'
  else if (pwd.length <= 10) passwordStrength.value = '中'
  else if (/[0-9]/.test(pwd) && /[a-zA-Z]/.test(pwd)) passwordStrength.value = '强'
  else passwordStrength.value = '中'

  if (!pwd) passwordError.value = '密码不能为空'
  else if (pwd.length < 6) passwordError.value = '密码至少6位'
  else passwordError.value = ''
}

// 根据强度设置颜色
const strengthClass = computed(() => {
  if (passwordStrength.value === '弱') return 'text-danger'
  if (passwordStrength.value === '中') return 'text-warning'
  if (passwordStrength.value === '强') return 'text-success'
  return ''
})

// 前端验证
const validate = () => {
  let valid = true

  if (!username.value.trim()) {
    usernameError.value = '用户名不能为空'
    valid = false
  }

  if (!password.value) {
    passwordError.value = '密码不能为空'
    valid = false
  } else if (password.value.length < 6) {
    passwordError.value = '密码至少6位'
    valid = false
  }

  if (isRegistering.value) {
    if (!confirmPassword.value) {
      confirmPasswordError.value = '请确认密码'
      valid = false
    } else if (confirmPassword.value !== password.value) {
      confirmPasswordError.value = '两次密码不一致'
      valid = false
    }
  }

  return valid
}

// 提交
const submit = () => {
  if (!validate()) return

  if (isRegistering.value) emit('register', { username: username.value, password: password.value })
  else emit('login', { username: username.value, password: password.value })

  closeModal()
}

// 暴露给父组件调用
defineExpose({ openModal })
</script>
