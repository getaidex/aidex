import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The Aidex mark: a rounded square with three connected nodes, echoing the favicon. Idle animation only — never blocks legibility. */
@Component({
  selector: 'docs-aidex-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [attr.width]="size()"
      [attr.height]="size()"
      src="favicon.svg"
      alt="Aidex Logo"
      class="mark"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
    }
    .mark {
      display: block;
      height: auto;
    }
  `,
})
export class AidexLogo {
  readonly size = input(28);
}
