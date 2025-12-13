import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      icon: "fas fa-user-plus",
      title: "1. Sign Up",
      text: "Create your free student account in seconds.",
    },
    {
      icon: "fas fa-upload",
      title: "2. Post or Browse",
      text: "List your products/services or browse what’s available.",
    },
    {
      icon: "fas fa-comments",
      title: "3. Connect",
      text: "Chat directly with students and negotiate deals.",
    },
    {
      icon: "fas fa-handshake",
      title: "4. Meet & Trade",
      text: "Close the deal in a safe, campus-friendly way.",
    },
  ];

  return (
    <section>
      <h2>⚙️ How It Works</h2>
      <p className="section-desc">
        Getting started on UMP is simple and seamless. Here’s how:
      </p>
      <div className="features">
        {steps.map((s) => (
          <div key={s.title} className="feature">
            <i className={s.icon}></i>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
