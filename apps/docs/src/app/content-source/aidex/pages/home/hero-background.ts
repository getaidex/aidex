import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Node {
  x: number;
  y: number;
  r: number;
  delay: number;
}

const NODES: Node[] = [
  { x: 6, y: 18, r: 2.2, delay: 0 },
  { x: 22, y: 8, r: 1.6, delay: 0.4 },
  { x: 38, y: 24, r: 2.6, delay: 0.8 },
  { x: 55, y: 6, r: 1.8, delay: 1.2 },
  { x: 70, y: 20, r: 2.2, delay: 0.2 },
  { x: 86, y: 10, r: 1.6, delay: 0.9 },
  { x: 12, y: 42, r: 1.8, delay: 0.6 },
  { x: 45, y: 45, r: 2.4, delay: 1.4 },
  { x: 65, y: 48, r: 1.6, delay: 0.3 },
  { x: 92, y: 38, r: 2.0, delay: 1.0 },
  { x: 30, y: 62, r: 1.6, delay: 0.7 },
  { x: 80, y: 60, r: 2.2, delay: 0.1 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [0, 6],
  [2, 7],
  [4, 8],
  [5, 9],
  [6, 10],
  [7, 10],
  [7, 8],
  [8, 11],
  [9, 11],
];

/** Purely decorative, slow-drifting node mesh behind the hero headline. Aidex-specific placement, generic technique. */
@Component({
  selector: 'docs-hero-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="mesh"
      viewBox="0 0 100 70"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g class="layer" stroke="var(--docs-brand)" stroke-width="0.15" fill="none">
        @for (edge of edges; track $index) {
          <line
            [attr.x1]="nodes[edge[0]].x"
            [attr.y1]="nodes[edge[0]].y"
            [attr.x2]="nodes[edge[1]].x"
            [attr.y2]="nodes[edge[1]].y"
          />
        }
      </g>
      <g fill="var(--docs-brand)">
        @for (node of nodes; track $index) {
          <circle
            class="node"
            [attr.cx]="node.x"
            [attr.cy]="node.y"
            [attr.r]="node.r"
            [style.animation-delay.s]="node.delay"
          />
        }
      </g>
    </svg>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
    }
    .mesh {
      width: 100%;
      height: 100%;
      opacity: 0.16;
      animation: docs-mesh-drift 24s ease-in-out infinite alternate;
    }
    :root.dark .mesh {
      opacity: 0.22;
    }
    .layer {
      opacity: 0.6;
    }
    .node {
      animation: docs-icon-pop 4.5s ease-in-out infinite;
    }
    @keyframes docs-icon-pop {
      0%,
      100% {
        opacity: 0.5;
        transform: scale(1);
      }
      50% {
        opacity: 1;
        transform: scale(1.3);
      }
    }
    .node {
      transform-box: fill-box;
      transform-origin: center;
    }
    @media (prefers-reduced-motion: reduce) {
      .mesh,
      .node {
        animation: none !important;
      }
    }
  `,
})
export class HeroBackground {
  protected readonly nodes = NODES;
  protected readonly edges = EDGES;
}
