/**
 * Git workflow types
 */

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export type CommitStyle = 'conventional' | 'simple';
