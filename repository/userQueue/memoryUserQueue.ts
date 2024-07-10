import { UserRepository } from "../user/userRepository";
import { UserQueue, UserQueueObject } from "./userQueue";

export class MemoryUserQueue implements UserQueue {
  private queue: UserQueueObject[];
  private nextId: number;

  private userRepository: UserRepository;
  constructor(userRepository: UserRepository) {
    this.queue = [];
    this.nextId = 1;

    // join user
    this.userRepository = userRepository;
  }

  async insert(userId: number): Promise<UserQueueObject> {
    const newUserQueueObject: UserQueueObject = {
      id: this.nextId++,
      userId,
      createdAt: new Date()
    };
    this.queue.push(newUserQueueObject);
    return newUserQueueObject;
  }

  async front(): Promise<UserQueueObject> {
    if (this.queue.length === 0) {
      throw new Error('Queue is empty');
    }
    return this.queue[0];
  }

  async pop(): Promise<UserQueueObject> {
    if (this.queue.length === 0) {
      throw new Error('Queue is empty');
    }
    return this.queue.shift()!;
  }

  async empty() {
    return this.queue.length === 0;
  }

  async size() {
    return this.queue.length;
  }
  
  async frontWithUser() {
    if (this.queue.length === 0) {
      throw new Error('Queue is empty');
    }
    const front = this.queue[0];
    const user = await this.userRepository.findById(front.id);
    const { name, birth, generation, username, connect } = user!;
    return {
      ...front,
      user: {
        name, birth, generation, username, connect
      },
    }
  }
}