import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="110"
          height="110"
          viewBox="0 0 24 24"
        >
          <defs>
            <linearGradient id="banana" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
          </defs>
          <path
            d="M4 13c3.5-2 8-2 10 2a18.24 18.24 0 0 1 5 5 2.09 2.09 0 0 0-8-5c-4.28.22-7.5 3.3-8 7.5"
            fill="none"
            stroke="url(#banana)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
