// Thin wrapper over the GitHub Contents API using native fetch (no octokit dependency).
const OWNER = 'tykjh';
const REPO = 'prediction';
const BRANCH = 'main';
const API = 'https://api.github.com';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.LOTTERY_BOT_GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function getFile(path) {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`GitHub GET ${path} failed: ${res.status}`);
  }
  const json = await res.json();
  const content = JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
  return { content, sha: json.sha };
}

export async function putFile(path, newContentArray, sha, message) {
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
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub PUT ${path} failed: ${res.status} ${errText}`);
  }
  return res.json();
}
