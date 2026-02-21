#!/usr/bin/env tsx

/**
 * Fetch PR review comments using GitHub CLI and format them for agent consumption.
 * 
 * Usage:
 *   npm run pr:comments              # Auto-detect current branch's PR
 *   npm run pr:comments -- --pr 123  # Specific PR number
 * 
 * Output:
 *   - pr-comments.json: Raw structured data
 *   - pr-comments-for-agent.md: Formatted markdown for copy-paste to agent
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

interface FormattedComment {
  id: string;
  author: string;
  body: string;
  file?: string;
  line?: number;
  startLine?: number;
  isResolved: boolean;
  createdAt: string;
}

interface GitHubUser {
  login?: string;
}

interface ReviewCommentApi {
  id?: string | number;
  user?: GitHubUser;
  body?: string;
  path?: string;
  line?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  original_line?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  start_line?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  original_start_line?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at?: string;
}

interface ReviewBody {
  id?: string;
  author?: GitHubUser;
  body?: string;
  state?: string;
  submittedAt?: string;
}

interface GeneralComment {
  id?: string;
  author?: GitHubUser;
  body?: string;
  createdAt?: string;
}

interface PRData {
  number: number;
  title: string;
  author?: GitHubUser;
  reviews?: ReviewBody[];
  comments?: GeneralComment[];
  reviewComments?: ReviewCommentApi[];
  resolvedCommentIds?: Set<number>;
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function printLine(message = ''): void {
  process.stdout.write(`${message}\n`);
}

/**
 * Parse command line arguments
 */
function parseArgs(): { prNumber?: string } {
  const args = process.argv.slice(2);
  const prIndex = args.indexOf('--pr');
  
  if (prIndex !== -1 && args[prIndex + 1]) {
    return { prNumber: args[prIndex + 1] };
  }
  
  return {};
}

/**
 * Check if GitHub CLI is installed
 */
function checkGHCLI(): void {
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ GitHub CLI (gh) is not installed.');
    console.error('Install it with: brew install gh');
    console.error('Then authenticate with: gh auth login');
    process.exit(1);
  }
}

/**
 * Fetch which comment IDs belong to resolved review threads via GraphQL.
 */
function fetchResolvedCommentIds(owner: string, repo: string, prNumber: number): Set<number> {
  const resolvedIds = new Set<number>();
  let cursor: string | null = null;

  do {
    const cursorArg: string = cursor ? `, after: "${cursor}"` : '';
    const query: string = `{
      repository(owner: "${owner}", name: "${repo}") {
        pullRequest(number: ${prNumber}) {
          reviewThreads(first: 100${cursorArg}) {
            nodes {
              isResolved
              comments(first: 100) { nodes { databaseId } }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }`;
    const output: string = execSync(`gh api graphql -f query='${query}'`, { encoding: 'utf-8' });
    const result = parseJson<{
      data: {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: Array<{
                isResolved: boolean;
                comments: { nodes: Array<{ databaseId: number }> };
              }>;
              pageInfo: { hasNextPage: boolean; endCursor: string | null };
            };
          };
        };
      };
    }>(output);

    const threads: {
      nodes: Array<{
        isResolved: boolean;
        comments: { nodes: Array<{ databaseId: number }> };
      }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    } = result.data.repository.pullRequest.reviewThreads;
    for (const thread of threads.nodes) {
      if (thread.isResolved) {
        for (const comment of thread.comments.nodes) {
          resolvedIds.add(comment.databaseId);
        }
      }
    }

    cursor = threads.pageInfo.hasNextPage ? threads.pageInfo.endCursor : null;
  } while (cursor !== null);

  return resolvedIds;
}

/**
 * Fetch PR data using GitHub CLI
 */
function fetchPRData(prNumber?: string): PRData {
  try {
    // First, get basic PR info
    const prArg = prNumber ? prNumber : '';
    const cmd = `gh pr view ${prArg} --json number,title,author,reviews,comments`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    const prData = parseJson<PRData>(output);
    
    // Now fetch review comments (inline comments) using the API
    // These are separate from review bodies
    const owner = execSync('gh repo view --json owner -q .owner.login', { encoding: 'utf-8' }).trim();
    const repo = execSync('gh repo view --json name -q .name', { encoding: 'utf-8' }).trim();
    const reviewCommentsCmd = `gh api repos/${owner}/${repo}/pulls/${prData.number}/comments`;
    const reviewCommentsOutput = execSync(reviewCommentsCmd, { encoding: 'utf-8' });
    const reviewComments = parseJson<ReviewCommentApi[]>(reviewCommentsOutput);
    
    // Add review comments to the PR data
    prData.reviewComments = reviewComments;
    
    // Fetch resolved state via GraphQL
    prData.resolvedCommentIds = fetchResolvedCommentIds(owner, repo, prData.number);
    
    return prData;
  } catch (error: unknown) {
    console.error('❌ Failed to fetch PR data');
    const errorMessage = getErrorMessage(error);
    if (errorMessage.includes('no pull requests found')) {
      console.error('No PR found for the current branch. Specify --pr <number>');
    } else {
      console.error(errorMessage);
    }
    process.exit(1);
  }
}

/**
 * Extract and format comments from PR data
 */
