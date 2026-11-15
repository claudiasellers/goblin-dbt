import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { CheckIn } from './pages/CheckIn';
import { Tools } from './pages/Tools';
import { History } from './pages/History';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ToolPage } from './pages/ToolPage';
import { Profile } from './pages/Profile';
import { Safety } from './pages/Safety';
import { SafetyPlan } from './pages/SafetyPlan';

/** Practice (MF-02): its own chunk, fetched only on its route. */
const LazyPracticePage = lazy(() => import('./pages/Practice').then((m) => ({ default: m.Practice })));
/** The den (Me → Parts of me → See them together): its own chunk, fetched only on its route. */
const LazyPartsDenPage = lazy(() => import('./components/parts/den/PartsDenPage').then((m) => ({ default: m.PartsDenPage })));

function App() {
  return (
    <Routes>
      {/* Auth routes (standalone, no sidebar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Main app with dashboard layout (sidebar + header) */}
      <Route element={<DashboardLayout />}>
        <Route index element={<CheckIn />} />
        <Route path="/insights" element={<Navigate to="/history" replace />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/me/parts/den" element={<Suspense fallback={null}><LazyPartsDenPage /></Suspense>} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/safety/plan" element={<SafetyPlan />} />
        <Route path="/practice" element={<Suspense fallback={null}><LazyPracticePage /></Suspense>} />
      </Route>
    </Routes>
  );
}

export default App;
