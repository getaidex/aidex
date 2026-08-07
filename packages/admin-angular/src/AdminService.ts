import { Injectable, signal, type DestroyRef, type Signal, type WritableSignal } from '@angular/core';
import type {
  AdminController,
  AdminSnapshot,
  Connection,
  RegisterConnectionInput,
  UpdateConnectionInput,
} from '@aidex/admin';

/**
 * Angular adapter over an existing AdminController — no business logic, no
 * second Admin state store. `snapshot` is a read-only Signal kept in sync
 * via AdminController.subscribe(); every command below is an unconditional
 * pass-through to the same controller instance. Not `providedIn: 'root'`
 * and not a singleton: the caller constructs it explicitly with the
 * AdminController their application already built (the same instance
 * driving Aidex), exactly as @aidex/admin-react's useAdmin(controller) does.
 *
 * Cleanup is automatic: the constructor registers the unsubscribe function
 * AdminController.subscribe() returns with `destroyRef.onDestroy()`, so a
 * consumer never has to remember to call it manually.
 */
@Injectable()
export class AdminService {
  private readonly snapshotSignal: WritableSignal<AdminSnapshot>;
  readonly snapshot: Signal<AdminSnapshot>;

  constructor(
    private readonly controller: AdminController,
    destroyRef: DestroyRef
  ) {
    // Reads `controller` (the local parameter), not `this.controller`: class
    // field initializers run before constructor parameter-property
    // assignment, so `this.controller` would still be undefined here.
    this.snapshotSignal = signal(controller.getSnapshot());
    this.snapshot = this.snapshotSignal.asReadonly();

    const unsubscribe = controller.subscribe((next) => this.snapshotSignal.set(next));
    destroyRef.onDestroy(unsubscribe);
  }

  registerConnection(input: RegisterConnectionInput): Connection {
    return this.controller.registerConnection(input);
  }

  updateConnection(id: string, input: UpdateConnectionInput): Connection {
    return this.controller.updateConnection(id, input);
  }

  enableConnection(id: string): Connection {
    return this.controller.enableConnection(id);
  }

  disableConnection(id: string): Connection {
    return this.controller.disableConnection(id);
  }

  removeConnection(id: string): boolean {
    return this.controller.removeConnection(id);
  }

  setAIEnabled(enabled: boolean): void {
    this.controller.setAIEnabled(enabled);
  }

  setFeatureEnabled(feature: string, enabled: boolean): void {
    this.controller.setFeatureEnabled(feature, enabled);
  }

  clearFeatureOverride(feature: string): void {
    this.controller.clearFeatureOverride(feature);
  }
}
