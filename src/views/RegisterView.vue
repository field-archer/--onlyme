<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon" aria-hidden="true">🌲</span>
        <h1>护林员注册</h1>
        <p class="auth-sub">用户名 3～64 位，仅字母、数字、下划线；密码至少 6 位</p>
      </div>

      <form class="auth-form" @submit.prevent="onSubmit">
        <label class="field">
          <span>用户名</span>
          <input
            v-model.trim="username"
            type="text"
            autocomplete="username"
            placeholder="例如 ranger_01"
            required
            minlength="3"
            maxlength="64"
            pattern="[a-zA-Z0-9_]{3,64}"
          />
        </label>
        <label class="field">
          <span>密码</span>
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="至少 6 位"
            required
            minlength="6"
          />
        </label>
        <label class="field">
          <span>确认密码</span>
          <input
            v-model="password2"
            type="password"
            autocomplete="new-password"
            placeholder="再次输入密码"
            required
            minlength="6"
          />
        </label>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '提交中…' : '注册' }}
        </button>
      </form>

      <p class="auth-footer">
        已有账号？
        <RouterLink :to="{ name: 'login', query: route.query }">去登录</RouterLink>
      </p>
      <RouterLink class="back-link" to="/">← 返回首页</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { ApiError } from '../api/client';

const route = useRoute();
const router = useRouter();
const { register } = useAuth();

const username = ref('');
const password = ref('');
const password2 = ref('');
const loading = ref(false);
const errorMsg = ref('');

const USERNAME_RE = /^[a-zA-Z0-9_]{3,64}$/;

async function onSubmit() {
  errorMsg.value = '';
  if (!USERNAME_RE.test(username.value)) {
    errorMsg.value = '用户名须为 3～64 位字母、数字或下划线';
    return;
  }
  if (password.value !== password2.value) {
    errorMsg.value = '两次输入的密码不一致';
    return;
  }
  loading.value = true;
  try {
    await register(username.value, password.value);
    await router.replace({
      name: 'login',
      query: { ...route.query, registered: '1', u: username.value }
    });
  } catch (e) {
    if (e instanceof ApiError) {
      errorMsg.value = e.message || '注册失败';
    } else {
      errorMsg.value = '网络异常，请稍后重试';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  box-sizing: border-box;
}

.auth-card {
  width: min(100%, 400px);
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-xl);
  padding: 28px 26px 24px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.auth-header {
  text-align: center;
  margin-bottom: 22px;
}

.auth-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 10px;
}

.auth-header h1 {
  margin: 0;
  font-size: 22px;
  color: var(--text);
  font-weight: 700;
}

.auth-sub {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.field span {
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}

.field input {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(32, 214, 255, 0.28);
  background: rgba(8, 20, 30, 0.55);
  color: var(--text);
  font-size: 15px;
  outline: none;
}

.field input:focus {
  border-color: rgba(32, 214, 255, 0.55);
  box-shadow: 0 0 0 2px rgba(32, 214, 255, 0.12);
}

.error {
  margin: 0;
  font-size: 13px;
  color: var(--danger);
}

.submit-btn {
  margin-top: 4px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 168, 0.45);
  background: linear-gradient(180deg, rgba(0, 255, 168, 0.18), rgba(32, 214, 255, 0.1));
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.auth-footer {
  margin: 20px 0 0;
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}

.auth-footer a {
  color: var(--brand);
  text-decoration: none;
  font-weight: 600;
}

.auth-footer a:hover {
  text-decoration: underline;
}

.back-link {
  display: block;
  text-align: center;
  margin-top: 14px;
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
}

.back-link:hover {
  color: var(--brand);
}
</style>
