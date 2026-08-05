import { Directive, ElementRef, OnDestroy, afterNextRender, inject, input } from '@angular/core';

/**
 * Fades/slides an element in the first time it scrolls into view.
 * `[docsRevealDelay]` staggers items in a loop (e.g. `i * 60`).
 * No-ops immediately (no animation) when the user prefers reduced motion.
 */
@Directive({
  selector: '[docsReveal]',
  standalone: true,
  host: { '[class.docs-reveal]': 'true' },
})
export class RevealOnScroll implements OnDestroy {
  readonly delay = input(0, { alias: 'docsRevealDelay' });

  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => this.setup());
  }

  private setup(): void {
    const element = this.host.nativeElement;
    element.style.transitionDelay = `${this.delay()}ms`;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('is-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.classList.add('is-visible');
            this.observer?.unobserve(element);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
