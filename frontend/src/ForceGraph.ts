import * as d3 from 'd3';

export type Link = { source: string; target: string; type: string };
type NodeDatum = d3.SimulationNodeDatum & { id: string };
type LinkDatum = d3.SimulationLinkDatum<NodeDatum> & { type: string };

export interface ForceGraphOptions {
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
      basicViewBoxWidth: opts?.basicViewBoxWidth ?? 600,
      basicViewBoxHeight: opts?.basicViewBoxHeight ?? 600,
      zoom: opts?.zoom ?? 1.5,
      arcBend: opts?.arcBend ?? 0.4,
      arrowAngleOffset: opts?.arrowAngleOffset ?? -10,
      onNodeClick: opts?.onNodeClick ?? (() => {}),
    };
  }

  public render(linksInput: Link[]) {
    const { viewBoxWidth, viewBoxHeight } = this.computeViewBox();
    const { types, nodes, links } = this.computeGraphData(linksInput);
    this.setColorScale(types);
    this.setupSvgElement(viewBoxWidth, viewBoxHeight);
    this.appendDefs(types);
    this.buildLinks(links);
    this.buildNodes(nodes);
    this.initSimulation(nodes, links);

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

  private computeViewBox(): { viewBoxWidth: number; viewBoxHeight: number } {
    const { basicViewBoxWidth, basicViewBoxHeight, zoom } = this.options;
    const viewBoxWidth = basicViewBoxWidth / zoom;
    const viewBoxHeight = basicViewBoxHeight / zoom;

    return { viewBoxWidth, viewBoxHeight };
  }

  private computeGraphData(linksInput: Link[]): { types: string[]; nodes: NodeDatum[]; links: LinkDatum[]; } {
    const types = Array.from(new Set(linksInput.map(d => d.type)));

    const nodes: NodeDatum[] = Array.from(
      new Set(linksInput.flatMap(l => [l.source, l.target])),
      id => ({ id })
    );

    const links: LinkDatum[] = linksInput.map(d => ({ ...d }));

    return { types, nodes, links };
  }

  private setColorScale(types: string[]): void {
    this.color = d3.scaleOrdinal(types, d3.schemeCategory10);
  }

  private setupSvgElement(viewBoxWidth: number, viewBoxHeight: number): void {
    const width = '100%';
    const height = '100%';

    this.container.innerHTML = '';
    this.svg = d3
      .create('svg')
      .attr('viewBox', [-viewBoxWidth / 2, -viewBoxHeight / 2, viewBoxWidth, viewBoxHeight])
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', width)
      .style('height', height);

    this.container.appendChild(this.svg.node()!);
  }

  private appendDefs(types: string[]): void {
    const defs = this.svg.append('defs'); // creation of defs section - a container for reusable elements

    defs
      .selectAll('marker') // a virtual selection of all <marker> elements (they will be created later)
      .data(types) // bind the data (edge types) to the selection
      .join('marker') // create <marker> elements based on the bound data
      .attr('id', (d: NodeDatum) => `arrow-${d}`) // set unique id for each marker
      .attr('viewBox', '-4 -5 10 10')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('orient', 'auto') // auto-rotate the marker to align with the line
      .append('path') // appending the arrow tip shape
      .attr('fill', 'context-stroke')
      .attr('d', 'M0,-2.5L5,0L0,2.5')
      .attr('transform', `rotate(${this.options.arrowAngleOffset} 5 0)`); // rotate the arrow tip for better alignment
  }

  private buildLinks(links: LinkDatum[]): void {
    this.linkSelection = this.svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke-width', 1.5)
      .selectAll('path') // a virtual selection of all <path> link elements (they will be created later)
      .data(links) // bind the link data to the selection
      .join('path') // create/update <path> elements for each bound link
      .attr('stroke', (d: NodeDatum) => this.color(d.type)) // set stroke color based on link type (matches legend/colors)
      .attr('marker-end', (d: NodeDatum) => `url(#arrow-${d.type})`); // attach arrowhead marker by type (defined in appendDefs)
  }

  private buildNodes(nodes: NodeDatum[]): void {
    const nodeG = this.svg.append('g');

    // create <g> elements for each node
    this.nodeSelection = nodeG.selectAll('g')
      .data(nodes)
      .join('g');

    // append circle to each node <g>
    this.nodeSelection
      .append('circle')
      .attr('r', 4)
      .attr('cursor', 'pointer');

    // append text label to each node <g>
    this.nodeSelection
      .append('text')
      .attr('x', 8)
      .attr('y', '0.31em') // gap relative to font size
      .text((d: NodeDatum) => d.id)
      .attr('cursor', 'pointer'); // show as clickable

    this.nodeSelection.on('click', (_event: any, node: { id: string }) => {
      this.options.onNodeClick(node.id);
    });

    this.nodeSelection.call(this.dragBehavior());
  }

  private initSimulation(nodes: NodeDatum[], links: LinkDatum[]): void {
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
  }


  private linkPath(d: LinkDatum): string {
    const s = d.source as NodeDatum;
    const t = d.target as NodeDatum;
    const dx = (t.x! - s.x!);
    const dy = (t.y! - s.y!);
    const dist = Math.hypot(dx, dy); // straight-line distance (chord length) between the two points
    const bend = this.options.arcBend; // 0..1 - 0 is nearly straight line, 1 is very bendy
    const phi = Math.max(1e-3, bend * Math.PI); // arc angle (radians) with zero division guard (1e-3 instead of 0)
    const r = dist / (2 * Math.sin(phi / 2)); // radius of the circle from which the arc is taken

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

    const colorRed = '#ee2222';
    const colorLightRed = '#ee7777';

    const isOn = (id?: string) => Boolean(id) && this.selectioned.has(id as string);

    // make selected nodes red and slightly larger
    this.nodeSelection
      .select('circle')
      .attr('fill', (d: NodeDatum) => (isOn(d.id) ? colorRed : null))
      .attr('r', (d: NodeDatum) => (isOn(d.id) ? 6 : 4));

    this.nodeSelection.select('text').attr('fill', (d: NodeDatum) => (isOn(d.id) ? colorRed : null));

    // make links connected to selected nodes light-red
    this.linkSelection
      .attr('stroke', (d: NodeDatum) => isOn((d.source as any).id) || isOn((d.target as any).id) ? colorLightRed : this.color(d.type));
  }
}