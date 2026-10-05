/**
 * Dev-only harness for the body step (docs/design/body-map.md): the heat figure, the strength bar and
 * the body mirror (steps 4–5), with the content the app ships and no Firebase. Not part of the app build.
 *   npx vite build --config dev/vite.harness.config.ts && (cd dev-dist && python3 -m http.server 4321)
 *   then open http://localhost:4321/dev/body-map.html
 * URL params: ?words=anxious,excited (grid word ids, in check-in order; none = the body-first path)
 *   &palette=velvet|dusk|tinted|pastel|pastel-mix &theme=light|dark
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { BodyStep, type BodyMark } from '../src/components/checkin/body/BodyStep';

const q = new URLSearchParams(location.search);
const words = (q.get('words') ?? 'anxious,excited').split(',').map((w) => w.trim()).filter(Boolean);
document.documentElement.dataset.palette = q.get('palette') || 'velvet';
document.documentElement.dataset.theme = q.get('theme') || 'dark';

function Harness() {
  const [marks, setMarks] = useState<BodyMark[]>([]);
  const [log, setLog] = useState<string>('');
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] px-4 py-5">
      <BodyStep marks={marks} onChange={setMarks} emotionIds={words} isSomaticEntry={words.length === 0}
        onComplete={() => setLog(JSON.stringify(marks, null, 1))} onSkip={() => setLog('skipped')} />
      <pre data-testid="log" className="mt-6 text-[10px] opacity-70 whitespace-pre-wrap">{log}</pre>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
