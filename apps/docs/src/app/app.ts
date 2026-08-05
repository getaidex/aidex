import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DocsShell } from './engine/layout/docs-shell';

@Component({
  selector: 'docs-root',
  standalone: true,
  imports: [DocsShell],
  template: `<docs-shell />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
