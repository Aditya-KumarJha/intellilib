"use client";

import Image from "next/image";

const images = [
  "/images/heroSlider/book-1.jpeg",
  "/images/heroSlider/book-2.jpeg",
  "/images/heroSlider/book-3.jpeg",
  "/images/heroSlider/book-4.webp",
  "/images/heroSlider/book-5.jpeg",
  "/images/heroSlider/book-6.webp",
  "/images/heroSlider/book-7.jpg",
  "/images/heroSlider/book-8.jpg",
  "/images/heroSlider/book-9.jpg",
  "/images/heroSlider/book-10.webp",
];

export default function HeroSlider() {
  return (
    <div className="banner">
      <div className="slider" style={{ ["--quantity" as any]: images.length }}>
        {images.map((src, index) => (
          <div
            key={index}
            className="item"
            style={{ ["--position" as any]: index + 1, position: "absolute" }}
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
