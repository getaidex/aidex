# @aidex/admin-angular

## Installation

```sh
pnpm add @aidex/admin-angular @aidex/admin @angular/core
```

```sh
npm install @aidex/admin-angular @aidex/admin @angular/core
```

An `AdminService` wrapping `@aidex/admin`'s `AdminController` in an Angular
`Signal`. No business logic lives here — every read and command still goes
through the same `AdminController` your application already constructed;
this package only translates its existing `subscribe()`/`getSnapshot()`
into an Angular-native reactive primitive.

## Usage

```ts
import { Component, DestroyRef, inject } from '@angular/core';
import { AdminController } from '@aidex/admin';
import { AdminService } from '@aidex/admin-angular';

// 1. Create/provide an AdminController exactly as in @aidex/admin's own
//    docs — the same connectionManager/aiControl/observability instances
//    your app already wired into Aidex.
const admin = new AdminController({ connectionManager, aiControl, observability });

@Component({
  selector: 'app-admin-panel',
  template: `
    <p>Health: {{ adminService.snapshot().health }}</p>
    <button (click)="adminService.setAIEnabled(!adminService.snapshot().aiControl.enabled)">
      Toggle AI
    </button>
  `,
})
export class AdminPanelComponent {
  // 2. Inject/construct the service with the controller and the current
  //    DestroyRef — cleanup (unsubscribe) happens automatically when this
  //    component is destroyed.
  protected readonly adminService = new AdminService(admin, inject(DestroyRef));

  // 3. Read the reactive snapshot directly in the template via the signal
  //    call above, or in code via `this.adminService.snapshot()`.

  disableConnection(id: string) {
    // 4. Invoke a command — delegates straight to AdminController.
    this.adminService.disableConnection(id);
  }
}
```

## Design notes

- **Not a singleton, not `providedIn: 'root'`.** `AdminService` is
  constructed explicitly with the `AdminController` your app already owns
  — the same instance driving `Aidex` — mirroring
  `@aidex/admin-react`'s `useAdmin(controller)`.
- **`snapshot` is a read-only `Signal<AdminSnapshot>`**, kept in sync via
  `AdminController.subscribe()`. Cleanup is automatic: the constructor
  registers the returned unsubscribe function with
  `destroyRef.onDestroy()`.
- **No duplicated state.** `AdminController` remains the single source of
  truth; this service caches nothing beyond the current signal value.
