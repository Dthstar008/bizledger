import { ChipGroup } from './Chip';
import { publish } from '../events/bus';
import { useAuthStore } from '../store/auth-store';

/** Owner's branch filter. Switching publishes an event so every branch-aware screen refreshes. */
export function BranchSwitcher() {
  const branches = useAuthStore((s) => s.branches);
  const active = useAuthStore((s) => s.activeBranchId);
  const setActive = useAuthStore((s) => s.setActiveBranch);
  if (branches.length < 2) return null;
  const options = [{ value: 'all', label: 'All branches', icon: 'git-branch-outline' as const }, ...branches.map((b) => ({ value: b.id, label: b.name }))];
  return (
    <ChipGroup
      scrollable
      options={options}
      value={active ?? 'all'}
      onChange={(value) => {
        const branchId = value === 'all' ? null : value;
        if (branchId === active) return;
        setActive(branchId);
        publish({ type: 'branch.selected', branchId });
      }}
    />
  );
}

export function useActiveBranchName(): string {
  const branches = useAuthStore((s) => s.branches);
  const active = useAuthStore((s) => s.activeBranchId);
  return branches.find((b) => b.id === active)?.name ?? 'All branches';
}
