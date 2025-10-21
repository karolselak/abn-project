<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { ForceGraph, ForceGraphOptions, Link } from './ForceGraph';

interface Node {
  name: string;
  description: string | number;
  parent: string;
  selectioned?: boolean;
}

const ENV = import.meta.env.VITE_ENVIRONMENT || 'development';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/';

const chartWrapper = ref<HTMLDivElement | null>(null);
let graph: ForceGraph | null = null;

const loading = ref(false);
const error = ref<string | null>(null);
const nodesMap = ref<Map<string, Node> | null>(null);
let abortController: AbortController | null = null;

const selectedNodes = ref<Node[] | null>(null);
let resizeObserver: ResizeObserver | null = null;

async function loadData(): Promise<Node[] | undefined> {
  loading.value = true;
  error.value = null;
  abortController?.abort();
  abortController = new AbortController();

  try {
    const res = await fetch(API_URL, {
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

function onNodeClick(id: string, event?: MouseEvent) {
  const existingNodesMap = nodesMap.value;

  if (!existingNodesMap) {
    return;
  }

  const clickedNode = existingNodesMap.get(id);
  const isShift = Boolean(event?.shiftKey);
  let nextNodesMap: Map<string, Node>;

  if (isShift) {
    nextNodesMap = new Map<string, Node>(existingNodesMap);

    if (clickedNode) {
      nextNodesMap.set(id, { ...clickedNode, selectioned: !clickedNode.selectioned });
    }
  } else {
    nextNodesMap = new Map<string, Node>();
    const multiSelection = Array.from(existingNodesMap).map(n => n[1]).filter(n => n.selectioned).length > 1;
    const selectClickedNode = multiSelection || !clickedNode?.selectioned;

    for (const [key, node] of existingNodesMap.entries()) {
      nextNodesMap.set(key, { ...node, selectioned: key === id && selectClickedNode });
    }
  }

  nodesMap.value = nextNodesMap;
  selectedNodes.value = Array.from(nextNodesMap).map(n => n[1]).filter(n => n.selectioned);
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
      <div class="environmentInfo">
        environment: {{ ENV }}
      </div>
      <h2>Graph viewer</h2>
      <div class="actions">
        <button @click="refresh" :disabled="loading">
          {{ loading ? 'Loading…' : 'Refresh' }}
        </button>
        <div v-if="error" class="error">Error: {{ error }}</div>
      </div>

      <div v-if="selectedNodes?.length > 0" class="selectedNodesInfo">
        <div v-for="node in selectedNodes" class="details">
          <div><strong>Node: {{ node.name }}</strong></div>
          <div>{{ node.description }}</div>
          <div>Parent: {{ node.parent || '-' }}</div>
        </div>
      </div>
      <p v-else>
        Click on a node to select it. Hold Shift to select multiple nodes.
      </p>
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
  display: flex;
  flex-direction: column;
}
.selectedNodesInfo {
  overflow-y: auto;
  flex: 1 1 auto;
}
.environmentInfo {
  font-size: 11px;
  color: #555;
}
.error {
  color: #c00;
  margin-top: 8px;
  font-size: 11px;
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
