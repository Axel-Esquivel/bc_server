const http = require('http');

const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}`;

function requestJson(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${baseUrl}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode, body: data, json: parsed });
        });
      }
    );

    req.on('error', (error) => {
      resolve({ error: error.message });
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function expectStatus(label, response, expected) {
  if (response.error) {
    console.error(`[check:endpoints] ${label} -> ERROR ${response.error}`);
    return false;
  }

  const expectedList = Array.isArray(expected) ? expected : [expected];
  if (!expectedList.includes(response.status)) {
    const body = response.body ?? '';
    console.error(`[check:endpoints] ${label} -> ${response.status} ${body}`);
    return false;
  }

  console.log(`[check:endpoints] ${label} -> ${response.status}`);
  return true;
}

(async () => {
  let ok = true;

  const anonMe = await requestJson('GET', '/api/auth/me');
  ok = (await expectStatus('GET /api/auth/me (no token)', anonMe, 401)) && ok;

  const anonWorkspaces = await requestJson('GET', '/api/workspaces');
  ok = (await expectStatus('GET /api/workspaces (no token)', anonWorkspaces, 401)) && ok;

  const stamp = Date.now();
  const email = `codex_${stamp}@demo.local`;
  const username = `codex_${stamp}`;
  const password = 'secret123';

  const registerPayload = {
    email,
    name: 'Codex User',
    username,
    password,
  };

  const registerRes = await requestJson('POST', '/api/auth/register', registerPayload);
  ok = (await expectStatus('POST /api/auth/register', registerRes, [200, 201])) && ok;

  const loginPayload = {
    identifier: email,
    password,
  };

  const loginRes = await requestJson('POST', '/api/auth/login', loginPayload);
  ok = (await expectStatus('POST /api/auth/login', loginRes, [200, 201])) && ok;

  const accessToken = loginRes.json?.result?.accessToken;
  if (!accessToken) {
    console.error('[check:endpoints] missing accessToken from login response');
    ok = false;
  }

  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const meRes = await requestJson('GET', '/api/auth/me', null, authHeaders);
  ok = (await expectStatus('GET /api/auth/me (token)', meRes, 200)) && ok;

  const workspacesRes = await requestJson('GET', '/api/workspaces', null, authHeaders);
  ok = (await expectStatus('GET /api/workspaces (token)', workspacesRes, 200)) && ok;

  const createWorkspacePayload = { name: `Workspace ${stamp}` };
  const createWorkspaceRes = await requestJson('POST', '/api/workspaces', createWorkspacePayload, authHeaders);
  ok = (await expectStatus('POST /api/workspaces', createWorkspaceRes, [200, 201])) && ok;

  const workspaceId =
    createWorkspaceRes.json?.result?.id || createWorkspaceRes.json?.result?._id || null;

  if (!workspaceId) {
    console.error('[check:endpoints] missing workspace id from create workspace response');
    ok = false;
  } else {
    const modulesRes = await requestJson(
      'GET',
      `/api/workspaces/${workspaceId}/modules`,
      null,
      authHeaders
    );
    ok = (await expectStatus('GET /api/workspaces/:id/modules (token)', modulesRes, 200)) && ok;
  }

  if (!ok) {
    process.exit(1);
  }
})();
