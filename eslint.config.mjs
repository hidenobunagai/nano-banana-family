import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: ["coverage/**"],
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default config;
