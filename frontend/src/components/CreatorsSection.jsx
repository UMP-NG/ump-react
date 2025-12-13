import React from "react";

export default function CreatorsSection() {
  const creators = [
    {
      name: "Ikechukwu",
      role: "Chief Executive Officer",
      img: "/images/guy.png",
      about: "Lorem ipsum dolor sit amet consectetur.",
    },
    {
      name: "Joba",
      role: "Frontend Engineer",
      img: "/images/guy.png",
      about: "Lorem ipsum dolor sit, amet consectetur.",
    },
    {
      name: "Oseni Matthew",
      role: "Fullstack Developer",
      img: "/images/techtide-icon.png",
      about: "Focused on Building Web And Mobile Applications.",
    },
  ];

  return (
    <section className="creators-section">
      <h2>🌟 Featured Student Creators</h2>
      <div className="creators-container">
        {creators.map((c) => (
          <div key={c.name} className="creator-card">
            <div className="card-inner">
              <div className="card-front">
                <img src={c.img} alt={c.name} />
                <h3>{c.name}</h3>
                <p>{c.role}</p>
              </div>
              <div className="card-back">
                <h4>About {c.name}</h4>
                <p>{c.about}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
