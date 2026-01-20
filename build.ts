
import { spawn } from "child_process";
import fs from "fs";

console.log("🏗️  Building LinkedChain...");

const distDir = "./dist";
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir);

// 1. Generate Type Definitions (.d.ts)
console.log("📝 Generating Types...");
const tsc = spawn("bun", ["x", "tsc", "-p", "tsconfig.build.json"], { stdio: "inherit" });

tsc.on("close", async (code) => {
    if (code !== 0) {
        console.error("❌ Type generation failed.");
        process.exit(1);
    }

    // Rename linked-chain.d.ts to index.d.ts
    if (fs.existsSync(`${distDir}/src/linked-chain.d.ts`)) {
        // tsconfig structure might output to dist/src/... depending on rootDir
        // Let's verify structure or just move files.
        fs.renameSync(`${distDir}/src/linked-chain.d.ts`, `${distDir}/index.d.ts`);
        fs.rmSync(`${distDir}/src`, { recursive: true });
    } else if (fs.existsSync(`${distDir}/linked-chain.d.ts`)) {
        fs.renameSync(`${distDir}/linked-chain.d.ts`, `${distDir}/index.d.ts`);
    }

    // 2. Build ESM (Bun / Modern Node)
    console.log("📦 Building ESM...");
    const esmBuild = await Bun.build({
        entrypoints: ["./src/linked-chain.ts"],
        outdir: distDir,
        target: "bun",
        format: "esm",
        naming: "index.mjs",
        minify: true,
    });

    if (!esmBuild.success) {
        console.error("❌ ESM Build failed:", esmBuild.logs);
        process.exit(1);
    }

    // 3. Build CJS (Legacy Node) using tsc transpilation (simple and reliable for 0 deps)
    console.log("📦 Building CJS...");
    // We use Bun's transpiler or just run tsc? tsc is safer for compliance.
    // Let's use a quick tsc command.
    const cjsTsc = spawn("bun", [
        "x", "tsc", "./src/linked-chain.ts",
        "--module", "commonjs",
        "--target", "es2019",
        "--outDir", distDir,
        "--declaration", "false" // types already made
    ], { stdio: "inherit" });

    cjsTsc.on("close", (code) => {
        if (code !== 0) {
            console.error("❌ CJS Build failed.");
            process.exit(1);
        }

        // Rename linked-chain.js to index.js
        if (fs.existsSync(`${distDir}/linked-chain.js`)) {
            fs.renameSync(`${distDir}/linked-chain.js`, `${distDir}/index.js`);
        }

        console.log("✅ Build Complete!");
    });
});
