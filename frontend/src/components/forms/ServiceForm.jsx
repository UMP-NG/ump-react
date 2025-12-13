import React from "react";

import { API_BASE } from "../../utils/api";

const ServiceForm = () => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      // Try registering as service provider
      let res = await fetch(`${API_BASE}/api/users/become/service_provider`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.status === 401 || res.status === 403) {
        // If not logged in, fallback to signup first
        const email = formData.get("email");
        const password = formData.get("password");

        if (!email || !password) {
          alert(
            "Please provide an email and password to create an account first."
          );
          window.location.href = "/Pages/login.html";
          return;
        }

        res = await fetch(`${API_BASE}/api/auth/signup-provider`, {
          method: "POST",
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Service registration failed");

      alert("✅ Service provider account ready!");
      window.location.href = "/Pages/provideranalytics.html";
    } catch (err) {
      console.error("Service registration error:", err);
      alert(err.message);
    }
  };

  return (
    <form className="form-pane" onSubmit={handleSubmit} encType="multipart/form-data">
      <h3 className="form-title">🧰 Offer Your Expertise</h3>

      <div className="form-group animate">
        <input type="text" name="name" placeholder=" " required />
        <label>Your Name or Business Name</label>
      </div>

      <div className="form-group animate">
        <input type="text" name="title" placeholder=" " required />
        <label>Service Title</label>
      </div>

      <div className="form-group animate">
        <input type="text" name="major" placeholder=" " required />
        <label>Service Category</label>
      </div>

      <div className="form-group animate">
        <textarea name="desc" rows="3" placeholder=" "></textarea>
        <label>Short Description</label>
      </div>

      <div className="form-group animate">
        <textarea name="about" rows="3" placeholder=" " required></textarea>
        <label>Detailed About You / Your Service</label>
      </div>

      <div className="form-group animate">
        <input type="number" name="rate" placeholder=" " required />
        <label>Service Rate</label>
      </div>

      <div className="form-group animate">
        <select name="currency">
          <option value="NGN" defaultValue>NGN</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        <label>Currency</label>
      </div>

      <div className="form-group animate">
        <select name="package">
          <option value="">Select Package</option>
          <option value="Basic">Basic</option>
          <option value="Standard">Standard</option>
          <option value="Premium">Premium</option>
        </select>
        <label>Service Package</label>
      </div>

      <div className="form-group animate">
        <input type="number" name="duration" placeholder=" " />
        <label>Duration (hours/days)</label>
      </div>

      <div className="form-group animate">
        <input type="text" name="certifications" placeholder=" " />
        <label>Certifications (comma-separated)</label>
      </div>

      <div className="form-group animate">
        <input type="text" name="portfolio" placeholder=" " />
        <label>Portfolio Links (comma-separated)</label>
      </div>

      <div className="form-group animate">
        <input type="text" name="policies" placeholder=" " />
        <label>Policies (comma-separated)</label>
      </div>

      <div className="form-group animate availability-group">
        <label className="availability-label">Time Slots</label>
        <div className="availability-options">
          <input type="checkbox" name="timeSlots" value="Morning" />
          <label>🌅 Morning</label>

          <input type="checkbox" name="timeSlots" value="Afternoon" />
          <label>🌞 Afternoon</label>

          <input type="checkbox" name="timeSlots" value="Evening" />
          <label>🌙 Evening</label>
        </div>
      </div>

      <div className="form-group animate">
        <label>Currently Available?</label>
        <input type="checkbox" name="available" defaultChecked />
      </div>

      <div className="form-group file-upload animate">
        <label>Upload a Service Image</label>
        <input type="file" name="image" accept="image/*" />
      </div>

      <div className="form-group animate">
        <input type="text" name="tags" placeholder=" " />
        <label>Tags (comma-separated)</label>
      </div>

      <button type="submit" className="btn">
        Submit Provider Application
      </button>
    </form>
  );
};

export default ServiceForm;
