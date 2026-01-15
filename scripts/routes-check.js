const http = require('http');

const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}`;
const paths = ['/api/health', '/api/setup/status'];

function checkPath(path) {
  return new Promise((resolve) => {
    const req = http.get(`${baseUrl}${path}`, (res) => {
      res.resume();
      resolve({ path, status: res.statusCode });
    });
    req.on('error', (error) => {
      resolve({ path, error: error.message });
    });
  });
}

(async () => {
  for (const path of paths) {
    const result = await checkPath(path);
    if (result.error) {
      console.log(`[routes:check] ${result.path} -> ERROR ${result.error}`);
    } else {
      console.log(`[routes:check] ${result.path} -> ${result.status}`);
    }
  }
})();
