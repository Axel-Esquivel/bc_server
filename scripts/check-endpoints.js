const http = require('http');

const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}`;
const paths = ['/api/health', '/api/setup/status'];

function checkPath(path) {
  return new Promise((resolve) => {
    const req = http.get(`${baseUrl}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        resolve({ path, status: res.statusCode, body });
      });
    });
    req.on('error', (error) => {
      resolve({ path, error: error.message });
    });
  });
}

(async () => {
  let hasFailure = false;
  for (const path of paths) {
    const result = await checkPath(path);
    if (result.error) {
      hasFailure = true;
      console.error(`[check:endpoints] ${result.path} -> ERROR ${result.error}`);
      continue;
    }
    const status = result.status ?? 0;
    const body = result.body ?? '';
    if (status !== 200) {
      hasFailure = true;
      console.error(`[check:endpoints] ${result.path} -> ${status} ${body}`);
    } else {
      console.log(`[check:endpoints] ${result.path} -> ${status} ${body}`);
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
})();
