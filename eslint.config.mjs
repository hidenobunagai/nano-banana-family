import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: [
      "public/sw.js",
      "public/workbox-*.js",
      "public/fallback-*.js",
    ],
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    files: ["src/components/useProgressSimulation.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
