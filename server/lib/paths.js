import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const knowledgeDir = path.join(rootDir, "knowledge-base");
export const sourcePdfPath = path.join(rootDir, "化妆品监督管理条例_食品药品监管_中国政府网.pdf");
export const indexPath = path.join(knowledgeDir, "cosmetics-regulation.index.json");
