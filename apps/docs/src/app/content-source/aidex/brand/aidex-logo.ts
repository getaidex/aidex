import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The Aidex mark: a rounded square with three connected nodes, echoing the favicon. Idle animation only — never blocks legibility. */
@Component({
  selector: 'docs-aidex-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      class="mark"
    >
      <rect width="32" height="32" rx="8" fill="var(--docs-brand)" />
      <path class="edge" d="M9 16 20 9M9 17 20 23" stroke="var(--docs-brand-contrast)" stroke-width="1.6" stroke-linecap="round" />
      <circle class="node n1" cx="9" cy="16.5" r="3.1" fill="var(--docs-brand-contrast)" />
      <circle class="node n2" cx="20.5" cy="8.5" r="3.1" fill="var(--docs-brand-contrast)" />
      <circle class="node n3" cx="20.5" cy="23.5" r="3.1" fill="var(--docs-brand-contrast)" />
      <circle class="pulse" r="1.4" fill="var(--docs-brand)" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .edge {
      opacity: 0.55;
    }
    .node {
      transform-origin: center;
      transform-box: fill-box;
      animation: docs-logo-pop 2.6s ease-in-out infinite;
    }
    .n2 {
      animation-delay: 0.25s;
    }
    .n3 {
      animation-delay: 0.5s;
    }
    .pulse {
      offset-path: path('M9 16 20 9');
      animation: docs-logo-travel 2.4s ease-in-out infinite;
    }
    @keyframes docs-logo-pop {
      0%,
      100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.18);
      }
    }
    @keyframes docs-logo-travel {
      0% {
        offset-distance: 0%;
        opacity: 0;
      }
      20% {
        opacity: 1;
      }
      80% {
        opacity: 1;
      }
      100% {
        offset-distance: 100%;
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
      }
    }
  `,
})
export class AidexLogo {
  readonly size = input(28);
}
