import React from "react";
import { API_BASE } from "../../utils/api";

const SellerForm = () => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const res = await fetch(`${API_BASE}/api/users/become/seller`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Registration failed");

      alert("✅ Seller registration successful!");
      window.location.href = "/Pages/analytics.html";
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <form className="form-pane active" onSubmit={handleSubmit}>
      <h3 className="form-title">🚀 Launch Your Store</h3>

      <div className="form-group animate">
        <input type="text" name="name" required placeholder=" " />
        <label>Store Name *</label>
      </div>
      <div className="form-group animate">
        <input type="text" name="businessName" placeholder=" " />
        <label>Business Name</label>
      </div>
      <div className="form-group animate">
        <textarea name="bio" rows="3" placeholder=" "></textarea>
        <label>About / Bio</label>
      </div>
      <div className="form-group file-upload animate">
        <label className="file-label">Store Banner Image</label>
        <input type="file" name="banner" accept="image/*" />
      </div>
      <div className="form-group file-upload animate">
        <label className="file-label">Store Logo / Avatar</label>
        <input type="file" name="logo" accept="image/*" />
      </div>
      <div className="form-group animate">
        <input type="text" name="category" required placeholder=" " />
        <label>Product Category *</label>
      </div>
      <div className="form-group animate">
        <textarea name="description" rows="4" placeholder=" "></textarea>
        <label>Store Description</label>
      </div>
      <div className="form-group animate">
        <input type="text" name="location" required placeholder=" " />
        <label>Store Location *</label>
      </div>

      <button type="submit" className="btn">
        Submit Seller Application
      </button>
    </form>
  );
};

export default SellerForm;
