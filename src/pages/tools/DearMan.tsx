import { Suspense, lazy, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ToolLoading } from '../../components/tools/ToolLoading';

const LazyDearManOne = lazy(() => import('../../components/tools/dearMan/DearManOne').then((m) => ({ default: m.DearManOne })));
const LazyDearManDebrief = lazy(() => import('../../components/tools/dearMan/DearManDebrief').then((m) => ({ default: m.DearManDebrief })));
const LazyDearManPrepSkill = lazy(() => import('../../components/tools/dearMan/DearManPrepSkill').then((m) => ({ default: m.DearManPrepSkill })));

/**
 * DEAR MAN's page: the prep (`dear_man_prep`, docs/design/dear-man-prep.md), the debrief (`?mode=debrief`,
 * docs/design/dear-man-debrief.md) or One message (`?mode=one`, docs/design/one-message.md), each on the skill player
 * after who it's with. The mode is read once: a link to another mode is a new visit (ToolPage keys the session by
 * location). The hand-built prep is gone (IE-B4); an old `?resume=` link from it opens the prep fresh.
 */
export function DearMan() {
  const { search } = useLocation();
  const [mode] = useState(() => new URLSearchParams(search).get('mode'));
  if (mode === 'debrief') return <Suspense fallback={<ToolLoading />}><LazyDearManDebrief /></Suspense>;
  if (mode === 'one') return <Suspense fallback={<ToolLoading />}><LazyDearManOne /></Suspense>;
  return <Suspense fallback={<ToolLoading />}><LazyDearManPrepSkill /></Suspense>;
}
