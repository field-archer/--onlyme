<template>
  <div class="overlay" role="dialog" aria-modal="true" @click.self="emit('close')">
    <div class="dialog">
      <div class="title">编辑火点信息</div>
      <div class="subtitle">
        可更改状态、等级与火灾原因，并同步到后端。「已扑灭」仅更新状态、不删库；若要从数据库永久删除该火点，请使用下方删除按钮。
      </div>

      <div class="section">
        <div class="section-hd">火点状态</div>
        <div class="btns">
          <button type="button" class="btn warn" :class="{ active: draft.status === 'pending' }" @click="draft.status = 'pending'">
            未处置
          </button>
          <button
            type="button"
            class="btn brand"
            :class="{ active: draft.status === 'handling' }"
            @click="draft.status = 'handling'"
          >
            处置中
          </button>
          <button type="button" class="btn ok" :class="{ active: draft.status === 'extinguished' }" @click="draft.status = 'extinguished'">
            已扑灭
          </button>
        </div>
      </div>

      <div class="section">
        <div class="section-hd">火焰等级</div>
        <div class="seg level-flame">
          <button type="button" class="seg-btn" :class="{ active: draft.level === 'low' }" @click="draft.level = 'low'">低</button>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: draft.level === 'medium' }"
            @click="draft.level = 'medium'"
          >
            中
          </button>
          <button type="button" class="seg-btn" :class="{ active: draft.level === 'high' }" @click="draft.level = 'high'">高</button>
        </div>
      </div>

      <div class="section">
        <div class="section-hd">火灾原因</div>
        <div class="grid4">
          <button type="button" class="seg-btn" :class="{ active: draft.cause === 'human' }" @click="draft.cause = 'human'">
            人为用火
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: draft.cause === 'lightning' }"
            @click="draft.cause = 'lightning'"
          >
            雷击火
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: draft.cause === 'farming' }"
            @click="draft.cause = 'farming'"
          >
            农事用火
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: draft.cause === 'unknown' }"
            @click="draft.cause = 'unknown'"
          >
            其他未知原因
          </button>
        </div>
      </div>

      <div class="actions">
        <div class="actions-row">
          <button type="button" class="ghost" @click="emit('close')">取消</button>
          <button type="button" class="primary" @click="emit('save', { ...draft })">保存</button>
        </div>
        <button type="button" class="danger" @click="emit('delete')">从数据库删除该火点</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { FireCause, FireLevel, FireStatus } from '../api/types';

const props = defineProps<{
  status: FireStatus;
  level: FireLevel;
  cause: FireCause;
}>();

const emit = defineEmits<{
  close: [];
  save: [payload: { status: FireStatus; level: FireLevel; cause: FireCause }];
  delete: [];
}>();

const draft = reactive<{ status: FireStatus; level: FireLevel; cause: FireCause }>({
  status: props.status,
  level: props.level,
  cause: props.cause
});

watch(
  () => [props.status, props.level, props.cause],
  ([s, l, c]) => {
    draft.status = s as FireStatus;
    draft.level = l as FireLevel;
    draft.cause = c as FireCause;
  }
);
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  z-index: 220;
}

.dialog {
  width: min(520px, calc(100vw - 28px));
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

.section {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.section-hd {
  font-size: 12px;
  font-weight: 800;
  color: rgba(190, 220, 235, 0.78);
}

.btns {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.btn {
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.20);
  background: rgba(6, 14, 22, 0.22);
  color: rgba(236, 246, 255, 0.92);
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
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

.btn.active {
  box-shadow: 0 0 26px rgba(32, 214, 255, 0.12);
}

.seg {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.grid4 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.seg-btn {
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  color: rgba(236, 246, 255, 0.90);
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
    background 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.seg-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(32, 214, 255, 0.26);
  background: rgba(6, 14, 22, 0.22);
}

.grid4 .seg-btn.active {
  border-color: rgba(0, 255, 168, 0.42);
  background: linear-gradient(180deg, rgba(0, 255, 168, 0.14), rgba(32, 214, 255, 0.08));
  box-shadow: 0 0 26px rgba(0, 255, 168, 0.1);
}

.seg.level-flame .seg-btn:nth-child(1).active {
  border-color: rgba(255, 210, 60, 0.55);
  background: linear-gradient(180deg, rgba(255, 230, 120, 0.22), rgba(255, 180, 0, 0.1));
  box-shadow: 0 0 22px rgba(255, 200, 60, 0.2);
  color: rgba(40, 28, 0, 0.92);
}

.seg.level-flame .seg-btn:nth-child(2).active {
  border-color: rgba(255, 145, 0, 0.5);
  background: linear-gradient(180deg, rgba(255, 170, 80, 0.2), rgba(255, 125, 0, 0.1));
  box-shadow: 0 0 22px rgba(255, 150, 40, 0.18);
  color: rgba(236, 246, 255, 0.92);
}

.seg.level-flame .seg-btn:nth-child(3).active {
  border-color: rgba(245, 63, 63, 0.55);
  background: linear-gradient(180deg, rgba(255, 120, 120, 0.2), rgba(245, 63, 63, 0.1));
  box-shadow: 0 0 22px rgba(255, 100, 100, 0.18);
  color: rgba(236, 246, 255, 0.92);
}

.actions {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ghost,
.primary {
  height: 40px;
  border-radius: 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 850;
}

.ghost {
  border: 1px solid rgba(38, 220, 255, 0.18);
  background: rgba(6, 14, 22, 0.18);
  color: rgba(190, 220, 235, 0.85);
}

.ghost:hover {
  background: rgba(6, 14, 22, 0.26);
}

.primary {
  border: 1px solid rgba(0, 255, 168, 0.40);
  background: linear-gradient(180deg, rgba(0, 255, 168, 0.16), rgba(32, 214, 255, 0.10));
  color: rgba(236, 246, 255, 0.92);
}

.primary:hover {
  border-color: rgba(0, 255, 168, 0.56);
}

.danger {
  height: 40px;
  border-radius: 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 850;
  border: 1px solid rgba(245, 63, 63, 0.45);
  background: rgba(245, 63, 63, 0.12);
  color: rgba(255, 210, 210, 0.95);
}

.danger:hover {
  border-color: rgba(245, 63, 63, 0.65);
  background: rgba(245, 63, 63, 0.18);
}

@media (max-width: 480px) {
  .btns {
    grid-template-columns: 1fr;
  }
  .grid4 {
    grid-template-columns: 1fr;
  }
}
</style>

