import React, { useEffect } from "react";
import "../styles/index.css";

export default function Footer() {
  useEffect(() => {
    const el = document.getElementById("pageFooter");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) el.classList.add("visible");
          else el.classList.remove("visible");
        });
      },
      { threshold: 0.05 }
    );

    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <footer id="pageFooter">
      <div className="footer-container">
        <div className="footer-logo">
          <h2>UMP</h2>
          <p>
            University Marketplace — connecting students, products, and
            creativity.
          </p>
        </div>

        <div className="footer-links">
          <h3>Quick Links</h3>
          <ul>
            <li>
              <a href="#">Home</a>
            </li>
            <li>
              <a href="#">Marketplace</a>
            </li>
            <li>
              <a href="#">Creators</a>
            </li>
            <li>
              <a href="#">About Us</a>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h3>Support</h3>
          <ul>
            <li>
              <a href="#">Help Center</a>
            </li>
            <li>
              <a href="#">FAQs</a>
            </li>
            <li>
              <a href="#">Report Issue</a>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h3>Connect</h3>
          <div className="social-icons">
            <a href="#">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#">
              <i className="fab fa-linkedin-in"></i>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        &copy; <span id="year">{new Date().getFullYear()}</span> UMP. All rights
        reserved.
      </div>
    </footer>
  );
}
