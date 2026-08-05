import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScroll } from '../motion/reveal-on-scroll.directive';
import type { DiagramData, DiagramNode } from './diagram.types';

/**
 * Interactive layered flow diagram. Clicking a node highlights the layers
 * adjacent to it and opens a detail panel with its description and related
 * links. Generic — the caller supplies all node content and link targets.
 */
@Component({
  selector: 'docs-diagram-viewer',
  standalone: true,
  imports: [RouterLink, RevealOnScroll],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div class="flex flex-col items-stretch">
        @for (layer of data().layers; track $index; let layerIndex = $index) {
          <div class="flex flex-wrap justify-center gap-3">
            @for (node of layer.nodes; track node.id; let nodeIndex = $index) {
              <button
                type="button"
                docsReveal
                [docsRevealDelay]="layerIndex * 90 + nodeIndex * 40"
                class="min-w-[9rem] rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all hover:scale-105"
                [class]="nodeClass(node)"
                [attr.aria-pressed]="selectedId() === node.id"
                (click)="select(node.id)"
              >
                {{ node.label }}
              </button>
            }
          </div>
          @if (!$last) {
            <div class="relative flex justify-center py-1" aria-hidden="true">
              <svg width="16" height="24" viewBox="0 0 16 24" class="connector">
                <path d="M8 0 L8 24" stroke="var(--docs-border)" stroke-width="2" />
                <circle class="pulse" r="2.2" fill="var(--docs-brand)" />
              </svg>
            </div>
          }
        }
      </div>

      <aside class="rounded-lg border border-[var(--docs-border)] bg-[var(--docs-bg-subtle)] p-4">
        @if (selectedNode(); as node) {
          <h3 class="text-base font-semibold">{{ node.label }}</h3>
          <p class="mt-2 text-sm text-[var(--docs-fg-muted)]">{{ node.description }}</p>

          @if (node.relatedPackages?.length) {
            <div class="mt-4">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)]">
                Related packages
              </h4>
              <ul class="mt-1.5 flex flex-wrap gap-1.5">
                @for (link of node.relatedPackages; track link.path) {
                  <li>
                    <a
                      [routerLink]="link.path"
                      class="rounded-md border border-[var(--docs-border)] px-2 py-0.5 text-xs hover:text-[var(--docs-brand)]"
                      >{{ link.label }}</a
                    >
                  </li>
                }
              </ul>
            </div>
          }

          @if (node.relatedExamples?.length) {
            <div class="mt-4">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)]">
                Related examples
              </h4>
              <ul class="mt-1.5 flex flex-wrap gap-1.5">
                @for (link of node.relatedExamples; track link.path) {
                  <li>
                    <a
                      [routerLink]="link.path"
                      class="rounded-md border border-[var(--docs-border)] px-2 py-0.5 text-xs hover:text-[var(--docs-brand)]"
                      >{{ link.label }}</a
                    >
                  </li>
                }
              </ul>
            </div>
          }

          @if (node.relatedGuide; as guide) {
            <a [routerLink]="guide.path" class="mt-4 inline-block text-sm font-medium text-[var(--docs-brand)]">
              Read the guide: {{ guide.label }} →
            </a>
          }
        } @else {
          <p class="text-sm text-[var(--docs-fg-muted)]">
            Click a node in <strong>{{ data().title }}</strong> to see what it does, what depends on it, and where
            to learn more.
          </p>
        }
      </aside>
    </div>
  `,
  styles: `
    .connector .pulse {
      offset-path: path('M8 0 L8 24');
      animation: docs-pulse-travel 1.8s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .connector .pulse {
        animation: none;
        opacity: 0;
      }
    }
  `,
})
export class DiagramViewer {
  readonly data = input.required<DiagramData>();

  protected readonly selectedId = signal<string | null>(null);

  protected readonly selectedNode = computed<DiagramNode | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    for (const layer of this.data().layers) {
      const found = layer.nodes.find((n) => n.id === id);
      if (found) return found;
    }
    return null;
  });

  private readonly selectedLayerIndex = computed(() => {
    const id = this.selectedId();
    if (!id) return -1;
    return this.data().layers.findIndex((layer) => layer.nodes.some((n) => n.id === id));
  });

  protected select(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  protected nodeClass(node: DiagramNode): string {
    const layerIndex = this.data().layers.findIndex((layer) => layer.nodes.some((n) => n.id === node.id));
    const selectedLayer = this.selectedLayerIndex();
    const isSelected = node.id === this.selectedId();
    const isAdjacent = selectedLayer !== -1 && Math.abs(layerIndex - selectedLayer) === 1;
    const isDimmed = selectedLayer !== -1 && !isSelected && !isAdjacent;

    if (isSelected) return 'border-[var(--docs-brand)] bg-[var(--docs-brand)] text-[var(--docs-brand-contrast)]';
    if (isAdjacent) return 'border-[var(--docs-brand)] bg-[var(--docs-bg)] text-[var(--docs-fg)]';
    if (isDimmed) return 'border-[var(--docs-border)] bg-[var(--docs-bg)] text-[var(--docs-fg-muted)] opacity-50';
    return 'border-[var(--docs-border)] bg-[var(--docs-bg)] text-[var(--docs-fg)] hover:border-[var(--docs-brand)]';
  }
}
