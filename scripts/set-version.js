#!/usr/bin/env node

/**
 * Version management script for Fess KOPF
 *
 * Usage:
 *   npm run version:set 15.4.0-SNAPSHOT  # Set specific version
 *   npm run version:release              # Remove -SNAPSHOT suffix
 *   npm run version:snapshot             # Bump minor version and add -SNAPSHOT
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];
const newVersion = args[1];

const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read current version from package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let version = packageJson.version;

if (command === 'release') {
  // Remove -SNAPSHOT suffix
  if (!version.includes('-SNAPSHOT')) {
    console.error('Error: Current version is not a SNAPSHOT version');
    process.exit(1);
  }
  version = version.replace('-SNAPSHOT', '');
} else if (command === 'snapshot') {
  // Bump minor version and add -SNAPSHOT
  const parts = version.replace('-SNAPSHOT', '').split('.');
  if (parts.length < 3) {
    console.error('Error: Invalid version format. Expected N.M.X');
    process.exit(1);
  }
  parts[1] = parseInt(parts[1], 10) + 1;
  parts[2] = '0';
  version = parts.join('.') + '-SNAPSHOT';
} else if (command && !newVersion) {
  // Single argument is the version to set
  version = command;
} else if (newVersion) {
  // Two arguments: command is ignored, use newVersion
  version = newVersion;
} else {
  console.log('Fess KOPF Version Manager');
  console.log('');
  console.log('Usage:');
  console.log('  npm run version:set <version>  # Set specific version');
  console.log('  npm run version:release        # Remove -SNAPSHOT suffix');
  console.log('  npm run version:snapshot       # Bump minor version and add -SNAPSHOT');
  console.log('');
  console.log('Examples:');
  console.log('  npm run version:set 15.4.0-SNAPSHOT');
  console.log('  npm run version:release');
  console.log('  npm run version:snapshot');
  console.log('');
  console.log('Current version: ' + packageJson.version);
  process.exit(0);
}

// Validate version format
const versionPattern = /^\d+\.\d+\.\d+(-SNAPSHOT)?$/;
if (!versionPattern.test(version)) {
  console.error('Error: Invalid version format. Expected N.M.X or N.M.X-SNAPSHOT');
  process.exit(1);
}

// Update package.json
packageJson.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('Version updated successfully:');
console.log('  package.json: ' + version);
