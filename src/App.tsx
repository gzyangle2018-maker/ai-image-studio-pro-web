import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, createContext, useContext } from 'react';
import { api } from './api';
import Login from './pages/Login';
import Hub from './pages/Hub';
import Generate from './pages/Generate';
import Edit from './pages/Edit';
import Chat from './pages/Chat';
import Multimodal from './pages/Multimodal';
import Gallery from './pages/Gallery';
import Knowledge from './pages/Knowledge';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminModels from './pages/admin/Models';
import AdminAgents from './pages/admin/Agents';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

interface User {
  id: number;
  username: string;
  display_name: string | null;
  role: string;
  daily_image_quota?: number;
}

interface AppContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}

export const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-bg-primary text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function RequireAuth({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user } = useContext(AppContext);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !['super_admin', 'admin'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth.me()
      .then((data) => setUser(data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ user, setUser, logout }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={<RequireAuth><Layout><Hub /></Layout></RequireAuth>} />
        <Route path="/generate" element={<RequireAuth><Layout><Generate /></Layout></RequireAuth>} />
        <Route path="/edit" element={<RequireAuth><Layout><Edit /></Layout></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><Layout><Chat /></Layout></RequireAuth>} />
        <Route path="/multimodal" element={<RequireAuth><Layout><Multimodal /></Layout></RequireAuth>} />
        <Route path="/gallery" element={<RequireAuth><Layout><Gallery /></Layout></RequireAuth>} />
        <Route path="/knowledge" element={<RequireAuth><Layout><Knowledge /></Layout></RequireAuth>} />
        <Route path="/admin/*" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
          <Route path="" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="models" element={<AdminModels />} />
          <Route path="agents" element={<AdminAgents />} />
        </Route>
      </Routes>
    </AppContext.Provider>
  );
}
