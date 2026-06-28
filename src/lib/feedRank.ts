import {
  FEED_FAVORITE_POSTS_LIMIT,
  FEED_FOLLOWING_POSTS_LIMIT,
} from "@/lib/constants";
import type { Post } from "@/models";

function postTimestamp(post: Post): number {
  return post.createdAt?.seconds ?? 0;
}

function sortByCreatedAtDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => postTimestamp(b) - postTimestamp(a));
}

export function partitionFeedPosts(
  posts: Post[],
  favoriteTopicNames: Set<string>,
  favoriteLimit = FEED_FAVORITE_POSTS_LIMIT
): { favoritePosts: Post[]; allPosts: Post[] } {
  if (favoriteTopicNames.size === 0) {
    return { favoritePosts: [], allPosts: sortByCreatedAtDesc(posts) };
  }

  const favoritePosts: Post[] = [];
  const favoriteIds = new Set<string>();

  for (const post of sortByCreatedAtDesc(posts)) {
    if (favoritePosts.length >= favoriteLimit) break;
    if (favoriteTopicNames.has(post.category.toLowerCase())) {
      favoritePosts.push(post);
      favoriteIds.add(post.id);
    }
  }

  const allPosts = sortByCreatedAtDesc(posts).filter((p) => !favoriteIds.has(p.id));
  return { favoritePosts, allPosts };
}

export function partitionFeedSections(
  posts: Post[],
  followingIds: Set<string>,
  favoriteTopicNames: Set<string>,
  options?: { followingLimit?: number; favoriteLimit?: number }
): { followingPosts: Post[]; favoritePosts: Post[]; allPosts: Post[] } {
  const followingLimit = options?.followingLimit ?? FEED_FOLLOWING_POSTS_LIMIT;
  const favoriteLimit = options?.favoriteLimit ?? FEED_FAVORITE_POSTS_LIMIT;
  const sorted = sortByCreatedAtDesc(posts);
  const shownIds = new Set<string>();

  const followingPosts: Post[] = [];
  if (followingIds.size > 0) {
    for (const post of sorted) {
      if (followingPosts.length >= followingLimit) break;
      if (followingIds.has(post.authorId)) {
        followingPosts.push(post);
        shownIds.add(post.id);
      }
    }
  }

  const favoritePosts: Post[] = [];
  if (favoriteTopicNames.size > 0) {
    for (const post of sorted) {
      if (favoritePosts.length >= favoriteLimit) break;
      if (shownIds.has(post.id)) continue;
      if (favoriteTopicNames.has(post.category.toLowerCase())) {
        favoritePosts.push(post);
        shownIds.add(post.id);
      }
    }
  }

  const allPosts = sorted.filter((p) => !shownIds.has(p.id));
  return { followingPosts, favoritePosts, allPosts };
}