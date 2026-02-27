const task = process.argv[2] || 'sparkery';
const targetRepo = 'https://github.com/Wendealai/Sparkery';

console.error(
  `[Sparkery migrated] "${task}" is disabled in WendealDashboard.\n` +
    `Use the standalone Sparkery repository instead: ${targetRepo}\n` +
    `Run the command there (example): npm run ${task}`
);

process.exit(1);
