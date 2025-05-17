import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import JoinRoom from "./components/JoinRoom";
// import Room2 from "./pages/Room2";
import { Toaster } from 'sonner';

import Room from "./pages/Room";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors theme="dark" />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<JoinRoom />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
