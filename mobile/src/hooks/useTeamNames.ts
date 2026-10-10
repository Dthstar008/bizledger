import { useCallback } from 'react';
import { listEmployees } from '../api/employees';
import { selectIsOwner, useAuthStore } from '../store/auth-store';
import { useResource } from './useResource';

/** Resolves a ledger event's actorId to a person's name (owners only; staff can't list the team). */
export function useTeamNames() {
  const isOwner = useAuthStore(selectIsOwner);
  const me = useAuthStore((s) => s.user);
  const { data } = useResource(() => (isOwner ? listEmployees() : Promise.resolve([])), ['team.changed'], [isOwner]);
  return useCallback(
    (id: string) => {
      if (id === me?.id) return 'You';
      const e = data?.find((x) => x.id === id);
      return e ? e.name ?? e.email : undefined;
    },
    [data, me?.id],
  );
}
