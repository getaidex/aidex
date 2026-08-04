import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

function copyFixtures() {
  const examples = fs.readdirSync(srcDir).filter(
    (name) => fs.statSync(path.join(srcDir, name)).isDirectory()
  );

  for (const example of examples) {
    const srcFixtures = path.join(srcDir, example, 'fixtures');
    if (fs.existsSync(srcFixtures)) {
      const distFixtures = path.join(distDir, example, 'fixtures');
      fs.cpSync(srcFixtures, distFixtures, { recursive: true, force: true });
    }
  }
}

copyFixtures();
