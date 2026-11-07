const { Octokit } = require('@octokit/rest');

let octokit = null;
let currentToken = null;

function setToken(token) {
  currentToken = token;
  octokit = token ? new Octokit({ auth: token }) : null;
}

async function getUser() {
  if (!octokit) throw new Error('GitHub token not set');
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

async function listRepos() {
  if (!octokit) throw new Error('GitHub token not set');
  const { data } = await octokit.repos.listForAuthenticatedUser({ per_page: 100, sort: 'updated' });
  return data.map(r => ({
    full_name: r.full_name,
    name: r.name,
    private: r.private,
    default_branch: r.default_branch,
    html_url: r.html_url
  }));
}

async function getRepo(owner, repo) {
  if (!octokit) throw new Error('GitHub token not set');
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
}

async function createOrUpdateFile(owner, repo, path, content, message, branch = 'main', sha = null) {
  if (!octokit) throw new Error('GitHub token not set');
  const contentB64 = Buffer.from(content).toString('base64');
  const params = {
    owner, repo, path, message,
    content: contentB64,
    branch
  };
  if (sha) params.sha = sha;
  const { data } = await octokit.repos.createOrUpdateFileContents(params);
  return data;
}

async function getFileSha(owner, repo, path, branch = 'main') {
  if (!octokit) return null;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    return data.sha;
  } catch {
    return null;
  }
}

async function pushFile(owner, repo, path, content, message, branch = 'main') {
  const sha = await getFileSha(owner, repo, path, branch);
  return createOrUpdateFile(owner, repo, path, content, message, branch, sha);
}

module.exports = { setToken, getUser, listRepos, getRepo, pushFile, createOrUpdateFile };
