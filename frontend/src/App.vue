<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ForceGraph, ForceGraphOptions, Link } from './ForceGraph';

interface Node {
  name: string;
  description: number;
  parent: string;
}

const chartWrapper = ref<HTMLDivElement | null>(null)
let graph: ForceGraph | null = null

const ENDPOINT = 'http://localhost:4001/'

const loading = ref(false)
const error = ref<string | null>(null)
let nodesMap = ref<Map<string, Node>>(null)
let abortController: AbortController = null
let selectedNode = ref<Node | null>(null);

function normalizeToLinks(payload: Node[]): Link[] {
  return payload
    .filter(item => item.parent !== "")
    .map(item => ({
      source: item.parent,
      target: item.name,
      type: "parent-child",
    }));
}

async function loadData() {
  loading.value = true
  error.value = null
  abortController?.abort()
  abortController = new AbortController()

  try {
    const res = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: abortController.signal
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }

    const json = await res.json()

    return json.data;
  } catch (e: any) {
    error.value = e?.message ?? 'Data fetch error'
  } finally {
    loading.value = false
  }
}

function onNodeClick(id: string) {
  selectedNode.value = nodesMap.get(id)
}

onMounted(async () => {
  if (!chartWrapper.value) {
    return
  }

  graph = new ForceGraph(chartWrapper.value, {
    arcBend: 0.4,
    arrowAngleOffset: -10,
    onNodeClick: onNodeClick,
  } as ForceGraphOptions)

  const nodes = await loadData()
  const links = normalizeToLinks(nodes)
  nodesMap = new Map(nodes.map(item => [item.name, item]))
  graph?.render(links)
})

onUnmounted(() => {
  abortController?.abort()
  graph?.destroy()
})

</script>

<template>
  <div class="wrapper">
    <aside class="sidebar">
      <h1>Graph viewer</h1>
      <div>
        <button @click="() => (loading ? null : (error = null, (async () => await (loadData()))()))" :disabled="loading">
          {{ loading ? 'Loading…' : 'Refresh' }}
        </button>
        <span v-if="error" style="color: #c00;">Error: {{ error }}</span>
      </div>
      <div v-if="selectedNode">
        <p><strong>Name:</strong> {{ selectedNode.name }}</p>
        <p><strong>Description:</strong> {{ selectedNode.description }}</p>
        <p><strong>Parent:</strong> {{ selectedNode.parent || '-' }}</p>
      </div>
    </aside>

    <main class="chartWrapper" ref="chartWrapper">
    </main>
  </div>
</template>

<style>
body {
  margin: 0px !important;
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
  background-color: #e7e7e7ff;
}
.chartWrapper {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative; /* wygodne w wielu przypadkach */
}
.chartWrapper :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  background-color: #f9f9f9;
  font-size: 12px;
}
</style>