export interface UserQueue {
  insert: (userId: number) => Promise<UserQueueObject>;
  front: () => Promise<UserQueueObject>;
  pop: () => Promise<UserQueueObject>;
  empty: () => Promise<boolean>;
  size: () => Promise<number>;
  frontWithUser: () => Promise<UserQueueObjectWithUser>;
}

export interface UserQueueObject {
  id: number;
  userId: number;
  createdAt: Date;
}

export interface UserQueueObjectWithUser {
  id: number;
  userId: number;
  createdAt: Date;
  user: {
    name: string,
    birth: string,
    generation: number,
    username: string,
    connect: boolean
  }
}