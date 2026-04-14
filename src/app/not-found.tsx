"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      
      <div
        onClick={() => router.push("/")}
        className={`cursor-pointer transition-all duration-1000 ease-out ${
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <Image
          src="/images/Not-Found.svg"
          alt="Page Not Found"
          width={1200}
          height={1200}
          priority
          className="w-[90vw] h-[90vh] object-contain animate-float"
        />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />
    </div>
  );
}
