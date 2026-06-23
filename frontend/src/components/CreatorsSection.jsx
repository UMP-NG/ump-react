import React from "react";

export default function CreatorsSection() {
  const creators = [
    {
      name: "Ikechukwu",
      role: "Chief Executive Officer",
      img: "/images/guy.png",
      about: "Visionary behind UMP — building a trusted student-driven marketplace that empowers every UNILAG student to buy, sell, and thrive on campus.",
    },
    {
      name: "Joba",
      role: "Frontend Engineer",
      img: "/images/guy.png",
      about: "Crafting the interfaces students interact with every day — turning designs into fast, intuitive, and accessible experiences across UMP.",
    },
    {
      name: "Oseni Matthew",
      role: "Fullstack Developer",
      img: "/images/techtide-icon.png",
      about: "Focused on Building Web And Mobile Applications.",
    },
    {
      name: "Prisca",
      role: "Chief Marketing Officer",
      img: "/images/guy.png",
      about: "Driving UMP's growth and visibility across campus — connecting students to the marketplace through strategic campaigns and community building.",
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
