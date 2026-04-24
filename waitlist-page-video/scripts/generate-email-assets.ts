import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const publicDir = join(process.cwd(), "public");
const outDir = join(publicDir, "email-assets");

async function main() {
  const [logoSvg, owlSvg, componentSvg] = await Promise.all([
    readFile(join(publicDir, "logo.svg")),
    readFile(join(publicDir, "Low-Poly Owl 2.svg")),
    readFile(join(publicDir, "trenchers-component.svg")),
  ]);

  const wordmark = await sharp(logoSvg, { density: 384 })
    .resize({ height: 60 })
    .png()
    .toBuffer();
  const wordmarkMeta = await sharp(wordmark).metadata();
  const wordW = wordmarkMeta.width ?? 355;
  const wordH = wordmarkMeta.height ?? 60;

  const padX = 28;
  const padY = 18;
  const radius = 24;
  const badgeW = wordW + padX * 2;
  const badgeH = wordH + padY * 2;
  const badgeBgSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${badgeW}" height="${badgeH}"><rect width="${badgeW}" height="${badgeH}" rx="${radius}" ry="${radius}" fill="#000000"/></svg>`,
  );

  const [logoPng, owlPng, componentJpg] = await Promise.all([
    sharp(badgeBgSvg)
      .composite([{ input: wordmark, top: padY, left: padX }])
      .png()
      .toBuffer(),
    sharp(owlSvg, { density: 192 })
      .resize({ width: 600 })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer(),
    sharp(componentSvg, { density: 144 })
      .resize({ width: 900 })
      .flatten({ background: "#070707" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer(),
  ]);

  await Promise.all([
    writeFile(join(outDir, "welcome-logo.png"), logoPng),
    writeFile(join(outDir, "welcome-owl.png"), owlPng),
    writeFile(join(outDir, "welcome-component.jpg"), componentJpg),
  ]);

  console.log("Wrote:");
  console.log(`  welcome-logo.png (${logoPng.length} bytes)`);
  console.log(`  welcome-owl.png (${owlPng.length} bytes)`);
  console.log(`  welcome-component.jpg (${componentJpg.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
