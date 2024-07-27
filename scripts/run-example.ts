import spawn from 'spawn-please'

if (!process.argv[2] || !process.argv[2].trim()) {
  console.error("Script name is required.");
  process.exit(0);
}

const { stdout, stderr } = await spawn('tsx', [`./examples/${process.argv[2]}`]);

if (stdout) {
  console.log(stdout);
}

if (stderr) {
  console.error(stderr);
}