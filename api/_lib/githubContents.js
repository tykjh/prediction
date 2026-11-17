// Thin wrapper over the GitHub Contents API using native fetch (no octokit dependency).
//
// The token (LOTTERY_BOT_GITHUB_TOKEN) should be a fine-grained token limited
// to this one repository with "Contents: read and write" and nothing else.
const OWNER = 'tykjh';
const REPO = 'prediction';
const BRANCH = 'main';
const API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 15000;

// Only the three history files may ever be read or written through here.
const ALLOWED_PATHS = new Set([
  'src/data/history.json',
  'src/data/history_superlotto.json',
  'src/data/history_539.json',
]);

function assertAllowed(path) {
  if (!ALLOWED_PATHS.has(path)) {
    throw new Error('Refusing to touch a file outside the history data');
  }
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.LOTTERY_BOT_GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function getFile(path) {
  assertAllowed(path);
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`GitHub GET ${path} failed: ${res.status}`);
  }
  const json = await res.json();
  const content = JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
  return { content, sha: json.sha };
}

export async function putFile(path, newContentArray, sha, message) {
  assertAllowed(path);
  const body = {
    message,
    content: Buffer.from(JSON.stringify(newContentArray, null, 4) + '\n', 'utf-8').toString('base64'),
    sha,
    branch: BRANCH,
  };
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    // The response body is deliberately not included: it can be long and is
    // passed on to the caller of the endpoint.
    throw new Error(`GitHub PUT ${path} failed: ${res.status}`);
  }
  return res.json();
}
