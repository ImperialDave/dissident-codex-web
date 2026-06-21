import type { Comment } from "@/models";

export interface CommentThreadItem {
  comment: Comment;
  depth: number;
}

export function flattenComments(comments: Comment[]): CommentThreadItem[] {
  const byParent = new Map<string, Comment[]>();
  for (const c of comments) {
    const key = c.parentCommentId?.trim() || "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }

  function walk(parentId: string, depth: number): CommentThreadItem[] {
    const children = (byParent.get(parentId) || []).sort(
      (a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
    );
    return children.flatMap((comment) => [
      { comment, depth },
      ...walk(comment.id, depth + 1),
    ]);
  }

  return walk("", 0);
}