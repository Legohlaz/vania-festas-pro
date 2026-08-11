import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#006b4f",
          color: "white",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          fontSize: 230,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          letterSpacing: -18,
          width: "100%",
        }}
      >
        VF
      </div>
    ),
    size,
  );
}
