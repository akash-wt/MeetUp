import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/dashboard";
import Login from "./components/login";
import { Toaster } from 'sonner';
import PrivateRoute from "./utils/PrivateRoute";
import SessionManager from "./utils/SessionManager";

import Room from "./pages/Room";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors theme="dark" />
      <SessionManager />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
          </Route>
          <Route path="/room/:roomId" element={<Room />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
