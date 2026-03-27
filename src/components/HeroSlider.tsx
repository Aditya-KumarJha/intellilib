"use client";

import Image from "next/image";
import "../styles/style.css";

const images = [
  "/images/dragon_1.jpg",
  "/images/dragon_2.jpg",
  "/images/dragon_3.jpg",
  "/images/dragon_4.jpg",
  "/images/dragon_5.jpg",
  "/images/dragon_6.jpg",
  "/images/dragon_7.jpg",
  "/images/dragon_8.jpg",
  "/images/dragon_9.jpg",
  "/images/dragon_10.jpg",
];

export default function HeroSlider() {
  return (
    <div className="banner">
      <div className="slider" style={{ ["--quantity" as any]: images.length }}>
        {images.map((src, index) => (
          <div
            key={index}
            className="item"
            style={{ ["--position" as any]: index + 1 }}
          >
            <Image
              src={src}
              alt={`slider-${index}`}
              fill
              sizes="200px"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="content">
        <h1 data-content="SMART LIBRARY">SMART LIBRARY</h1>

        <div className="author">
          <h2>IntelliLib</h2>
          <p>
            <b>AI Powered Library</b>
          </p>
          <p>Discover, search, and explore books with AI.</p>
        </div>

        <div className="model" />
      </div>
    </div>
  );
}
