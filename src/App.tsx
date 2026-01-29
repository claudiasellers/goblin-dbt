import { Routes, Route } from 'react-router-dom';
import { TabLayout } from './components/TabLayout';
import { Layout } from './components/Layout';
import { CheckIn } from './pages/CheckIn';
import { Tools } from './pages/Tools';
import { History } from './pages/History';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { CategoryPage } from './pages/CategoryPage';
import { ToolPage } from './pages/ToolPage';

function App() {
  return (
    <Routes>
      {/* Auth routes (no tabs) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Main app with tabs */}
      <Route element={<TabLayout />}>
        <Route index element={<CheckIn />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/history" element={<History />} />
      </Route>

      {/* Tool detail routes (use original layout) */}
      <Route element={<Layout />}>
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
      </Route>
    </Routes>
  );
}

export default App;
