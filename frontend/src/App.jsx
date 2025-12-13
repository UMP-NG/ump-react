import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Market from "./pages/Market";
import Services from "./pages/Services";
import Store from "./pages/Store";
import Partner from "./pages/Provider"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/market" element={<Market />} />
      <Route path="/services" element={<Services />} />
      <Route path="/store" element={<Store />} />
      <Route path="/partner" element={<Partner />} />
    </Routes>
  );
}
