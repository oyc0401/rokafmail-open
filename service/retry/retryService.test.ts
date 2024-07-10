import { describe, expect, test, beforeEach, jest, afterEach } from '@jest/globals';
import { testBean } from 'src/bean/testConfig';
import { Status } from 'src/lib/time';
import { Trainee } from "src/type/serviceType";
import { RokafTime } from 'src/lib/time/rokafTime';

describe('Retry Service Test', () => {
  let {
    postRepository, userRepository, postQueue, userQueue,
    rokafClient, mailService, userService, retryService,
    logger,
  } = testBean();

  beforeEach(() => {
    ({
      postRepository, userRepository, postQueue, userQueue,
      rokafClient, mailService, userService, retryService,
      logger
    } = testBean());

    RokafTime.resetMock();
  });

  function createTrainee({
    username = 'testUser',
    password = 'password123',
    name = '홍길동',
    birth = '19900101',
    generation = 857,
    message = '안녕하세요!'
  } = {}): Trainee {
    return { username, password, name, birth, generation, message, }
  }

  function createLetter({ userId = 1, name = '유찬', relationship = '친구',
    title = '제목', contents = 'contents',
    password = '0000', isPublic = true,
  } = {}) {
    return { userId, name, relationship, title, contents, password, isPublic }
  }

  describe('retryDelayedMail', () => {
    test('메일 큐에 편지가 있으면 편지를 보냅니다.', async () => {
      // 서버 상태 모두 좋음
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });
      rokafClient.changePostMailReturnValue({
        serverOn: true,
        complete: true,
      });

      const trainee = createTrainee({ generation: 862 });

      // 현재 상태: 훈련 주차 -> 회원가입
      RokafTime.setMock(trainee.generation, Status.training);
      const userId = await userService.register(trainee);

      // 편지 보내기
      const post = createLetter({ userId });

      // 큐에 편지가 하나 들어있음
      const newPost = await postRepository.insert(post);
      await postQueue.insert(newPost.id);

      // 모든 편지 다시보내기
      await retryService.retryDelayedMail();

      // 보내진거 확인
      const updatedPost = await postRepository.findById(newPost.id);

      expect(await postQueue.size()).toBe(0);
      expect(updatedPost?.posted).toBe(true);

    });

    test('큐에 있는 편지가 이미 보낸 편지일 땐 기훈단에 실제로 보내진 않습니다.', async () => {
      // 서버 상태 모두 좋음
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });
      rokafClient.changePostMailReturnValue({
        serverOn: true,
        complete: true,
      });

      const trainee = createTrainee({ generation: 862 });

      // 현재 상태: 훈련 주차 -> 회원가입
      RokafTime.setMock(trainee.generation, Status.training);
      const userId = await userService.register(trainee);

      // 편지 보내기
      const post = createLetter({ userId });

      // 큐에 편지가 하나 들어있음
      const newPost = await postRepository.insert(post);
      await postQueue.insert(newPost.id);

      // 모든 편지 다시보내기
      await retryService.retryDelayedMail();

      // 보내진거 확인
      const updatedPost = await postRepository.findById(newPost.id);
      expect(updatedPost?.posted).toBe(true);

      // 큐에 다시 편지가 들어가지 않음
      expect(await postQueue.size()).toBe(0);
    });

    test('서버에 에러가 생기면 다시 해당 편지를 큐에 넣습니다.', async () => {
      // 프로필 서버 상태 좋음
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });
      // 편지 서버상태 나쁨
      rokafClient.changePostMailReturnValue({
        serverOn: false,
        complete: false,
      });

      const trainee = createTrainee({ generation: 862 });

      // 현재 상태: 훈련 주차 -> 회원가입
      RokafTime.setMock(trainee.generation, Status.training);
      const userId = await userService.register(trainee);

      // 편지 보내기
      const post = createLetter({ userId });

      // 큐에 편지가 하나 들어있음
      const newPost = await postRepository.insert(post);
      await postQueue.insert(newPost.id);
      expect(await postQueue.size()).toBe(1);

      // 모든 편지 다시보내기
      await retryService.retryDelayedMail();

      // 편지는 안 보내집니다.
      const updatedPost = await postRepository.findById(newPost.id);
      expect(updatedPost?.posted).toBe(false);

      // 큐에 다시 편지가 들어감
      expect(await postQueue.size()).toBe(1);
    });

    test('유저가 10개 초과의 편지를 보내지 않음', async () => {
      // 서버 상태 좋음
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });
      rokafClient.changePostMailReturnValue({
        serverOn: true,
        complete: true,
      });

      const trainee = createTrainee({ generation: 862 });

      // 현재 상태: 훈련 주차 -> 회원가입
      RokafTime.setMock(trainee.generation, Status.training);
      const userId = await userService.register(trainee);

      // 15개의 편지 생성
      const posts: any[] = [];
      for (let i = 0; i < 15; i++) {
        const post = createLetter({ userId })

        const newPost = await postRepository.insert(post);
        await postQueue.insert(newPost.id);
        posts.push(newPost);
      }

      await retryService.retryDelayedMail();

      // 10개는 보내지고, 5개는 다시 큐에 들어가야 함
      expect(await postQueue.size()).toBe(5);

      // 각 편지 상태 확인
      for (let i = 0; i < 15; i++) {
        const updatedPost = await postRepository.findById(posts[i].id);
        if (updatedPost) {
          if (i < 10) {
            expect(updatedPost.posted).toBe(true);
          } else {
            expect(updatedPost.posted).toBe(false);
          }
        }
      }
    });

  })

  describe('retryGetProfile', () => {

    test('유저큐에 한명일 때, 편지 일정개수 이상 보내지 않기', async () => {
      // 프로필 서버 이상함
      rokafClient.changeGetProfileReturnValue({
        serverOn: false,
      });
      rokafClient.changePostMailReturnValue({
        serverOn: true,
        complete: true,
      });

      const trainee = createTrainee();

      // 현재 상태: 훈련 주차 -> 회원가입
      RokafTime.setMock(trainee.generation, Status.training);
      const userId = await userService.awaitRegister(trainee);

      // 인증실패, 큐에 들어있음
      expect(await userQueue.size()).toBe(1);

      // 인증 전 편지 보내기
      const newPosts: any[] = [];
      for (let i = 0; i < 15; i++) {
        const post = createLetter({ userId })
        const newPost = await postRepository.insert(post);
        newPosts.push(newPost);
      }

      // 이후에 프로필 서버 정상화 되었음
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });

      // 작업 시작
      await retryService.retryGetProfile();

      // 인증이 되어서 유저큐는 비어있어야 한다.
      expect(await userQueue.size()).toBe(0);

      for (let i = 0; i < 15; i++) {
        const updated = await postRepository.findById(newPosts[i].id);
        if (updated) {
          if (i < 10) {
            expect(updated.posted).toBe(true);
          } else {
            expect(updated.posted).toBe(false);
          }
        }
      }
    });

    test('수료했는데 프로필 못 찾으면 회원가입 할 때 큐에 넣지 않기', async () => {
      // 서버 상태 좋음, 잘못된 검색
      rokafClient.changeGetProfileReturnValue({
        serverOn: true,
      });
      const trainee = createTrainee();

      // 현재 상태: 훈련 주차 -> 회원가입
      RokafTime.setMock(trainee.generation, Status.training);
      const userId = await userService.awaitRegister(trainee);

      expect(await userQueue.size()).toBe(1);

      // 이후에 편지쓰기 기간이 지남
      RokafTime.setMock(trainee.generation, Status.working); // ending 이면 검색 계속 함!
      await retryService.retryGetProfile();
      expect(await userQueue.size()).toBe(0);
    });

    test('수료했는데 서버 오류 생겨서 프로필 못 찾으면 큐에 넣기', async () => {
      // 서버 상태 나쁨
      rokafClient.changeGetProfileReturnValue({
        serverOn: false,
      });

      const trainee = createTrainee({ generation: 862 });

      // 현재 상태: 훈련 주차 -> 회원가입
      RokafTime.setMock(trainee.generation, Status.training);
      const userId = await userService.awaitRegister(trainee);

      expect(await userQueue.size()).toBe(1);

      // 나중에 서버 안정화
      rokafClient.changeGetProfileReturnValue({
        serverOn: true,
      });

      // 이후에 편지쓰기 기간이 지남
      RokafTime.setMock(trainee.generation, Status.working);
      await retryService.retryGetProfile();
      expect(await userQueue.size()).toBe(0);
    });
  })
});
