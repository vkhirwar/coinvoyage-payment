"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ThemeTrigger() {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on the theme-builder page itself
  if (pathname === "/theme-builder") {
    return null;
  }

  const handleClick = () => {
    router.push("/theme-builder");
  };

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      {/* Tooltip */}
      <div
        className={`
          absolute bottom-full right-0 mb-3 px-3 py-1.5
          bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50
          rounded-lg text-sm text-white whitespace-nowrap
          transition-all duration-200 pointer-events-none
          ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
        `}
      >
        Customize Theme
        {/* Tooltip arrow */}
        <div className="absolute top-full right-4 border-4 border-transparent border-t-zinc-900/95" />
      </div>

      {/* FAB Button */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          group relative w-14 h-14 rounded-full
          bg-gradient-to-br from-zinc-800/80 to-zinc-900/90
          backdrop-blur-md border border-zinc-700/50
          shadow-lg shadow-black/20
          flex items-center justify-center
          transition-all duration-300 ease-out
          hover:scale-110 hover:border-zinc-600/70
          hover:shadow-xl hover:shadow-purple-500/10
          active:scale-95
          focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900
        `}
        aria-label="Customize Theme"
      >
        {/* Glow effect on hover */}
        <div
          className={`
            absolute inset-0 rounded-full
            bg-gradient-to-br from-purple-500/20 to-pink-500/20
            transition-opacity duration-300
            ${isHovered ? "opacity-100" : "opacity-0"}
          `}
        />

        {/* Paintbrush/Wand Icon */}
        <svg
          className={`
            w-6 h-6 text-zinc-300 relative z-10
            transition-all duration-300
            group-hover:text-white group-hover:rotate-12
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          {/* Magic wand / paintbrush icon */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
          />
        </svg>

        {/* Animated ring */}
        <div
          className={`
            absolute inset-0 rounded-full
            border-2 border-purple-400/30
            transition-all duration-500
            ${isHovered ? "scale-125 opacity-0" : "scale-100 opacity-0"}
          `}
        />
      </button>
    </div>
  );
}
