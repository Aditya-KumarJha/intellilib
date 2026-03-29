"use client";
import { useState } from "react";
import HoverExpand from "@/components/ui/hover-expand";

export const stories = [
  {
    id: 1,
    title: "AI Book Discovery",
    description:
      "Ask the AI assistant for recommendations and instantly discover relevant books based on your interests.",
    image: "/images/testimonials/testimonial-1.png",
  },
  {
    id: 2,
    title: "Smart Search",
    description:
      "Find books by title, author, or category with real-time suggestions and availability status.",
    image: "/images/testimonials/testimonial-2.png",
  },
  {
    id: 3,
    title: "Book Issue & Tracking",
    description:
      "Issue books digitally and track due dates with real-time updates and reminders.",
    image: "/images/testimonials/testimonial-3.png",
  },
  {
    id: 4,
    title: "Admin Dashboard",
    description:
      "Manage books, users, and transactions through a powerful and intuitive dashboard.",
    image: "/images/testimonials/testimonial-4.png",
  },
  {
    id: 5,
    title: "Fine Management",
    description:
      "Automatic fine calculation with clear tracking and instant payment options.",
    image: "/images/testimonials/testimonial-5.png",
  },
  {
    id: 6,
    title: "Digital Payments",
    description:
      "Pay fines seamlessly with integrated Razorpay and get instant confirmation.",
    image: "/images/testimonials/testimonial-6.png",
  },
  {
    id: 7,
    title: "Real-Time Updates",
    description:
      "Stay updated with book availability, requests, and activity across the system.",
    image: "/images/testimonials/testimonial-7.png",
  },
  {
    id: 8,
    title: "Smart Notifications",
    description:
      "Receive alerts for due dates, fines, and book requests in real time.",
    image: "/images/testimonials/testimonial-8.png",
  },
];

export default function SuccessStories() {
  const [hoveredIndex, setHoveredIndex] = useState(0);

  return (
    <section className="relative p-16">
      <div className="container sm:mx-4 md:mx-auto md:px-6 text-center relative z-10">
        
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Experience IntelliLib
        </h2>

        <p className="text-foreground mb-4">
          From AI-powered discovery to seamless book management and payments, <br className="hidden md:block" />
          explore how IntelliLib transforms traditional libraries into intelligent systems.
        </p>

        <HoverExpand
          images={stories.map((s) => s.image)}
          maxThumbnails={stories.length}
          thumbnailHeight={220}
          modalImageSize={420}
          onHover={(index) => setHoveredIndex(index)}
        />

        <div className="mt-6 max-w-2xl mx-auto">
          <h3 className="text-foreground font-semibold mb-2">
            {stories[hoveredIndex].title}
          </h3>
          <p className="text-lg text-foreground">
            {stories[hoveredIndex].description}
          </p>
        </div>
      </div>
    </section>
  );
}
