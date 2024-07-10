export interface PostRepository {
  insert: (data: InputPost) => Promise<Post>;
  findById: (id: number) => Promise<Post | null>;
  findByIdWithUser: (id: number) => Promise<(Post & { user: Profile }) | null>;
  update: (id: number, data: UpdateType) => Promise<Post>;
  findNotPostedByUserId: (userId: number) => Promise<Post[]>;
}

export interface Post {
  id: number; userId: number;
  name: string; relationship: string;
  title: string; contents: string;
  password: string; createdAt: Date;
  posted: boolean; postAt: Date | null;
  isPublic: boolean;
}

export interface Profile {
  username: string;
  connect: boolean;
  generation: number;
  memberSeq: string | null;
  sodae: string | null;
}

export interface InputPost {
  userId: number;
  name: string;
  relationship: string;
  title: string;
  contents: string;
  password: string;
  isPublic: boolean;
}

export interface UpdateType {
  name?: string; relationship?: string;
  title?: string; contents?: string;
  password?: string; posted?: boolean;
  postAt?: Date | null; isPublic?: boolean;
}


