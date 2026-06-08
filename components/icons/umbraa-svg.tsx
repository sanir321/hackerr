import React from "react";

/**
 * Umbraa Logo Component
 * A modern, minimal logo representing "Umbra" (shadow/protection) with an abstract U/shield shape.
 */
export const UmbraaSVG: React.FC<{
  className?: string;
  theme?: "light" | "dark";
  scale?: number;
}> = ({ className, theme = "dark", scale = 1 }) => {
  const primaryColor = theme === "dark" ? "#FFFFFF" : "#000000";
  const accentColor = "#615EEB"; // Primary brand purple

  return (
    <svg
      width={200 * scale}
      height={200 * scale}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Abstract Shield/U Shape */}
      <path
        d="M50 40C50 34.4772 54.4772 30 60 30H140C145.523 30 150 34.4772 150 40V110C150 137.614 127.614 160 100 160C72.3858 160 50 137.614 50 110V40Z"
        fill={accentColor}
        fillOpacity="0.15"
      />
      <path
        d="M70 30V110C70 126.569 83.4315 140 100 140C116.569 140 130 126.569 130 110V30"
        stroke={accentColor}
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M100 70V140"
        stroke={primaryColor}
        strokeWidth="16"
        strokeLinecap="round"
      />
      {/* Inner Dot */}
      <circle cx="100" cy="110" r="12" fill={accentColor} />
    </svg>
  );
};
