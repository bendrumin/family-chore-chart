import { execSync } from 'child_process';
import { globSync } from 'glob';
import path from 'path';

/**
 * Playwright global teardown: converts all recorded .webm videos to .mp4
 * using ffmpeg. Runs automatically after every test run.
 *
 * Requires ffmpeg to be installed:  brew install ffmpeg
 */
export default async function globalTeardown() {
  const webmFiles = globSync('test-results/**/*.webm');

  if (webmFiles.length === 0) return;

  let converted = 0;
  for (const webm of webmFiles) {
    const mp4 = webm.replace(/\.webm$/, '.mp4');
    try {
      execSync(
        `ffmpeg -y -i "${webm}" -c:v libx264 -preset fast -crf 22 -movflags +faststart -an "${mp4}"`,
        { stdio: 'pipe' }
      );
      converted++;
    } catch {
      // ffmpeg not installed or conversion failed — skip silently
    }
  }

  if (converted > 0) {
    console.log(`\n🎬 Converted ${converted} video(s) to mp4 in test-results/`);
  }
}
