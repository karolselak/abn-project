import * as d3 from 'd3'

export type Link = { source: string; target: string; type: string }
type NodeDatum = d3.SimulationNodeDatum & { id: string }
type LinkDatum = d3.SimulationLinkDatum<NodeDatum> & { type: string }

export interface ForceGraphOptions {
  width?: number
  height?: number
  zoom?: number
  arcBend?: number // 0..1 for arc curvature
  arrowAngleOffset?: number // degrees
}

export class ForceGraph {
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private simulation!: d3.Simulation<NodeDatum, LinkDatum>
  private linkSelection!: d3.Selection<SVGPathElement, LinkDatum, SVGGElement, unknown>
  private nodeSelection!: d3.Selection<SVGGElement, NodeDatum, SVGGElement, unknown>
  private color!: d3.ScaleOrdinal<string, string>
  private options: Required<ForceGraphOptions>
  private container: HTMLElement

  constructor(container: HTMLElement, opts?: ForceGraphOptions) {
    this.container = container
    this.options = {
      width: opts?.width ?? 300,
      height: opts?.height ?? 300,
      zoom: opts?.zoom ?? 2,
      arcBend: opts?.arcBend ?? 0.4,
      arrowAngleOffset: opts?.arrowAngleOffset ?? -10
    }
  }

  public render(linksInput: Link[]) {
    const { width, height, zoom } = this.options
    const viewBoxWidth = width / zoom
    const viewBoxHeight = height / zoom

    const types = Array.from(new Set(linksInput.map(d => d.type)))
    const nodes: NodeDatum[] = Array.from(
      new Set(linksInput.flatMap(l => [l.source, l.target])),
      id => ({ id })
    )
    const links: LinkDatum[] = linksInput.map(d => ({ ...d }))

    this.color = d3.scaleOrdinal(types, d3.schemeCategory10)

    this.container.innerHTML = ''
    this.svg = d3.create('svg')
      .attr('viewBox', [-viewBoxWidth / 2, -viewBoxHeight / 2, viewBoxWidth, viewBoxHeight])
      .attr('width', width)
      .attr('height', height)
      .attr('style', 'font: 12px sans-serif;')

    this.container.appendChild(this.svg.node()!)

    const defs = this.svg.append('defs')
    defs.selectAll('marker')
      .data(types)
      .join('marker')
        .attr('id', d => `arrow-${d}`)
        .attr('viewBox', '-4 -5 10 10')
        .attr('refX', 7)
        .attr('refY', 0)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
      .append('path')
        .attr('fill', d => this.color(d))
        .attr('d', 'M0,-2.5L5,0L0,2.5')
        .attr('transform', `rotate(${this.options.arrowAngleOffset} 5 0)`)

    this.linkSelection = this.svg.append('g')
      .attr('fill', 'none')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(links)
      .join('path')
        .attr('stroke', d => this.color(d.type))
        .attr('marker-end', d => `url(#arrow-${d.type})`)

    const nodeG = this.svg.append('g')
    this.nodeSelection = nodeG.selectAll('g')
      .data(nodes)
      .join('g')

    this.nodeSelection.append('circle')
      .attr('r', 4)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)

    this.nodeSelection.append('text')
      .attr('x', 8)
      .attr('y', '0.31em')
      .text(d => d.id)

    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('x', d3.forceX())
      .force('y', d3.forceY())
      .on('tick', () => {
        this.linkSelection.attr('d', d => this.linkPath(d))
        this.nodeSelection.attr('transform', d => `translate(${d.x},${d.y})`)
      })

    this.nodeSelection.call(this.dragBehavior(this.simulation) as any)
  }

  public destroy() {
    this.simulation?.stop()
    this.container.innerHTML = ''
  }

  private linkPath(d: LinkDatum): string {
    const s = d.source as NodeDatum
    const t = d.target as NodeDatum
    const dx = t.x! - s.x!, dy = t.y! - s.y!
    const dist = Math.hypot(dx, dy)
    const bend = this.options.arcBend
    const phi = Math.max(1e-3, bend * Math.PI)
    const r = dist / (2 * Math.sin(phi / 2))
    return `M${s.x},${s.y}A${r},${r} 0 0,1 ${t.x},${t.y}`
  }

  private dragBehavior(simulation: d3.Simulation<NodeDatum, LinkDatum>) {
    return d3.drag<SVGGElement, NodeDatum>()
      .on('start', (event, d) => {
        if (!event.active) {
          simulation.alphaTarget(0.3).restart()
        }
        d.fx = d.x; d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x; d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null; d.fy = null
      })
  }
}