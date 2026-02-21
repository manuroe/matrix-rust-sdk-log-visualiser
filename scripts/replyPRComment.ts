#!/usr/bin/env tsx

/**
 * Reply to a PR review comment via GitHub CLI.
 *
 * Usage:
 *   npm run pr:reply -- --comment-id <id> --message "<text>"
 *   npm run pr:reply -- --comment-id <id> --message "<text>" --dry-run
 *
 * Tip: to reference the current commit automatically:
 *   npm run pr:reply -- --comment-id <id> --message "Fixed in $(git rev-parse HEAD)"
 */

import { execFileSync, execSync } from 'child_process';

const commitRefPattern = /\b([0-9a-f]{7,40})\b/gi;

function parseArgs(): { commentId: string; message: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  const commentIdIdx = args.indexOf('--comment-id');
  const messageIdx = args.indexOf('--message');
  const dryRun = args.includes('--dry-run');

  if (commentIdIdx === -1 || !args[commentIdIdx + 1]) {
    console.error('❌ Missing --comment-id <id>');
    process.exit(1);
  }
  if (messageIdx === -1 || !args[messageIdx + 1]) {
    console.error('❌ Missing --message "<text>"');
    process.exit(1);
  }

  return {
    commentId: args[commentIdIdx + 1],
    message: args[messageIdx + 1],
    dryRun,
  };
}

function resolveCommitSha(commitRef: string): string | null {
  try {
    return execSync(`git rev-parse --verify ${commitRef}^{commit}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function commitExistsOnRemote(owner: string, repo: string, sha: string, env: NodeJS.ProcessEnv): boolean {
  try {
    execFileSync('gh', ['api', `repos/${owner}/${repo}/commits/${sha}`], {
      stdio: 'pipe',
      env,
    });
    return true;
  } catch {
    return false;
  }
}

function linkifyCommitRefs(message: string, owner: string, repo: string, env: NodeJS.ProcessEnv): string {
  const matches = [...message.matchAll(commitRefPattern)];

  if (matches.length === 0) {
    return message;
  }

  const resolved = new Map<string, string>();

  for (const match of matches) {
    const rawRef = match[1];
    const key = rawRef.toLowerCase();
    if (resolved.has(key)) {
      continue;
    }

    const fullSha = resolveCommitSha(rawRef);
    if (!fullSha) {
      continue;
    }

    if (!commitExistsOnRemote(owner, repo, fullSha, env)) {
      throw new Error(
        `Commit ${rawRef} resolves to ${fullSha} locally but is not available on origin yet. Push it before replying.`,
      );
    }

    resolved.set(key, fullSha);
  }

  return message.replace(commitRefPattern, (match, commitRef: string) => {
    const fullSha = resolved.get(commitRef.toLowerCase());
    if (!fullSha) {
      return match;
    }
    return `[${match}](https://github.com/${owner}/${repo}/commit/${fullSha})`;
  });
}

function main() {
  const { commentId, message, dryRun } = parseArgs();
  const env = { ...process.env };
  env['GH_PAGER'] = 'cat';

  const owner = execSync('gh repo view --json owner -q .owner.login', { encoding: 'utf-8' }).trim();
  const repo = execSync('gh repo view --json name -q .name', { encoding: 'utf-8' }).trim();
  const prNumber = execSync('gh pr view --json number -q .number', { encoding: 'utf-8' }).trim();
  const replyBody = linkifyCommitRefs(message, owner, repo, env);

  if (dryRun) {
    process.stdout.write(`🧪 Dry run: no reply posted for comment #${commentId}\n`);
    process.stdout.write('--- reply body preview ---\n');
    process.stdout.write(`${replyBody}\n`);
    return;
  }

  execFileSync('gh', ['api', `repos/${owner}/${repo}/pulls/${prNumber}/comments/${commentId}/replies`, '--raw-field', `body=${replyBody}`], {
    stdio: 'pipe',
    env,
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Reply posted to comment #${commentId}`);
}

main();
