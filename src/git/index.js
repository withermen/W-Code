const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');

function cwd(session) {
  return process.env.WORKSPACE || path.join(__dirname, '../../workspace');
}

async function git(cmd, session) {
  try {
    const { stdout, stderr } = await execAsync(`git ${cmd}`, { cwd: cwd(session), timeout: 15000 });
    return { ok: true, output: (stdout || '') + (stderr || '') };
  } catch (e) {
    return { ok: false, output: e.message + '\n' + (e.stdout || '') + (e.stderr || '') };
  }
}

async function status(session) {
  const s = await git('status --short', session);
  const branch = await git('branch --show-current', session);
  return { branch: branch.output.trim() || 'main', status: s.output, clean: !s.output.trim() };
}

async function diff(session) {
  return git('diff', session);
}

async function log(session, n = 10) {
  return git(`log --oneline -${n}`, session);
}

async function commit(message, session) {
  await git('add -A', session);
  return git(`commit -m "${message.replace(/"/g, '\\"')}"`, session);
}

async function branches(session) {
  return git('branch -a', session);
}

async function checkout(branch, session) {
  return git(`checkout ${branch}`, session);
}

module.exports = { status, diff, log, commit, branches, checkout, git };
