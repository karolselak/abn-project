import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ForceGraph, Link } from '../src/ForceGraph';

describe('ForceGraph', () => {
  let container: HTMLDivElement;

  const linksInput: Link[] = [
    { source: 'A', target: 'B', type: 'parent-child' },
    { source: 'A', target: 'C', type: 'parent-child' },
  ];
  // 2 links, 3 nodes (A,B,C)

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('render', () => {
    it('renders SVG with expected attributes and structure', () => {
        const graph = new ForceGraph(container, {
        basicViewBoxWidth: 600,
        basicViewBoxHeight: 600,
        zoom: 2,
        });

        graph.render(linksInput);

        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();

        // viewBox = [-vw/2, -vh/2, vw, vh], where vw = 600/2 = 400, vh = 600/2 = 400
        expect(svg!.getAttribute('viewBox')).toBe('-150,-150,300,300');
        expect(svg!.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');

        const marker = svg!.querySelector('defs > marker#arrow-parent-child');
        expect(marker).toBeTruthy();

        const markerPath = marker!.querySelector('path');
        expect(markerPath).toBeTruthy();
        expect(markerPath!.getAttribute('fill')).toBe('context-stroke');

        const paths = svg!.querySelectorAll('g path');
        expect(paths.length).toBe(2);

        paths.forEach(p => {
        expect(p.getAttribute('marker-end')).toBe('url(#arrow-parent-child)');
        });

        // nodes: <g> with <circle> i <text>
        const nodeGroups = svg!.querySelectorAll('g g'); // first <g> is link container, second <g> is node container
        expect(nodeGroups.length).toBe(3);

        const circles = svg!.querySelectorAll('g g circle');
        const texts = svg!.querySelectorAll('g g text');
        expect(circles.length).toBe(3);
        expect(texts.length).toBe(3);
    });
  });

  describe('onNodeClick injected function', () => {
    it('is being called with the node id when a node is clicked', () => {
      const onNodeClick = vi.fn();
      const graph = new ForceGraph(container, { onNodeClick });

      graph.render(linksInput);

      const svg = container.querySelector('svg')!;
      const nodeGroups = svg.querySelectorAll('g g');
      const firstNodeText = nodeGroups[0].querySelector('text')!.textContent;
      (nodeGroups[0] as SVGGElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onNodeClick).toHaveBeenCalledTimes(1);
      expect(onNodeClick).toHaveBeenCalledWith(firstNodeText);
    });
  });

  describe('setSelection', () => {
    it('applies highlight styles to selected nodes and adjacent links when selected node is given', () => {
      const graph = new ForceGraph(container);
      graph.render(linksInput);

      const svg = container.querySelector('svg')!;
      graph.setSelection(['B']);

      const nodeGroups = svg.querySelectorAll('g g');
      const groupByText = (txt: string) => Array.from(nodeGroups).find(g => g.querySelector('text')!.textContent === txt)!;

      const nodeA = groupByText('A');
      const nodeB = groupByText('B');
      const nodeC = groupByText('C');

      const circleA = nodeA.querySelector('circle')!;
      const circleB = nodeB.querySelector('circle')!;
      const circleC = nodeC.querySelector('circle')!;

      // nodes style check:
      expect(circleA.getAttribute('fill')).toBeNull();
      expect(circleA.getAttribute('r')).toBe('4');

      expect(circleB.getAttribute('fill')).toBe('#ee2222'); // highlighted B node
      expect(circleB.getAttribute('r')).toBe('6');

      expect(circleC.getAttribute('fill')).toBeNull();
      expect(circleC.getAttribute('r')).toBe('4');

      // node text style check:
      const textB = nodeB.querySelector('text')!;
      expect(textB.getAttribute('fill')).toBe('#ee2222');

      // links style check:
      const paths = svg.querySelectorAll('g path');
      const strokes = Array.from(paths).map(p => p.getAttribute('stroke'));
      expect(strokes.filter(s => s === '#ee7777').length).toBe(1);
      expect(strokes.filter(s => s !== '#ee7777').length).toBe(1);
    });

    it('clears selection when no selected node is given', () => {
      const graph = new ForceGraph(container);
      graph.render(linksInput);

      const svg = container.querySelector('svg')!;
      graph.setSelection(['B']);
      graph.setSelection([]);

      const bCircle = Array.from(svg.querySelectorAll('g g')).find(
        g => g.querySelector('text')!.textContent === 'B'
      )!.querySelector('circle')!;
      expect(bCircle.getAttribute('fill')).toBeNull();
      expect(bCircle.getAttribute('r')).toBe('4');
    });
  });

  describe('resize', () => {
    it('updates the viewBox based on new width/height', () => {
      const graph = new ForceGraph(container, {
        basicViewBoxWidth: 600,
        basicViewBoxHeight: 600,
        zoom: 1.5,
      });

      graph.render(linksInput);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe('-200,-200,400,400');

      // change size -> vw=900/1.5=600, vh=300/1.5=200
      graph.resize(900, 300);
      expect(svg.getAttribute('viewBox')).toBe('-300,-100,600,200');
    });
  });

  describe('destroy', () => {
    it('clears the container', () => {
      const graph = new ForceGraph(container);
      graph.render(linksInput);
      expect(container.querySelector('svg')).toBeTruthy();

      graph.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});