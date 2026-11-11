import { useState } from 'react';
import { deleteProfileItem, type ProfileItemRef } from '../../services/profile';

/**
 * *Forget them* on a person in Me → My people (IE-03, docs/design/people.md): Me's explicit two-step delete
 * (decision P4), the only delete on the Me surface; every other item is set aside and restorable. The person and
 * their links go; plans that named them keep only the role.
 */
export function ForgetPerson({ itemRef, after }: { itemRef: ProfileItemRef; after: (p: Promise<number>) => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)}
        className="min-h-11 text-sm text-[var(--color-text-tertiary)] underline underline-offset-2">
        Forget them
      </button>
    );
  }
  return (
    <div role="group" aria-label="Forget this person" className="flex flex-col items-end gap-1">
      <p className="text-xs text-[var(--color-text-secondary)]">This removes them from the app for good.</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => { setFailed(false); after(deleteProfileItem(itemRef)).catch(() => setFailed(true)); }}
          className="min-h-11 text-sm text-[var(--color-text-primary)] underline underline-offset-2">
          Forget
        </button>
        <button type="button" onClick={() => setAsking(false)}
          className="min-h-11 text-sm text-[var(--color-text-tertiary)] underline underline-offset-2">
          Keep them
        </button>
      </div>
      {failed && <p role="alert" className="text-xs text-[var(--color-text-secondary)]">That didn't go through. Try again.</p>}
    </div>
  );
}
