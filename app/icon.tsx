import { ImageResponse } from "next/og";
import { UmbraaSVG } from "@/components/icons/umbraa-svg";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <UmbraaSVG theme="dark" scale={0.16} />
      </div>
    ),
    {
      ...size,
    }
  );
}
