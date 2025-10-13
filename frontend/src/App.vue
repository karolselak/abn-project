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
let highlightedNode = ref<Node | null>(null);

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
  highlightedNode.value = nodesMap.get(id)
}

onMounted(async () => {
  if (!chartWrapper.value) {
    return
  }

  graph = new ForceGraph(chartWrapper.value, {
    width: 800,
    height: 600,
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
  <div>
    <h1>Graph viewer</h1>
    <div>
      <button @click="() => (loading ? null : (error = null, (async () => await (loadData()))()))" :disabled="loading">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
      <span v-if="error" style="color: #c00;">Error: {{ error }}</span>
    </div>
    <div class="chartWrapper" ref="chartWrapper"></div>
    <div v-if="highlightedNode">
      <h2>Node Details</h2>
      <p><strong>Name:</strong> {{ highlightedNode.name }}</p>
      <p><strong>Description:</strong> {{ highlightedNode.description }}</p>
      <p><strong>Parent:</strong> {{ highlightedNode.parent || 'None' }}</p>
    </div>
  </div>
</template>

<style scoped>
* {
  font-family: sans-serif;
}
.chartWrapper {
  border: 1px solid #ccc;
}
.chartWrapper :deep(svg) {
  background-color: #f9f9f9;
  border: 1px solid #ccc;
  font: 12px sans-serif;
}
</style>