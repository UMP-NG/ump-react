import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import AlreadyRegistered from "../components/AlreadyRegistered";
import RoleTabs from "../components/RoleTabs";
import Footer from "../components/Footer";
import "../styles/provider.css";

function App() {
  return (
    <div>
      <Navbar />
      <Hero />
      <RoleTabs />
      <AlreadyRegistered />
      <Footer />
    </div>
  );
}

export default App;
