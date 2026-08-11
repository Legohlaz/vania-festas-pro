import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#006b4f",
          color: "white",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          fontSize: 82,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          letterSpacing: -6,
          width: "100%",
        }}
      >
        VF
      </div>
    ),
    size,
  );
}