function extractComments(prData: PRData): FormattedComment[] {
  const comments: FormattedComment[] = [];
  
  // Extract review comments (inline code comments from API)
  if (prData.reviewComments) {
    for (const comment of prData.reviewComments) {
      if (comment.body && comment.body.trim()) {
        const id = comment.id ? Number(comment.id) : NaN;
        const isResolved = prData.resolvedCommentIds?.has(id) ?? false;
        comments.push({
          id: String(comment.id),
          author: comment.user?.login || 'unknown',
          body: comment.body.trim(),
          file: comment.path,
          line: comment.line || comment.original_line,
          startLine: comment.start_line || comment.original_start_line,
          isResolved,
          createdAt: comment.created_at || '',
        });
      }
    }
  }
  
  // Extract review bodies (general review comments)
  if (prData.reviews) {
    for (const review of prData.reviews) {
      if (review.body && review.body.trim()) {
        // Skip if it's just a header (Copilot generated overview)
        if (review.body.includes('## Pull request overview')) {
          continue;
        }
        
        comments.push({
          id: review.id || `review-${review.author?.login}-${review.submittedAt}`,
          author: review.author?.login || 'unknown',
          body: review.body.trim(),
          isResolved: review.state === 'DISMISSED',
          createdAt: review.submittedAt || '',
        });
      }
    }
  }
  
  // Extract general PR comments (not code-specific)
  if (prData.comments) {
    for (const comment of prData.comments) {
      if (comment.body && comment.body.trim()) {
        // Skip bot comments from GitHub Actions
        if (comment.author?.login === 'github-actions' || comment.body.includes('PR Preview ready') || comment.body.includes('Performance Report')) {
          continue;
        }
        
        comments.push({
          id: comment.id || `comment-${comment.author?.login}-${comment.createdAt}`,
          author: comment.author?.login || 'unknown',
          body: comment.body.trim(),
          isResolved: false,
          createdAt: comment.createdAt || '',
        });
      }
    }
  }
  
  // Sort by creation date
  comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  
  return comments;
}

/**
 * Read code context from file
 */
function getCodeContext(filePath: string, line: number, startLine?: number): string {
  const workspaceRoot = join(currentDirPath, '..');
  const fullPath = join(workspaceRoot, filePath);
  
  if (!existsSync(fullPath)) {
    return '[File not found in current branch]';
  }
  
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    const targetLine = line;
    const start = Math.max(0, (startLine || targetLine) - 3);
    const end = Math.min(lines.length, targetLine + 3);
    
    const contextLines = lines.slice(start, end).map((l, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === targetLine ? '→' : ' ';
      return `${marker} ${String(lineNum).padStart(4, ' ')} | ${l}`;
    });
    
    return contextLines.join('\n');
  } catch {
    return '[Error reading file]';
  }
}

/**
 * Format comments as markdown for agent
 */
function formatForAgent(prData: PRData, comments: FormattedComment[]): string {
  const unresolvedComments = comments.filter(c => !c.isResolved);
  const resolvedComments = comments.filter(c => c.isResolved);
  
  let output = `# PR Review Comments: #${prData.number} - ${prData.title}\n\n`;
  output += `**Author**: @${prData.author?.login || 'unknown'}\n`;
  output += `**Total Comments**: ${comments.length} (${unresolvedComments.length} unresolved, ${resolvedComments.length} resolved)\n\n`;
  
  if (unresolvedComments.length === 0) {
    output += '✅ **All comments are resolved!**\n\n';
    return output;
  }
  
  output += `---\n\n`;
  output += `## 📝 Unresolved Comments (${unresolvedComments.length})\n\n`;
  
  unresolvedComments.forEach((comment, index) => {
    const num = index + 1;
    const location = comment.file 
      ? `[${comment.file}:${comment.line}](${comment.file}#L${comment.line})`
      : 'General PR comment';
    
    output += `### ${num}. ${location}\n`;
    output += `**@${comment.author}** commented:\n\n`;
    output += `> ${comment.body.split('\n').join('\n> ')}\n\n`;
    
    if (comment.file && comment.line) {
      const context = getCodeContext(comment.file, comment.line, comment.startLine);
      output += `**Code context:**\n\`\`\`typescript\n${context}\n\`\`\`\n\n`;
    }
    
    output += `---\n\n`;
  });
  
  if (resolvedComments.length > 0) {
    output += `## ✅ Resolved Comments (${resolvedComments.length})\n\n`;
    resolvedComments.forEach((comment, index) => {
      const location = comment.file ? `${comment.file}:${comment.line}` : 'General';
      output += `${index + 1}. **${location}** - @${comment.author}\n`;
    });
  }
  
  return output;
}

/**
 * Main execution
 */
function main() {
  const { prNumber } = parseArgs();
  
  printLine('🔍 Checking GitHub CLI...');
  checkGHCLI();
  
  printLine(`📥 Fetching PR data${prNumber ? ` for PR #${prNumber}` : ' for current branch'}...`);
  const prData = fetchPRData(prNumber);
  
  printLine(`✅ Found PR #${prData.number}: ${prData.title}`);
  
  printLine('📝 Extracting comments...');
  const comments = extractComments(prData);
  
  printLine('💾 Saving structured data...');
  const workspaceRoot = join(currentDirPath, '..');
  const jsonPath = join(workspaceRoot, 'pr-comments.json');
  writeFileSync(jsonPath, JSON.stringify({ pr: prData.number, title: prData.title, comments }, null, 2));
  printLine(`   → ${jsonPath}`);
  
  printLine('📄 Formatting for agent...');
  const markdown = formatForAgent(prData, comments);
  const mdPath = join(workspaceRoot, 'pr-comments-for-agent.md');
  writeFileSync(mdPath, markdown);
  printLine(`   → ${mdPath}`);
  
  printLine(`\n${'='.repeat(60)}`);
  printLine(markdown);
  printLine('='.repeat(60));
  printLine(`\n✨ Done! Found ${comments.length} comments (${comments.filter(c => !c.isResolved).length} unresolved)`);
  printLine('\n💡 Copy the output above or the contents of pr-comments-for-agent.md');
  printLine('   and paste it to the agent with the prompt: "Review PR comments"');
}

main();
