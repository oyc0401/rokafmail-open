import { UserRepository } from "../user/userRepository";
import { PostRepository, Post, UpdateType, InputPost } from "./postRepository";

export class MemoryPostRepository implements PostRepository {
  posts: Post[];
  currentId: number;
  userRepository: UserRepository;

  constructor() {
    this.posts = []; // 데이터 저장을 위한 배열
    this.currentId = 1; // 간단한 ID 할당을 위한 변수
  }

  join(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async insert(post: InputPost) {
    const newPost: Post = {
      id: this.currentId++,
      posted: false,
      postAt: null,
      createdAt: new Date(),
      ...post
    };
    this.posts.push(newPost);
    return newPost;
  }

  async findById(postId: number) {
    const post = this.posts.find(post => post.id === postId);
    return post || null;
  }

  async findByIdWithUser(postId: number) {
    const post = this.posts.find(post => post.id === postId);
    if (!post) return null; // 게시물이 없으면 null 반환

    const user = await this.userRepository.findById(post.userId);
    if (!user) throw new Error('해당 유저가 없습니다.')

    return { ...post, user: user };
  }

  async update(postId: number, updatedPost: UpdateType) {
    const postIndex = this.posts.findIndex(post => post.id === postId);
    if (postIndex == -1) {
      throw new Error('해당 편지가 없습니다.')
    }
    this.posts[postIndex] = { ...this.posts[postIndex], ...updatedPost };
    return this.posts[postIndex];

  }


  async findNotPostedByUserId(userId: number) {
    return this.posts.filter(post => post.userId === userId && !post.posted);
  }
}