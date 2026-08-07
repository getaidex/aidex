import type { AdminController } from '@aidex/admin';
import { useAdmin } from '../useAdmin.js';

export interface ConnectionListProps {
  controller: AdminController;
  className?: string;
}

export function ConnectionList({ controller, className }: ConnectionListProps) {
  const { connections } = useAdmin(controller);

  return (
    <section className={className} data-testid="connection-list">
      <h2>Connections</h2>
      <ul>
        {connections.map((connection) => (
          <li key={connection.id} data-testid={`connection-list-item-${connection.id}`}>
            {connection.id} ({connection.providerType}) —{' '}
            {connection.enabled ? 'enabled' : 'disabled'}
            <button
              type="button"
              aria-label={`${connection.enabled ? 'Disable' : 'Enable'} connection ${connection.id}`}
              onClick={() =>
                connection.enabled
                  ? controller.disableConnection(connection.id)
                  : controller.enableConnection(connection.id)
              }
            >
              {connection.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              aria-label={`Remove connection ${connection.id}`}
              onClick={() => controller.removeConnection(connection.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
