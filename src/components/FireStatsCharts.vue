<template>
  <div class="charts">
    <div class="chart" ref="causeEl" aria-label="火情成因占比图"></div>
    <div class="chart" ref="disposalEl" aria-label="火情处置情况占比图"></div>
    <div class="chart wide" ref="regionEl" aria-label="区县火情数量前八柱状图"></div>
    <div class="chart wide" ref="trendEl" aria-label="近30天火情趋势柱状图"></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { FireDashboardData } from '../api/types';
import type { EChartsType } from 'echarts';

type EchartsModule = typeof import('echarts');

let echartsMod: EchartsModule | null = null;
let echartsLoad: Promise<EchartsModule> | null = null;

async function ensureEcharts(): Promise<EchartsModule> {
  if (echartsMod) return echartsMod;
  if (!echartsLoad) {
    echartsLoad = import('echarts');
  }
  echartsMod = await echartsLoad;
  return echartsMod;
}

const props = defineProps<{
  data: FireDashboardData | null;
}>();

const causeEl = ref<HTMLElement | null>(null);
const disposalEl = ref<HTMLElement | null>(null);
const regionEl = ref<HTMLElement | null>(null);
const trendEl = ref<HTMLElement | null>(null);

let causeChart: EChartsType | null = null;
let disposalChart: EChartsType | null = null;
let regionChart: EChartsType | null = null;
let trendChart: EChartsType | null = null;
let ro: ResizeObserver | null = null;

function initCharts(echarts: EchartsModule) {
  if (causeEl.value && !causeChart) causeChart = echarts.init(causeEl.value);
  if (disposalEl.value && !disposalChart) disposalChart = echarts.init(disposalEl.value);
  if (regionEl.value && !regionChart) regionChart = echarts.init(regionEl.value);
  if (trendEl.value && !trendChart) trendChart = echarts.init(trendEl.value);
}

/** 按火点数量降序，仅取前 N 个区县展示 */
function topRegionBar(bar: Array<{ name: string; value: number }>, limit = 8) {
  return [...bar].sort((a, b) => b.value - a.value).slice(0, limit);
}

const pieLegend = {
  type: 'scroll' as const,
  orient: 'horizontal' as const,
  left: 'center',
  bottom: 2,
  itemWidth: 10,
  itemHeight: 10,
  itemGap: 8,
  pageButtonItemGap: 4,
  pageIconSize: 10,
  textStyle: { color: 'rgba(190,220,235,0.72)', fontSize: 10 }
};

const pieSeriesBase = {
  type: 'pie' as const,
  radius: ['32%', '52%'] as [string, string],
  center: ['50%', '42%'] as [string, string],
  avoidLabelOverlap: true,
  label: { show: false },
  labelLine: { show: false },
  emphasis: {
    label: { show: true, fontSize: 10, color: 'rgba(236,246,255,0.92)' }
  },
  itemStyle: { borderColor: 'rgba(6,14,22,0.45)', borderWidth: 2 }
};

function setOptions(echarts: EchartsModule, d: FireDashboardData) {
  const textColor = 'rgba(236,246,255,0.88)';
  const axisColor = 'rgba(190,220,235,0.55)';
  const gridLine = 'rgba(38,220,255,0.10)';

  const regionTop = topRegionBar(d.region_bar || [], 8);

  causeChart?.setOption(
    {
      title: { text: '火情成因占比', left: 10, top: 6, textStyle: { color: textColor, fontSize: 12 } },
      tooltip: { trigger: 'item', confine: true },
      legend: pieLegend,
      series: [
        {
          ...pieSeriesBase,
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
        top: 6,
        textStyle: { color: textColor, fontSize: 12 }
      },
      tooltip: { trigger: 'item', confine: true },
      legend: pieLegend,
      series: [
        {
          ...pieSeriesBase,
          data: d.disposal_pie
        }
      ]
    },
    { notMerge: true }
  );

  regionChart?.setOption(
    {
      title: {
        text: '区县火情数量前八',
        left: 10,
        top: 8,
        textStyle: { color: textColor, fontSize: 12 }
      },
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 14, top: 40, bottom: 32 },
      xAxis: {
        type: 'category',
        axisLabel: { color: axisColor, fontSize: 10, interval: 0, rotate: 22 },
        axisLine: { lineStyle: { color: gridLine } },
        data: regionTop.map((x) => x.name)
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: axisColor, fontSize: 10 },
        splitLine: { lineStyle: { color: gridLine } }
      },
      series: [
        {
          type: 'bar',
          data: regionTop.map((x) => x.value),
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
  void (async () => {
    const echarts = await ensureEcharts();
    await nextTick();
    initCharts(echarts);
    if (props.data) {
      setOptions(echarts, props.data);
      resizeAll();
    }
    ro = new ResizeObserver(() => resizeAll());
    [causeEl.value, disposalEl.value, regionEl.value, trendEl.value].forEach((el) => {
      if (el) ro?.observe(el);
    });
  })();
});

watch(
  () => props.data,
  (d) => {
    if (!d) return;
    void (async () => {
      const echarts = await ensureEcharts();
      await nextTick();
      initCharts(echarts);
      setOptions(echarts, d);
      resizeAll();
    })();
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
  height: 248px;
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

