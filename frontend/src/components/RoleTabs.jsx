import React, { useState } from "react";
import SellerForm from "./forms/SellerForm";
import ServiceForm from "./forms/ServiceForm";

const RoleTabs = () => {
  const [activeTab, setActiveTab] = useState("seller");

  return (
    <section className="role-selector">
      <div className="tab-bar">
        <button
          className={`tab ${activeTab === "seller" ? "active" : ""}`}
          onClick={() => setActiveTab("seller")}
        >
          Become a Seller
        </button>
        <button
          className={`tab ${activeTab === "service" ? "active" : ""}`}
          onClick={() => setActiveTab("service")}
        >
          Service Provider
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "seller" && <SellerForm />}
        {activeTab === "service" && <ServiceForm />}
      </div>
    </section>
  );
};

export default RoleTabs;
