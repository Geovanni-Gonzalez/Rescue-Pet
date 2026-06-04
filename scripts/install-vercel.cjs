const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function findRepoRoot(start) {
  let current = path.resolve(start);

  while (true) {
    const hasFrontend = fs.existsSync(path.join(current, 'frontend', 'package.json'));
    const hasBackend = fs.existsSync(path.join(current, 'backend', 'package.json'));
    const hasScripts = fs.existsSync(path.join(current, 'scripts'));

    if (hasFrontend && hasBackend && hasScripts) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find repo root from ${start}`);
    }
    current = parent;
  }
}

function run(command, args) {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

const repoRoot = findRepoRoot(process.cwd());

run('npm', ['install', '--prefix', path.join(repoRoot, 'frontend'), '--include=dev']);
run('npm', ['install', '--prefix', path.join(repoRoot, 'backend'), '--include=dev']);
