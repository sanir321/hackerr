import type { FC } from "react";

interface UmbraaSVGProps {
  theme: "dark" | "light";
  scale?: number;
}

export const UmbraaSVG: FC<UmbraaSVGProps> = ({ theme, scale = 1 }) => {
  const fillColor = theme === "dark" ? "#fff" : "#000";

  return (
    <svg
      width={189 * scale}
      height={194 * scale}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fillColor}>
        <path d="M256 44 C148 44 60 132 60 240 C60 348 148 436 256 436 C364 436 452 348 452 240 C452 132 364 44 256 44 Z M256 84 C340 84 412 156 412 240 C412 324 340 396 256 396 C172 396 100 324 100 240 C100 156 172 84 256 84 Z" />
        <path d="M160 180 L200 180 L200 300 C200 320 180 340 160 340 Z" />
        <path d="M352 180 L312 180 L312 300 C312 320 332 340 352 340 Z" />
        <path d="M180 300 L220 300 C240 300 256 316 256 336 C256 316 272 300 292 300 L332 300 L332 260 L180 260 Z" />
      </g>
    </svg>
  );
};
