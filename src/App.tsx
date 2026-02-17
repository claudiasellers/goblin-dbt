import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { CheckIn } from './pages/CheckIn';
import { Tools } from './pages/Tools';
import { History } from './pages/History';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { CategoryPage } from './pages/CategoryPage';
import { ToolPage } from './pages/ToolPage';
import { Profile } from './pages/Profile';

function App() {
  return (
    <Routes>
      {/* Auth routes (standalone, no sidebar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Main app with dashboard layout (sidebar + header) */}
      <Route element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
      </Route>
    </Routes>
  );
}

export default App;
