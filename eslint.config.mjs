import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const clientSurfaceFiles = [
  "src/components/**/*.{ts,tsx}",
  "src/hooks/**/*.{ts,tsx}",
  "src/lib/ui/**/*.{ts,tsx}",
  "src/store/**/*.{ts,tsx}",
];

const serverSurfaceFiles = [
  "src/app/api/**/*.{ts,tsx}",
  "src/app/db/**/*.{ts,tsx}",
  "src/app/services/**/*.{ts,tsx}",
];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
      "react/no-unescaped-entities": "off",
      "prefer-const": "warn",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: clientSurfaceFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/db/**", "@/app/services/**"],
              message:
                "Client/UI modules must not import DB or server service modules. Use an API route or server boundary instead.",
            },
            {
              group: ["pg", "fs", "node:fs", "path", "node:path", "crypto", "node:crypto"],
              message:
                "Client/UI modules must not import Node-only modules. Move this logic behind a server boundary.",
            },
          ],
        },
      ],
    },
  },
  {
    files: serverSurfaceFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/**", "@/hooks/**", "@/store/**", "sonner"],
              message:
                "API, DB, and server service modules must not import UI, hooks, client state, or browser-only libraries.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
