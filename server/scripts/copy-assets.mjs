import { copyFileSync } from "node:fs";

copyFileSync(
  new URL("../knowledge-base.md", import.meta.url),
  new URL("../dist/knowledge-base.md", import.meta.url),
);
