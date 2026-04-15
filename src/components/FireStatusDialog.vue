<template>
  <div class="overlay" role="dialog" aria-modal="true" @click.self="emit('close')">
    <div class="dialog">
      <div class="title">更改火点状态</div>
      <div class="subtitle">点击选择状态，将同步到后端并刷新看板/台账。</div>
      <div class="btns">
        <button type="button" class="btn warn" @click="emit('select', 'pending')">未处置</button>
        <button type="button" class="btn brand" @click="emit('select', 'handling')">处置中</button>
        <button type="button" class="btn ok" @click="emit('select', 'extinguished')">已扑灭</button>
      </div>
      <button type="button" class="close" @click="emit('close')">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FireStatus } from '../api/types';

const emit = defineEmits<{
  close: [];
  select: [status: FireStatus];
}>();
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  z-index: 200;
}

.dialog {
  width: min(420px, calc(100vw - 28px));
  border-radius: 18px;
  border: 1px solid rgba(38, 220, 255, 0.22);
  background: rgba(9, 18, 28, 0.92);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 16px 14px 14px;
}

.title {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.3px;
  color: rgba(236, 246, 255, 0.92);
}

.subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(190, 220, 235, 0.72);
  line-height: 1.45;
}

.btns {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.btn {
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.20);
  background: rgba(6, 14, 22, 0.22);
  color: rgba(236, 246, 255, 0.92);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.2px;
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
    background 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.btn:hover {
  transform: translateY(-1px);
  background: rgba(6, 14, 22, 0.32);
  border-color: rgba(32, 214, 255, 0.34);
}

.btn.warn {
  border-color: rgba(255, 125, 0, 0.30);
}

.btn.brand {
  border-color: rgba(32, 214, 255, 0.30);
}

.btn.ok {
  border-color: rgba(0, 150, 136, 0.30);
}

.close {
  margin-top: 12px;
  width: 100%;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.18);
  background: rgba(6, 14, 22, 0.18);
  color: rgba(190, 220, 235, 0.85);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.close:hover {
  background: rgba(6, 14, 22, 0.26);
}
</style>

