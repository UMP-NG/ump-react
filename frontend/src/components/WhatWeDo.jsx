import React from "react";
import "../styles/index.css";

export default function WhatWeDo() {
  const items = [
    {
      icon: "fas fa-store",
      title: "Campus Marketplace",
      text: "A one-stop platform for students to sell, buy, and discover products and services.",
    },
    {
      icon: "fas fa-users",
      title: "Community First",
      text: "We focus on student creators, ensuring a safe, student-driven environment.",
    },
    {
      icon: "fas fa-bolt",
      title: "Fast & Reliable",
      text: "Quick connections with fellow students using smart search and instant messaging.",
    },
  ];

  return (
    <section className="what-we-do">
      <h2>💡 What We Do</h2>
      <p className="section-desc">
        We connect students across campuses, making buying and selling easier,
        safer, and more fun.
      </p>
      <div className="features">
        {items.map((i) => (
          <div key={i.title} className="feature">
            <i className={i.icon}></i>
            <h3>{i.title}</h3>
            <p>{i.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
