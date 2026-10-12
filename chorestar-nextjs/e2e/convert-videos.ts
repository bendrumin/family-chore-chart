import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Playwright global teardown:
 * 1. Converts all recorded .webm videos to .mp4
 * 2. Creates a clean-named copy (e.g. kid-login.mp4) in the run folder
 * 3. Converts each to an animated .gif (for embedding on the site)
 *
 * Output per run:
 *   test-results/2026-02-20-18-00-00/
 *     kid-login.mp4           ← clean name
 *     kid-login.gif           ← ready for site
 *     run-routine.mp4
 *     run-routine.gif
 *     kid-login-Kid-Login-.../
 *       video.webm            ← original recording
 *       video.mp4             ← converted
 *
 * Requires ffmpeg:  brew install ffmpeg
 */

// Maps folder-name prefix → clean file name
const PROJECT_NAMES = [
  // Recording projects
  'kid-login',
  'kid-dashboard',
  'run-routine',
  'create-routine',
  'add-edit-child',
  'add-edit-chore',
  'family-settings',
  // Tutorial projects (slow-paced, for how-to videos)
  'tutorial-add-child',
  'tutorial-create-routine',
  'tutorial-kid-login',
  'tutorial-run-routine',
  'tutorial-family-settings',
];

function projectFromFolder(folderName: string): string | null {
  for (const name of PROJECT_NAMES) {
    if (folderName.startsWith(name)) return name;
  }
  return null;
}

export default async function globalTeardown() {
  // Node's own recursive listing: the `glob` package was never a declared
  // dependency, so a fresh install failed this teardown.
  const webmFiles = fs.existsSync('test-results')
    ? (fs.readdirSync('test-results', { recursive: true }) as string[])
        .filter((f) => f.endsWith('.webm'))
        .map((f) => path.join('test-results', f))
    : [];
  if (webmFiles.length === 0) return;

  let converted = 0;

  for (const webm of webmFiles) {
    const subDir = path.dirname(webm);          // .../2026-02-20-.../kid-login-.../
    const runDir = path.dirname(subDir);        // .../2026-02-20-.../
    const folderName = path.basename(subDir);
    const projectName = projectFromFolder(folderName);

    // Step 1: webm → mp4 (inside the original subfolder)
    const mp4 = webm.replace(/\.webm$/, '.mp4');
    try {
      execSync(
        `ffmpeg -y -i "${webm}" -c:v libx264 -preset fast -crf 22 -movflags +faststart -an "${mp4}"`,
        { stdio: 'pipe' }
      );
    } catch {
      continue; // ffmpeg not installed or failed — skip
    }

    converted++;

    if (!projectName) continue;

    // Step 2: copy to clean-named mp4 in the run folder
    const cleanMp4 = path.join(runDir, `${projectName}.mp4`);
    fs.copyFileSync(mp4, cleanMp4);

    // Step 3: convert to GIF (two-pass palette for quality)
    const cleanGif = path.join(runDir, `${projectName}.gif`);
    const palette = path.join(subDir, '_palette.png');
    try {
      // -update 1 required for single-image palette output in ffmpeg 8+
      execSync(
        `ffmpeg -y -i "${cleanMp4}" -vf "fps=8,scale=720:-1:flags=lanczos,palettegen" -update 1 "${palette}"`,
        { stdio: 'pipe' }
      );
      // Two-input filter requires -filter_complex, not -vf
      execSync(
        `ffmpeg -y -i "${cleanMp4}" -i "${palette}" -filter_complex "fps=8,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse" -loop 0 "${cleanGif}"`,
        { stdio: 'pipe' }
      );
      fs.unlinkSync(palette);
    } catch {
      // GIF generation failed — skip silently
    }
  }

  if (converted > 0) {
    console.log(`\n🎬 Converted ${converted} video(s) → mp4 + gif in test-results/`);
  }
}
