import fs from 'node:fs';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpSemver(version, bump) {
  const { major, minor, patch } = parseSemver(version);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unsupported bump type: ${bump}`);
}

function replaceFirst(text, pattern, replacer, description) {
  if (!pattern.test(text)) {
    throw new Error(`Failed to update ${description}`);
  }
  pattern.lastIndex = 0;
  return text.replace(pattern, replacer);
}

function updateCargoToml(path, newVersion) {
  const raw = fs.readFileSync(path, 'utf8');
  const updated = replaceFirst(
    raw,
    /(^\[package\][\s\S]*?\nversion\s*=\s*")(\d+\.\d+\.\d+)("\n)/m,
    `$1${newVersion}$3`,
    'src-tauri/Cargo.toml package version',
  );
  fs.writeFileSync(path, updated);
}

function updateCargoLock(path, newVersion) {
  const raw = fs.readFileSync(path, 'utf8');
  const updated = replaceFirst(
    raw,
    /(\[\[package\]\]\nname\s*=\s*"tabbed-terminal"\nversion\s*=\s*")(\d+\.\d+\.\d+)("\n)/m,
    `$1${newVersion}$3`,
    'src-tauri/Cargo.lock tabbed-terminal version',
  );
  fs.writeFileSync(path, updated);
}

const bump = process.argv[2];
if (!bump) {
  console.error('Usage: node .github/scripts/bump-version.mjs <major|minor|patch>');
  process.exit(1);
}

const packageJsonPath = 'package.json';
const packageLockPath = 'package-lock.json';
const tauriConfPath = 'src-tauri/tauri.conf.json';
const cargoTomlPath = 'src-tauri/Cargo.toml';
const cargoLockPath = 'src-tauri/Cargo.lock';

const packageJson = readJson(packageJsonPath);
const oldVersion = packageJson.version;
const newVersion = bumpSemver(oldVersion, bump);

packageJson.version = newVersion;
writeJson(packageJsonPath, packageJson);

const packageLock = readJson(packageLockPath);
packageLock.version = newVersion;
if (packageLock.packages && packageLock.packages['']) {
  packageLock.packages[''].version = newVersion;
}
writeJson(packageLockPath, packageLock);

const tauriConf = readJson(tauriConfPath);
tauriConf.version = newVersion;
writeJson(tauriConfPath, tauriConf);

updateCargoToml(cargoTomlPath, newVersion);
updateCargoLock(cargoLockPath, newVersion);

console.log(`Bumped version: ${oldVersion} -> ${newVersion}`);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
}
