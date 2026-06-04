const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const cwd = process.cwd();
const cwdHasFrontend = fs.existsSync(path.join(cwd, 'frontend', 'package.json'));
const cwdHasBackend = fs.existsSync(path.join(cwd, 'backend', 'package.json'));

const repoRoot = cwdHasFrontend && cwdHasBackend ? cwd : path.resolve(cwd, '..');
const projectRoot = cwd;
const frontendDir = path.join(repoRoot, 'frontend');
const backendDir = cwdHasBackend ? path.join(cwd, 'backend') : cwd;
const outputRoot = path.join(projectRoot, '.vercel', 'output');
const staticRoot = path.join(outputRoot, 'static');
const functionRoot = path.join(outputRoot, 'functions', 'api', 'index.func');

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

if (fs.existsSync(path.join(backendDir, 'data'))) {
  copyDir(path.join(backendDir, 'data'), path.join(functionRoot, 'data'));
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
