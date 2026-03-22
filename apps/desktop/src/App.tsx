import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import LoginPage from './pages/Login';
import MainLayout from './pages/MainLayout';
import ChatPage from './pages/Chat';

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
              <Route index element={<ChatPage />} />
              <Route path="channel/:channelId" element={<ChatPage />} />
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
