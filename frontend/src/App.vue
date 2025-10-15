<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { ForceGraph, ForceGraphOptions, Link } from './ForceGraph';

interface Node {
  name: string;
  description: string | number;
  parent: string;
  selectioned?: boolean;
}

const ENDPOINT = 'http://localhost:4001/';

const chartWrapper = ref<HTMLDivElement | null>(null);
let graph: ForceGraph | null = null;

const loading = ref(false);
const error = ref<string | null>(null);
const nodesMap = ref<Map<string, Node> | null>(null);
let abortController: AbortController | null = null;

const selectedNode = ref<Node | null>(null);
let resizeObserver: ResizeObserver | null = null;

async function loadData(): Promise<Node[] | undefined> {
  loading.value = true;
  error.value = null;
  abortController?.abort();
  abortController = new AbortController();

  try {
    const res = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: abortController.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    return json.data as Node[];
  } catch (e: any) {
    error.value = e?.message ?? 'Data fetch error';
  } finally {
    loading.value = false;
  }
}

function renderGraph(nodes: Node[]) {
  ensureGraph();
  const links = normalizeToLinks(nodes);
  nodesMap.value = new Map(nodes.map(n => [n.name, n]));
  graph?.render(links);
}

function ensureGraph() {
  if (graph || !chartWrapper.value) {
    return;
  }

  const { clientWidth, clientHeight } = chartWrapper.value;

  graph = new ForceGraph(chartWrapper.value, {
    width: clientWidth,
    height: clientHeight,
    arcBend: 0.4,
    arrowAngleOffset: -10,
    onNodeClick,
  });

  resizeObserver = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect; // we observe only one element - chartWrapper
    graph?.resize(width, height);
  });

  resizeObserver.observe(chartWrapper.value);
}

function normalizeToLinks(payload: Node[]): Link[] {
  return payload
    .filter(item => item.parent !== '')
    .map(item => ({
      source: item.parent,
      target: item.name,
      type: 'parent-child',
    }));
}

async function refresh() {
  if (loading.value) {
    return;
  }

  const nodes = await loadData();

  if (nodes) {
    renderGraph(nodes);
  }
}

function onNodeClick(id: string) {
  const map = nodesMap.value;

  if (!map) {
    return;
  }

  selectedNode.value = map.get(id) ?? null;
  const next = new Map<string, Node>();

  for (const [key, node] of map.entries()) {
    next.set(key, { ...node, selectioned: key === id });
  }

  nodesMap.value = next;
}

function getGraphValuesToWatch() {
  if (!nodesMap.value) {
    return [];
  }

  return Array.from(nodesMap.value.values()).map(n => ({
    id: n.name,
    selectioned: Boolean(n.selectioned),
  }));
}

function setSelectionOnGraph(arr: { id: string; selectioned: boolean }[]) {
  const ids = arr.filter(n => n.selectioned).map(n => n.id);
  graph?.setSelection(ids);
}

watch(getGraphValuesToWatch, setSelectionOnGraph, { deep: true, immediate: true });

onMounted(async () => {
  if (!chartWrapper.value) {
    return;
  }

  await refresh();
});

onUnmounted(() => {
  abortController?.abort();
  resizeObserver?.disconnect();
  graph?.destroy();
});

</script>

<template>
  <div class="wrapper">
    <aside class="sidebar">
      <h1>Graph viewer</h1>

      <div class="actions">
        <button @click="refresh" :disabled="loading">
          {{ loading ? 'Loading…' : 'Refresh' }}
        </button>
        <div v-if="error" class="error">Error: {{ error }}</div>
      </div>

      <div v-if="selectedNode" class="details">
        <p><strong>Name:</strong> {{ selectedNode.name }}</p>
        <p><strong>Description:</strong> {{ selectedNode.description }}</p>
        <p><strong>Parent:</strong> {{ selectedNode.parent || '-' }}</p>
      </div>
    </aside>

    <main class="chartWrapper" ref="chartWrapper"></main>
  </div>
</template>

<style>
body {
  margin: 0 !important;
}
</style>

<style scoped>
* {
  font-family: sans-serif;
}
.wrapper {
  height: 100vh;
  box-sizing: border-box;
  display: flex;
}
.sidebar {
  width: 250px;
  padding: 15px;
  border-right: 1px solid #ccc;
  background-color: #f5f5f5;
}
.error {
  color: #c00;
}
.details {
  margin-top: 12px;
}
.chartWrapper {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
}
.chartWrapper :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  background-color: #f9f9f9;
  font-size: 12px;
}
</style>
