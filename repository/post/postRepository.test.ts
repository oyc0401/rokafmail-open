import { describe, expect, test } from '@jest/globals';
import { MemoryPostRepository } from 'src/repository/post/memoryPostRepository';
import { MemoryUserRepository } from '../user/memoryUserRepository';

describe('Repository Test', () => {

  test('PostRepository 업데이트', async () => {

    expect(1).toEqual(1);
  });
  
  test('PostRepository 삽입', async () => {
    const memoryPostRepository = new MemoryPostRepository();
    const userRepository = new MemoryUserRepository();
    memoryPostRepository.join(userRepository);

    const user = { g: '2' }
    userRepository.insert(user)

    const dummy = {
      userId: 1,
      name: '하이',
      content: '내용',
    };
    const newPost = await memoryPostRepository.insert(dummy);

    const post = await memoryPostRepository.findById(newPost.id);

    expect({ id: 1, ...post }).toEqual(newPost);
  });

  test('PostRepository 업데이트', async () => {
    const memoryPostRepository = new MemoryPostRepository();
    const userRepository = new MemoryUserRepository();
    memoryPostRepository.join(userRepository);
    const originalPost = {
      userId: 1,
      name: '하이',
      content: '내용',
    };

    const newPost = await memoryPostRepository.insert(originalPost);
    await memoryPostRepository.update(newPost.id, { name: '호랑이' });

    const updatedPost = await memoryPostRepository.findById(newPost.id);
    expect(1).toBe(1);
    // updatedPost 객체가 기대하는 속성 값을 가지고 있는지 확인
    expect(updatedPost).toEqual({
      ...newPost,
      name: '호랑이'
    });
  });
})
