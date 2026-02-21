#!/usr/bin/env tsx

/**
 * Reply to a PR review comment via GitHub CLI.
 *
 * Usage:
 *   npm run pr:reply -- --comment-id <id> --message "<text>"
 *
 * Tip: to reference the current commit automatically:
 *   npm run pr:reply -- --comment-id <id> --message "Fixed in $(git rev-parse --short HEAD)"
 */

import { execSync } from 'child_process';

function parseArgs(): { commentId: string; message: string } {
  const args = process.argv.slice(2);
  const commentIdIdx = args.indexOf('--comment-id');
  const messageIdx = args.indexOf('--message');

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
  };
}

function main() {
  const { commentId, message } = parseArgs();

  const owner = execSync('gh repo view --json owner -q .owner.login', { encoding: 'utf-8' }).trim();
  const repo = execSync('gh repo view --json name -q .name', { encoding: 'utf-8' }).trim();
  const prNumber = execSync('gh pr view --json number -q .number', { encoding: 'utf-8' }).trim();

  execSync(
    `gh api repos/${owner}/${repo}/pulls/${prNumber}/comments/${commentId}/replies -f body=${JSON.stringify(message)}`,
    { stdio: 'pipe', env: { ...process.env, GH_PAGER: 'cat' } },
  );

  // eslint-disable-next-line no-console
  console.log(`✅ Reply posted to comment #${commentId}`);
}

main();
