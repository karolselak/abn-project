<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ForceGraph, ForceGraphOptions, Link } from './ForceGraph'

const chartEl = ref<HTMLDivElement | null>(null)
let graph: ForceGraph | null = null

const suits: Link[] = [
  { source: 'A', target: 'B', type: 'x' },
  { source: 'B', target: 'C', type: 'y' },
  { source: 'C', target: 'A', type: 'z' }
]

onMounted(() => {
  if (!chartEl.value) {
    return
  }

  graph = new ForceGraph(chartEl.value, { arcBend: 0.4, arrowAngleOffset: -10 })
  graph.render(suits)
})

onUnmounted(() => graph?.destroy())

</script>

<template>
  <div>
    <h1>Graph viewer</h1>
    <div ref="chartEl"></div>
  </div>
</template>

<style scoped></style>
