import * as d3 from 'd3';

export type Link = { source: string; target: string; type: string };
type NodeDatum = d3.SimulationNodeDatum & { id: string };
type LinkDatum = d3.SimulationLinkDatum<NodeDatum> & { type: string };

export interface ForceGraphOptions {
  width?: string | number;
  height?: string | number;
  basicViewBoxWidth?: number;
  basicViewBoxHeight?: number;
  zoom?: number;
  arcBend?: number; // 0..1 for arc curvature
  arrowAngleOffset?: number; // degrees
  onNodeClick?: (id: string) => void;
}

export class ForceGraph {
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private simulation!: d3.Simulation<NodeDatum, LinkDatum>;
  private linkSelection!: d3.Selection<SVGPathElement, LinkDatum, SVGGElement, unknown>;
  private nodeSelection!: d3.Selection<SVGGElement, NodeDatum, SVGGElement, unknown>;
  private color!: d3.ScaleOrdinal<string, string>;
  private options: Required<ForceGraphOptions>;
  private container: HTMLElement;
  private selectioned = new Set<string>();

  constructor(container: HTMLElement, opts?: ForceGraphOptions) {
    this.container = container;

    this.options = {
      width: opts?.width ?? '100%',
      height: opts?.height ?? '100%',
      basicViewBoxWidth: opts?.basicViewBoxWidth ?? 600,
      basicViewBoxHeight: opts?.basicViewBoxHeight ?? 600,
      zoom: opts?.zoom ?? 1.5,
      arcBend: opts?.arcBend ?? 0.4,
      arrowAngleOffset: opts?.arrowAngleOffset ?? -10,
      onNodeClick: opts?.onNodeClick ?? (() => {}),
    };
  }

  public render(linksInput: Link[]) {
    const { width, height, basicViewBoxWidth, basicViewBoxHeight, zoom } = this.options;
    const viewBoxWidth = basicViewBoxWidth / zoom;
    const viewBoxHeight = basicViewBoxHeight / zoom;

    const types = Array.from(new Set(linksInput.map(d => d.type)));
    const nodes: NodeDatum[] = Array.from(new Set(linksInput.flatMap(l => [l.source, l.target])), id => ({ id }));
    const links: LinkDatum[] = linksInput.map(d => ({ ...d }));

    this.color = d3.scaleOrdinal(types, d3.schemeCategory10);

    this.container.innerHTML = '';
    this.svg = d3
      .create('svg')
      .attr('viewBox', [-viewBoxWidth / 2, -viewBoxHeight / 2, viewBoxWidth, viewBoxHeight])
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', width)
      .style('height', height);

    this.container.appendChild(this.svg.node()!);

    const defs = this.svg.append('defs');

    defs
      .selectAll('marker')
      .data(types)
      .join('marker')
      .attr('id', (d: NodeDatum) => `arrow-${d}`)
      .attr('viewBox', '-4 -5 10 10')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', 'context-stroke')
      .attr('d', 'M0,-2.5L5,0L0,2.5')
      .attr('transform', `rotate(${this.options.arrowAngleOffset} 5 0)`);

    this.linkSelection = this.svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('stroke', (d: NodeDatum) => this.color(d.type))
      .attr('marker-end', (d: NodeDatum) => `url(#arrow-${d.type})`);

    const nodeG = this.svg.append('g');
    this.nodeSelection = nodeG.selectAll('g').data(nodes).join('g');
    this.nodeSelection.append('circle').attr('r', 4).attr('cursor', 'pointer');

    this.nodeSelection
      .append('text')
      .attr('x', 8)
      .attr('y', '0.31em')
      .text((d: NodeDatum) => d.id)
      .attr('cursor', 'pointer');

    this.nodeSelection.on('click', (_event: any, node: { id: string }) => {
      this.options.onNodeClick(node.id);
    });

    this.simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: NodeDatum) => d.id))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('x', d3.forceX())
      .force('y', d3.forceY())
      .on('tick', () => {
        this.linkSelection.attr('d', (d: NodeDatum) => this.linkPath(d));
        this.nodeSelection.attr('transform', (d: NodeDatum) => `translate(${d.x},${d.y})`);
      });

    this.nodeSelection.call(this.dragBehavior());

    if (this.selectioned.size) {
      this.applySelection();
    }
  }

  public resize(width: number, height: number) {
    this.options.basicViewBoxWidth = width;
    this.options.basicViewBoxHeight = height;
    const vw = width / this.options.zoom;
    const vh = height / this.options.zoom;
    this.svg?.attr('viewBox', [-vw / 2, -vh / 2, vw, vh]);

    if (this.simulation) {
      this.simulation.alpha(0.3).restart();
    }
  }

  public destroy() {
    this.simulation?.stop();
    this.container.innerHTML = '';
  }

  public setSelection(ids: Iterable<string>) {
    this.selectioned = new Set(ids);
    this.applySelection();
  }

  public setActive(id: string | null) {
    this.selectioned = id ? new Set([id]) : new Set();
    this.applySelection();
  }

  private linkPath(d: LinkDatum): string {
    const s = d.source as NodeDatum;
    const t = d.target as NodeDatum;
    const dx = (t.x! - s.x!);
    const dy = (t.y! - s.y!);
    const dist = Math.hypot(dx, dy);
    const bend = this.options.arcBend;
    const phi = Math.max(1e-3, bend * Math.PI);
    const r = dist / (2 * Math.sin(phi / 2));

    return `M${s.x},${s.y}A${r},${r} 0 0,1 ${t.x},${t.y}`;
  }

  private dragBehavior() {
    return d3
      .drag<SVGGElement, NodeDatum>()
      .on('start', this.onDragStart.bind(this))
      .on('drag', this.onDragInProgress.bind(this))
      .on('end', this.onDragEnd.bind(this));
  }

  private onDragStart(event: d3.D3DragEvent, d: NodeDatum) {
    if (!event.active) {
      this.simulation.alphaTarget(0.3).restart();
    }

    d.fx = d.x;
    d.fy = d.y;
  }

  private onDragInProgress(event: d3.D3DragEvent, d: NodeDatum) {
    d.fx = event.x;
    d.fy = event.y;
  }

  private onDragEnd(event: d3.D3DragEvent, d: NodeDatum) {
    if (!event.active) {
      this.simulation.alphaTarget(0);
    }

    d.fx = null;
    d.fy = null;
  }

  private applySelection() {
    if (!this.nodeSelection || !this.linkSelection) {
      return;
    }

    const isOn = (id?: string) => Boolean(id) && this.selectioned.has(id as string);

    this.nodeSelection
      .select('circle')
      .attr('fill', (d: NodeDatum) => (isOn(d.id) ? '#ee2222' : null))
      .attr('r', (d: NodeDatum) => (isOn(d.id) ? 6 : 4));

    this.nodeSelection.select('text').attr('fill', (d: NodeDatum) => (isOn(d.id) ? '#ee2222' : null));

    this.linkSelection
      .attr('stroke', (d: NodeDatum) => isOn((d.source as any).id) || isOn((d.target as any).id) ? '#ee7777' : this.color(d.type));
  }
}