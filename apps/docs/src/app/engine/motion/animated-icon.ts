import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Generic animated-icon vocabulary. Content-sources map their own domain
 * concepts (an "engine", a "provider", a CLI...) onto one of these — the
 * icon set itself has no product-specific meaning baked in.
 */
export type IconKind =
  | 'nodes'
  | 'pulse'
  | 'orbit'
  | 'bubbles'
  | 'gear'
  | 'layers'
  | 'terminal'
  | 'eye'
  | 'grid'
  | 'bolt'
  | 'link'
  | 'database';

/** A small, looping, decorative SVG icon. Disables its own animation under prefers-reduced-motion. */
@Component({
  selector: 'docs-animated-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="icon"
      [class]="'kind-' + kind()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (kind()) {
        @case ('nodes') {
          <circle class="n n1" cx="6" cy="7" r="2.2" />
          <circle class="n n2" cx="18" cy="6" r="2.2" />
          <circle class="n n3" cx="12" cy="18" r="2.2" />
          <path class="edge" d="M8 8.3 10.5 16.3M15.8 7.3 13.5 16" />
        }
        @case ('pulse') {
          <path d="M2 12h4l2 -7 4 14 2 -7h8" class="path" />
          <circle class="dot" r="1.6" cx="2" cy="12" />
        }
        @case ('orbit') {
          <circle cx="12" cy="12" r="7" class="ring" />
          <circle class="satellite" cx="19" cy="12" r="1.8" fill="currentColor" stroke="none" />
        }
        @case ('bubbles') {
          <path class="b1" d="M3 6h11v7H8l-3 3v-3H3z" />
          <path class="b2" d="M21 10v6h-3v3l-3-3h-4" />
        }
        @case ('gear') {
          <circle cx="12" cy="12" r="3.2" class="hub" />
          <path
            class="teeth"
            d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"
          />
        }
        @case ('layers') {
          <path class="l1" d="M12 3 21 8l-9 5-9-5 9-5Z" />
          <path class="l2" d="M3 12l9 5 9-5" />
          <path class="l3" d="M3 16l9 5 9-5" />
        }
        @case ('terminal') {
          <rect x="2.5" y="4" width="19" height="16" rx="2" class="frame" />
          <path class="chevron" d="M6.5 9.5 10 12l-3.5 2.5" />
          <path class="cursor" d="M12.5 14.5h5" />
        }
        @case ('eye') {
          <path class="lid" d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" />
          <circle class="pupil" cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
        }
        @case ('grid') {
          <rect class="g g1" x="3" y="3" width="7" height="7" rx="1.2" />
          <rect class="g g2" x="14" y="3" width="7" height="7" rx="1.2" />
          <rect class="g g3" x="3" y="14" width="7" height="7" rx="1.2" />
          <rect class="g g4" x="14" y="14" width="7" height="7" rx="1.2" />
        }
        @case ('bolt') {
          <path class="bolt" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        }
        @case ('link') {
          <path class="chain c1" d="M9 15 15 9" />
          <rect class="chain c2" x="2.5" y="10.5" width="8" height="5.5" rx="2.5" transform="rotate(-45 6.5 13.2)" />
          <rect class="chain c3" x="13.5" y="8" width="8" height="5.5" rx="2.5" transform="rotate(-45 17.5 10.8)" />
        }
        @case ('database') {
          <ellipse class="d-top" cx="12" cy="6" rx="8" ry="3" />
          <path class="d-side" d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
          <path class="d-mid" d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .icon {
      width: 100%;
      height: 100%;
    }

    .n {
      animation: docs-icon-pop 2.4s ease-in-out infinite;
    }
    .n2 {
      animation-delay: 0.3s;
    }
    .n3 {
      animation-delay: 0.6s;
    }
    .edge {
      opacity: 0.5;
    }

    .path {
      stroke-dasharray: 40;
      stroke-dashoffset: 40;
      animation: docs-icon-dash 1.8s ease-out infinite;
    }
    .dot {
      offset-path: path('M2 12h4l2 -7 4 14 2 -7h8');
      animation: docs-icon-travel 2.2s ease-in-out infinite;
    }

    .ring {
      opacity: 0.5;
    }
    .satellite {
      transform-origin: 12px 12px;
      animation: docs-icon-spin 3.2s linear infinite;
    }

    .b1 {
      animation: docs-icon-fade 2.4s ease-in-out infinite;
    }
    .b2 {
      animation: docs-icon-fade 2.4s ease-in-out infinite 1.2s;
    }

    .teeth {
      transform-origin: 12px 12px;
      animation: docs-icon-spin 6s linear infinite;
    }

    .l1,
    .l2,
    .l3 {
      animation: docs-icon-rise 2.4s ease-in-out infinite;
    }
    .l2 {
      animation-delay: 0.2s;
    }
    .l3 {
      animation-delay: 0.4s;
    }

    .chevron {
      animation: docs-icon-slide 1.8s ease-in-out infinite;
    }
    .cursor {
      animation: docs-icon-fade 1s step-end infinite;
    }

    .pupil {
      animation: docs-icon-pop 3s ease-in-out infinite;
    }

    .g {
      animation: docs-icon-fade 2.6s ease-in-out infinite;
    }
    .g2 {
      animation-delay: 0.2s;
    }
    .g3 {
      animation-delay: 0.4s;
    }
    .g4 {
      animation-delay: 0.6s;
    }

    .bolt {
      transform-origin: center;
      animation: docs-icon-pop 1.6s ease-in-out infinite;
    }

    .chain {
      animation: docs-icon-fade 2.4s ease-in-out infinite;
    }

    .d-top {
      animation: docs-icon-pop 2.6s ease-in-out infinite;
    }

    @keyframes docs-icon-pop {
      0%,
      100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.15);
        opacity: 0.75;
      }
    }
    @keyframes docs-icon-dash {
      to {
        stroke-dashoffset: 0;
      }
    }
    @keyframes docs-icon-travel {
      0% {
        offset-distance: 0%;
        opacity: 0;
      }
      15% {
        opacity: 1;
      }
      85% {
        opacity: 1;
      }
      100% {
        offset-distance: 100%;
        opacity: 0;
      }
    }
    @keyframes docs-icon-spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes docs-icon-fade {
      0%,
      100% {
        opacity: 0.35;
      }
      50% {
        opacity: 1;
      }
    }
    @keyframes docs-icon-rise {
      0%,
      100% {
        transform: translateY(0);
        opacity: 1;
      }
      50% {
        transform: translateY(-1.5px);
        opacity: 0.7;
      }
    }
    @keyframes docs-icon-slide {
      0%,
      100% {
        transform: translateX(0);
      }
      50% {
        transform: translateX(2px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
      }
    }
  `,
})
export class AnimatedIcon {
  readonly kind = input.required<IconKind>();
}
