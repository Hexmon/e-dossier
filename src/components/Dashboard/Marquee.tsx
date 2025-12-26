"use client";

import { cn } from "@/lib/utils";

interface MarqueeProps {
  data: string[];
  speed?: number;
  className?: string;
}

const Marquee = ({ data, speed = 10, className }: MarqueeProps) => {
  // Create a much longer duplicated array for smoother infinite loop
  const extendedData = Array.from({ length: 1 }, () => data).flat();

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-[#ffff00] py-3 w-full",
        className
      )}
    >
      {/* Fade effect on left edge */}
      {/* <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-blue-500 to-transparent z-10 pointer-events-none" /> */}
      
      {/* Fade effect on right edge */}
      {/* <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-blue-500 to-transparent z-10 pointer-events-none" /> */}
      
      {/* Marquee content - continuous scrolling */}
      <div 
        className="flex gap-8 whitespace-nowrap"
        style={{
          animation: `scrollRightToLeft ${speed}s linear infinite`,
        }}
      >
        {/* Extended set for seamless continuous loop */}
        {extendedData.map((item, index) => (
          <span
            key={index}
            className="text-sm font-semibold text-black inline-block shrink-0"
          >
            {item}
          </span>
        ))}
      </div>
      
      <style jsx global>{`
        @keyframes scrollRightToLeft {
          0% {
            transform: translateX(100%);   
          }
          100% {
            transform: translateX(-100%);   
          }
        }
      `}</style>
    </div>
  );
};

export default Marquee;