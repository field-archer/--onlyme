<template>
  <div class="charts">
    <div class="chart" ref="causeEl" aria-label="火情成因占比图"></div>
    <div class="chart" ref="disposalEl" aria-label="火情处置情况占比图"></div>
    <div class="chart wide" ref="regionEl" aria-label="各区域火情数量柱状图"></div>
    <div class="chart wide" ref="trendEl" aria-label="近30天火情趋势柱状图"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { FireDashboardData } from '../api/types';

const props = defineProps<{
  data: FireDashboardData | null;
}>();

type EChartsNamespace = any;
declare global {
  interface Window {
    echarts?: EChartsNamespace;
  }
}

const causeEl = ref<HTMLElement | null>(null);
const disposalEl = ref<HTMLElement | null>(null);
const regionEl = ref<HTMLElement | null>(null);
const trendEl = ref<HTMLElement | null>(null);

let causeChart: any = null;
let disposalChart: any = null;
let regionChart: any = null;
let trendChart: any = null;
let ro: ResizeObserver | null = null;

async function ensureECharts(): Promise<EChartsNamespace> {
  if (window.echarts) return window.echarts;
  await new Promise<void>((resolve, reject) => {
    const existed = document.querySelector('script[data-echarts="true"]') as HTMLScriptElement | null;
    if (existed) {
      const timer = window.setInterval(() => {
        if (window.echarts) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        clearInterval(timer);
        reject(new Error('ECharts 加载超时'));
      }, 10000);
      return;
    }

    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
    s.async = true;
    s.dataset.echarts = 'true';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('ECharts 加载失败'));
    document.head.appendChild(s);
  });
  if (!window.echarts) throw new Error('ECharts 未就绪');
  return window.echarts;
}

function initCharts() {
  const echarts = window.echarts;
  if (!echarts) return;
  if (causeEl.value && !causeChart) causeChart = echarts.init(causeEl.value);
  if (disposalEl.value && !disposalChart) disposalChart = echarts.init(disposalEl.value);
  if (regionEl.value && !regionChart) regionChart = echarts.init(regionEl.value);
  if (trendEl.value && !trendChart) trendChart = echarts.init(trendEl.value);
}

function setOptions(d: FireDashboardData) {
  const echarts = window.echarts;
  if (!echarts) return;
  const textColor = 'rgba(236,246,255,0.88)';
  const axisColor = 'rgba(190,220,235,0.55)';
  const gridLine = 'rgba(38,220,255,0.10)';

  causeChart?.setOption(
    {
      title: { text: '火情成因占比', left: 10, top: 8, textStyle: { color: textColor, fontSize: 12 } },
      tooltip: { trigger: 'item' },
      legend: { bottom: 6, textStyle: { color: axisColor, fontSize: 10 } },
      series: [
        {
          type: 'pie',
          radius: ['38%', '66%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          label: { color: axisColor, fontSize: 10 },
          itemStyle: { borderColor: 'rgba(6,14,22,0.4)', borderWidth: 2 },
          data: d.cause_pie
        }
      ]
    },
    { notMerge: true }
  );

  disposalChart?.setOption(
    {
      title: {
        text: '处置情况占比',
        left: 10,
        top: 8,
        textStyle: { color: textColor, fontSize: 12 }
      },
      tooltip: { trigger: 'item' },
      legend: { bottom: 6, textStyle: { color: axisColor, fontSize: 10 } },
      series: [
        {
          type: 'pie',
          radius: ['38%', '66%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          label: { color: axisColor, fontSize: 10 },
          itemStyle: { borderColor: 'rgba(6,14,22,0.4)', borderWidth: 2 },
          data: d.disposal_pie
        }
      ]
    },
    { notMerge: true }
  );

  regionChart?.setOption(
    {
      title: { text: '各区域火情数量（北京周边）', left: 10, top: 8, textStyle: { color: textColor, fontSize: 12 } },
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 14, top: 38, bottom: 28 },
      xAxis: {
        type: 'category',
        axisLabel: { color: axisColor, fontSize: 10, interval: 0, rotate: 20 },
        axisLine: { lineStyle: { color: gridLine } },
        data: d.region_bar.map((x) => x.name)
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: axisColor, fontSize: 10 },
        splitLine: { lineStyle: { color: gridLine } }
      },
      series: [
        {
          type: 'bar',
          data: d.region_bar.map((x) => x.value),
          barWidth: 14,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(32,214,255,0.75)' },
              { offset: 1, color: 'rgba(32,214,255,0.16)' }
            ])
          }
        }
      ]
    },
    { notMerge: true }
  );

  trendChart?.setOption(
    {
      title: { text: '近 30 天火情趋势', left: 10, top: 8, textStyle: { color: textColor, fontSize: 12 } },
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 14, top: 38, bottom: 28 },
      xAxis: {
        type: 'category',
        axisLabel: { color: axisColor, fontSize: 10 },
        axisLine: { lineStyle: { color: gridLine } },
        data: d.trend_30d.map((x) => x.date)
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: axisColor, fontSize: 10 },
        splitLine: { lineStyle: { color: gridLine } }
      },
      series: [
        {
          type: 'bar',
          data: d.trend_30d.map((x) => x.value),
          barWidth: 10,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0,255,168,0.65)' },
              { offset: 1, color: 'rgba(0,255,168,0.14)' }
            ])
          }
        }
      ]
    },
    { notMerge: true }
  );
}

function resizeAll() {
  causeChart?.resize();
  disposalChart?.resize();
  regionChart?.resize();
  trendChart?.resize();
}

onMounted(() => {
  void ensureECharts().then(() => {
    initCharts();
    if (props.data) {
      setOptions(props.data);
      resizeAll();
    }
  });
  ro = new ResizeObserver(() => resizeAll());
  [causeEl.value, disposalEl.value, regionEl.value, trendEl.value].forEach((el) => {
    if (el) ro?.observe(el);
  });
});

watch(
  () => props.data,
  (d) => {
    if (!d) return;
    initCharts();
    setOptions(d);
    resizeAll();
  },
  { immediate: true }
);

onUnmounted(() => {
  ro?.disconnect();
  ro = null;
  causeChart?.dispose();
  disposalChart?.dispose();
  regionChart?.dispose();
  trendChart?.dispose();
  causeChart = disposalChart = regionChart = trendChart = null;
});
</script>

<style scoped>
.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.chart {
  height: 220px;
  border-radius: 16px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  overflow: hidden;
}

.chart.wide {
  grid-column: 1 / -1;
  height: 200px;
}

@media (max-width: 960px) {
  .charts {
    grid-template-columns: 1fr;
  }
  .chart.wide {
    grid-column: auto;
  }
}
</style>

