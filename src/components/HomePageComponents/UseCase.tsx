"use client";

import MinimalCard, {
  MinimalCardDescription,
  MinimalCardImage,
  MinimalCardTitle,
} from "@/components/ui/minimal-card";
import BadgeButton from "@/components/ui/badge-button";

const UseCase = () => {
  const cards = [
    {
      title: "For Students",
      description:
        "Discover, issue, and track books with AI-powered search and real-time updates.",
      src: "/images/giphy/giphy-1.gif",
      alt: "A student using AI search to explore and manage books",
    },
    {
      title: "For Librarians",
      description:
        "Manage books, users, and transactions with real-time tracking and analytics.",
      src: "/images/giphy/giphy-1.gif",
      alt: "A librarian managing library operations through a dashboard",
    },
    {
      title: "Smart Library",
      description:
        "AI recommendations, automated fines, and seamless digital payments.",
      src: "/images/giphy/giphy-1.gif",
      alt: "An AI-powered library system with smart features and payments",
    },
  ];

  return (
    <div className="py-10">
      <div className="sm:w-[90%] md:w-full lg:w-[75%] rounded-3xl shadow mx-auto">
        <div className="p-6 rounded-3xl mx-auto border border-neutral-200/70 bg-white/70 shadow-sm backdrop-blur dark:border-neutral-700/70 dark:bg-neutral-900/60">
          <BadgeButton>Use Cases</BadgeButton>

          <div className="flex flex-col md:flex-row justify-center items-start gap-6 mt-6">
            {cards.map((card, key) => (
              <MinimalCard
                key={key}
                className="w-full md:w-1/3 rounded-2xl border border-neutral-200/70 bg-[#F0F0F0] text-neutral-900 shadow-md transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:bg-white hover:text-neutral-900 dark:border-neutral-700/70 dark:bg-[#2a2a2a] dark:text-neutral-100 dark:hover:bg-black dark:hover:text-white"
              >
                <MinimalCardImage
                  className="h-45 w-full object-cover rounded-t-2xl"
                  src={card.src}
                  alt={card.alt}
                />
                <MinimalCardTitle className="group-hover:text-neutral-900 dark:group-hover:text-white">
                  {card.title}
                </MinimalCardTitle>
                <MinimalCardDescription className="group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                  {card.description}
                </MinimalCardDescription>
              </MinimalCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCase;
