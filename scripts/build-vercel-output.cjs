const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const cwd = process.cwd();

function findRepoRoot(start) {
  let current = path.resolve(start);

  while (true) {
    const hasFrontend = fs.existsSync(path.join(current, 'frontend', 'package.json'));
    const hasBackend = fs.existsSync(path.join(current, 'backend', 'package.json'));
    const hasBuildScript = fs.existsSync(path.join(current, 'scripts', 'build-vercel-output.cjs'));

    if (hasFrontend && hasBackend && hasBuildScript) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find repo root from ${start}`);
    }
    current = parent;
  }
}

const repoRoot = findRepoRoot(cwd);
const projectRoot = cwd;
const frontendDir = path.join(repoRoot, 'frontend');
const backendDir = path.join(repoRoot, 'backend');
const outputRoot = path.join(projectRoot, '.vercel', 'output');
const staticRoot = path.join(outputRoot, 'static');
const functionRoot = path.join(outputRoot, 'functions', 'api', 'index.func');
const legacyServerRoot = path.join(frontendDir, 'dist', 'server');
const legacyNodeModulesRoot = path.join(frontendDir, 'dist', 'node_modules');

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd: options.cwd || repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Required path does not exist: ${from}`);
  }
  const resolvedFrom = path.resolve(from);
  const resolvedTo = path.resolve(to);

  if (resolvedFrom === resolvedTo) {
    return;
  }

  if (resolvedTo.startsWith(`${resolvedFrom}${path.sep}`)) {
    throw new Error(`Cannot copy ${resolvedFrom} into its own subdirectory ${resolvedTo}`);
  }

  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

run('npm', ['run', 'build', '--prefix', frontendDir]);
run('npm', ['run', 'build', '--prefix', backendDir]);
run('npm', ['prune', '--prefix', backendDir, '--omit=dev']);

fs.rmSync(outputRoot, { recursive: true, force: true });
copyDir(path.join(frontendDir, 'dist'), staticRoot);

fs.mkdirSync(functionRoot, { recursive: true });
copyDir(path.join(backendDir, 'dist'), path.join(functionRoot, 'dist'));
copyDir(path.join(backendDir, 'node_modules'), path.join(functionRoot, 'node_modules'));

fs.rmSync(legacyServerRoot, { recursive: true, force: true });
fs.rmSync(legacyNodeModulesRoot, { recursive: true, force: true });
fs.mkdirSync(legacyServerRoot, { recursive: true });
copyDir(path.join(backendDir, 'dist'), path.join(legacyServerRoot, 'dist'));
copyDir(path.join(backendDir, 'node_modules'), path.join(legacyServerRoot, 'node_modules'));
copyDir(path.join(backendDir, 'node_modules'), legacyNodeModulesRoot);

if (fs.existsSync(path.join(backendDir, 'data'))) {
  copyDir(path.join(backendDir, 'data'), path.join(functionRoot, 'data'));
  copyDir(path.join(backendDir, 'data'), path.join(legacyServerRoot, 'data'));
}

fs.writeFileSync(
  path.join(functionRoot, 'index.js'),
  [
    "const appModule = require('./dist/app');",
    'const app = appModule.default || appModule;',
    'module.exports = app;',
    '',
  ].join('\n')
);

fs.writeFileSync(
  path.join(frontendDir, 'dist', 'index.js'),
  [
    "const path = require('path');",
    "const express = require('express');",
    "const appModule = require('./server/dist/app');",
    'const app = appModule.default || appModule;',
    '',
    'app.use(express.static(__dirname));',
    "app.get(/^\\/(?!api\\/|uploads\\/|health$).*/, (_req, res) => {",
    "  res.sendFile(path.join(__dirname, 'index.html'));",
    '});',
    '',
    'module.exports = app;',
    '',
  ].join('\n')
);

copyDir(path.join(frontendDir, 'dist'), path.join(projectRoot, 'frontend', 'dist'));

writeJson(path.join(functionRoot, '.vc-config.json'), {
  runtime: 'nodejs22.x',
  handler: 'index.js',
  launcherType: 'Nodejs',
  shouldAddHelpers: true,
  maxDuration: 30,
});

writeJson(path.join(outputRoot, 'config.json'), {
  version: 3,
  routes: [
    { src: '/api/(.*)', dest: '/api/index' },
    { src: '/health', dest: '/api/index' },
    { src: '/uploads/(.*)', dest: '/api/index' },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' },
  ],
});

console.log(`Vercel Build Output written to ${outputRoot}`);
