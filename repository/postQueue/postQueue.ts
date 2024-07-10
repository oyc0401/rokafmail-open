export interface PostQueue {
  insert: (postId: number) => Promise<PostQueueObject>;
  front: () => Promise<PostQueueObject>;
  pop: () => Promise<PostQueueObject>;
  empty: () => Promise<boolean>;
  size: () => Promise<number>;
  frontWithPost: () => Promise<PostQueueObjectJoin>;
}

export interface PostQueueObject {
  id: number;
  postId: number;
  createdAt: Date;
}

export interface PostQueueObjectJoin {
  id: number;
  postId: number;
  createdAt: Date;
  post: {
    posted: boolean;
    userId: number;
  }
}