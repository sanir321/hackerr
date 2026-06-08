import { ImageResponse } from "next/og";
import { UmbraaSVG } from "@/components/icons/umbraa-svg";

export const size = {
  width: 180,
  height: 180,
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
          background: "#09090b", // Dark background for the app icon
        }}
      >
        <UmbraaSVG theme="dark" scale={0.7} />
      </div>
    ),
    {
      ...size,
    }
  );
}
