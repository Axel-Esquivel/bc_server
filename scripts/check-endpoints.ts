import http from 'http';

const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}`;
const paths = ['/api/health'];

function checkPath(path: string): Promise<{ path: string; status?: number; error?: string }> {
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

async function run() {
  let hasFailure = false;
  for (const path of paths) {
    const result = await checkPath(path);
    if (result.error) {
      hasFailure = true;
      console.error(`[check:endpoints] ${result.path} -> ERROR ${result.error}`);
      continue;
    }
    const status = result.status ?? 0;
    if (status !== 200) {
      hasFailure = true;
      console.error(`[check:endpoints] ${result.path} -> ${status}`);
    } else {
      console.log(`[check:endpoints] ${result.path} -> ${status}`);
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

void run();
