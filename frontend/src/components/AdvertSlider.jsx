import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function AdvertSlider() {
  const trackRef = useRef(null);
  const wrapperRef = useRef(null);
  const intervalRef = useRef(null);

  const slideWidthRef = useRef(0);
  const offsetRef = useRef(0);

  // Touch/swipe handling
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);

  const slides = [
    { title: "Have You Heard Of UMP", img: "/images/ump-banner.svg" },
    { title: "Our Delivery System", img: "/images/walker.jpg" },
    { title: "Download Online Receipt", img: "/images/receipt.jpg" },
    { title: "How We Keep Your Money Safe", img: "/images/escrow.jpg" },
    { title: "How To Become UMP No. 1 Seller", img: "/images/no1-seller.jpeg" },
  ];

  // clones in DATA, not DOM
  const sliderSlides = [slides[slides.length - 1], ...slides, slides[0]];

  const [currentIndex, setCurrentIndex] = useState(1);

  /* Measure once (layout-safe, no state) */
  useLayoutEffect(() => {
    const slide = trackRef.current?.children[0];
    const wrapper = wrapperRef.current;
    if (!slide || !wrapper) return;

    const style = window.getComputedStyle(slide);
    const margin =
      parseFloat(style.marginLeft) + parseFloat(style.marginRight);

    slideWidthRef.current =
      slide.getBoundingClientRect().width + margin;

    offsetRef.current =
      (wrapper.getBoundingClientRect().width -
        slideWidthRef.current) /
      2;
  }, []);

  /* Auto slide — faster interval (3s instead of 4s) */
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((i) => i + 1);
    }, 3000);

    return () => clearInterval(intervalRef.current);
  }, []);

  /* Infinite loop without snapping */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleTransitionEnd = () => {
      if (currentIndex === sliderSlides.length - 1) {
        track.style.transition = "none";
        setCurrentIndex(1);
        requestAnimationFrame(() => {
          track.style.transition = "transform 0.4s ease-in-out";
        });
      }

      if (currentIndex === 0) {
        track.style.transition = "none";
        setCurrentIndex(sliderSlides.length - 2);
        requestAnimationFrame(() => {
          track.style.transition = "transform 0.4s ease-in-out";
        });
      }
    };

    track.addEventListener("transitionend", handleTransitionEnd);
    return () =>
      track.removeEventListener("transitionend", handleTransitionEnd);
  }, [currentIndex, sliderSlides.length]);

  /* Apply transform */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    track.style.transform = `translateX(${
      -currentIndex * slideWidthRef.current + offsetRef.current
    }px)`;
  }, [currentIndex]);

  const handleDotClick = (i) => setCurrentIndex(i + 1);

  // Swipe handlers
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches?.[0]?.clientX || 0;
    // Reset auto-advance timer on touch
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCurrentIndex((i) => i + 1);
      }, 3000);
    }
  };

  const handleTouchEnd = (e) => {
    touchEndRef.current = e.changedTouches?.[0]?.clientX || 0;
    const diff = touchStartRef.current - touchEndRef.current;
    const threshold = 50; // swipe distance threshold

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left → next slide
        setCurrentIndex((i) => i + 1);
      } else {
        // Swipe right → previous slide
        setCurrentIndex((i) => i - 1);
      }
    }
  };

  return (
    <section className="advert-slider">
      <div className="slider-wrapper" ref={wrapperRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="slider-track" ref={trackRef}>
          {sliderSlides.map((slide, i) => (
            <div className="slide box" key={i}>
              <h3>{slide.title}</h3>
              <img src={slide.img} alt={slide.title} />
            </div>
          ))}
        </div>

        <div className="slider-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={currentIndex - 1 === i ? "active" : ""}
              onClick={() => handleDotClick(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
