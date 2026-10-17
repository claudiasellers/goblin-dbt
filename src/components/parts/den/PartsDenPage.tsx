import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { PartsContent } from '../../../data/partsContentTypes';
import type { GetDenResponse } from '../../../data/partsTypes';
import { useUserProfile } from '../../../contexts/UserProfileContext';
import { getPartsContent } from '../../../services/partsContent';
import { getDen } from '../../../services/parts';
import { getToolById } from '../../../data/tools';
import { denCopy } from '../../../lib/den';
import { Den } from './Den';

/**
 * Me → Parts of me → See them together (`#/me/parts/den`; App loads this chunk only on the route, and
 * the only way in is the link Parts of me shows with parts on). The gate: parts on and every den line
 * signed off (`DEN_REQUIRED` through `surfaceReady`); otherwise back to Me, as if the room weren't there.
 */
export function PartsDenPage() {
  const { profile, loading } = useUserProfile();
  const partsOn = profile.partsEnabled === true;
  const [content, setContent] = useState<PartsContent | null | 'failed'>(null);
  const [den, setDen] = useState<GetDenResponse | null | 'failed'>(null);

  useEffect(() => {
    if (!partsOn) return;
    let live = true;
    getPartsContent().then((c) => { if (live) setContent(c); }).catch(() => { if (live) setContent('failed'); });
    getDen().then((d) => { if (live) setDen(d); }).catch(() => { if (live) setDen('failed'); });
    return () => { live = false; };
  }, [partsOn]);

  if (loading) return null;
  if (!partsOn || content === 'failed' || den === 'failed') return <Navigate to="/profile" replace />;
  if (!content || !den) return null;
  const copy = denCopy(content);
  if (!copy) return <Navigate to="/profile" replace />;
  return <Den copy={copy} initial={den} twoPullsAvailable={!!getToolById('two-pulls')} />;
}
