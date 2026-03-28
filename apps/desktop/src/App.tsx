import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import LoginPage from './pages/Login';
import MainLayout from './pages/MainLayout';
import ChatPage from './pages/Chat';
import WorkspaceSettingsPage from './pages/WorkspaceSettings';

function App() {
  const { token } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {!token ? (
          <Route path="*" element={<LoginPage />} />
        ) : (
          <>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/workspace/default" replace />} />
              <Route path="workspace/:workspaceSlug" element={<Navigate to="/workspace/:workspaceSlug/channel" replace />} />
              <Route path="workspace/:workspaceSlug/channel" element={<Navigate to="/workspace/:workspaceSlug/channel/general" replace />} />
              <Route path="workspace/:workspaceSlug/channel/:channelId" element={<ChatPage />} />
              <Route path="workspace/:workspaceSlug/settings" element={<WorkspaceSettingsPage />} />
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
