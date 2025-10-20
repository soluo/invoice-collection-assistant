import React from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  return (
    <div className="relative group flex items-center">
      {children}
      <div
        className={`
          absolute w-max bg-gray-800 text-white text-xs rounded-md px-2 py-1 
          opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10
          ${positionClasses[side]}
        `}
      >
        {content}
      </div>
    </div>
  );
}
