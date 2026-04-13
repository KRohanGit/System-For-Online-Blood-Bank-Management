const { execFileSync } = require('child_process');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..').replace(/'/g, "''");

const psCommand = `
$backendRoot = '${backendRoot}'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match [regex]::Escape($backendRoot) -and
    ($_.CommandLine -match 'nodemon\\.js' -or $_.CommandLine -match 'server\\.js')
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
`;

try {
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
    stdio: 'inherit'
  });
} catch (error) {
  if (error.status !== 0) {
    throw error;
  }
}