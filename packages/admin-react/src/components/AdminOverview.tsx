import type { AdminController } from '@aidex/admin';
import { useAdmin } from '../useAdmin.js';

export interface AdminOverviewProps {
  controller: AdminController;
  className?: string;
}

export function AdminOverview({ controller, className }: AdminOverviewProps) {
  const snapshot = useAdmin(controller);

  return (
    <section className={className} data-testid="admin-overview">
      <h2>Admin Overview</h2>
      <p data-testid="admin-overview-health">Health: {snapshot.health}</p>
    </section>
  );
}
