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

function updateChangelog(path, newVersion, bump, sourcePrNumber, sourcePrTitle) {
  const raw = fs.readFileSync(path, 'utf8');
  const existingHeaderPattern = new RegExp(`^## v${newVersion} - `, 'm');
  if (existingHeaderPattern.test(raw)) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const sourceLine = sourcePrNumber
    ? `- Source merged PR: #${sourcePrNumber}${sourcePrTitle ? ` (${sourcePrTitle})` : ''}.`
    : '- Source merged PR: (not provided).';

  const section = [
    `## v${newVersion} - ${today}`,
    '',
    '### Maintenance',
    `- Automated ${bump} version bump to \`v${newVersion}\`.`,
    sourceLine,
    '',
  ].join('\n');

  const marker = '\n## v';
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) {
    const suffix = raw.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(path, `${raw}${suffix}\n${section}`);
    return;
  }

  const updated = `${raw.slice(0, markerIndex + 1)}${section}${raw.slice(markerIndex + 1)}`;
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
const changelogPath = 'CHANGELOG.md';

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
updateChangelog(
  changelogPath,
  newVersion,
  bump,
  process.env.BUMP_SOURCE_PR_NUMBER,
  process.env.BUMP_SOURCE_PR_TITLE,
);

console.log(`Bumped version: ${oldVersion} -> ${newVersion}`);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
}
