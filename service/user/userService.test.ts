import { describe, expect, test, beforeEach, jest, afterEach } from '@jest/globals';
import { syncResponse } from './UserService';
import { ValidateError } from 'src/utils/validate';
import { Status } from 'src/lib/time';
import { testBean } from 'src/bean/testConfig';
import { Trainee } from "src/type/serviceType";
import { RokafTime } from 'src/lib/time/rokafTime';

describe('User Service Test', () => {
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

  describe('Trainee 회원가입', () => {
    test('회원가입', async () => {
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });

      const trainee = createTrainee();
      const userId = await userService.awaitRegister(trainee);

      const registeredTrainee = await userService.getTrainee(userId);

      const user = await userRepository.findByUsername(registeredTrainee.username);
      expect(user).not.toBeNull();
    });

    test('아이디 중복이면 회원가입이 실패합니다.', async () => {
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });

      // 회원가입
      const trainee1 = createTrainee({ username: 'Michael' });
      await userService.awaitRegister(trainee1);

      // 중복된 아이디
      const trainee2 = createTrainee({ username: 'Michael' });
      // 오류 예상
      await expect(userService.register(trainee2)).rejects.toThrow(ValidateError);
    });


    test.each([
      ['입대 전', Status.before],
      ['초반 주차', Status.beginning]
    ])(
      '%s 상태에서는 프로필 검색을 하지 않는다.',
      async (description, status) => {
        const trainee = createTrainee();

        RokafTime.setMock(trainee.generation, status);
        rokafClient.changeGetProfileReturnValue({
          member: {
            memberSeq: '12341234',
            sodae: '1111',
          },
          serverOn: true,
        });

        // 회원가입
        const userId = await userService.awaitRegister(trainee);
        const registeredTrainee = await userService.getTrainee(userId);

        // 프로필 업데이트 여부 검증
        expect(registeredTrainee.memberSeq).toBeUndefined();
        expect(registeredTrainee.sodae).toBeUndefined();

        // 인증 전이므로 유저큐에 들어간다.
        expect(await userQueue.size()).toBe(1);
      }
    );

    test('회원가입 시 훈련주차에는 프로필을 가져온다.', async () => {
      const trainee = createTrainee();

      // 현재 상태: 훈련 주차
      RokafTime.setMock(trainee.generation, Status.training);

      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });

      // 회원가입
      const userId = await userService.awaitRegister(trainee);

      const registeredTrainee = await userService.getTrainee(userId);

      // 소대번호를 업데이트 한다.
      expect(registeredTrainee.memberSeq).toEqual('12341234');
      expect(registeredTrainee.sodae).toEqual('1111');
    });
  });

  describe('syncProfile: 유저의 프로필을 불러오고 업데이트한다.', () => {
    test('편지쓰기 기간 이전에 프로필을 불러오지 않습니다.', async () => {
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });

      const trainee = createTrainee();
      // 현재 상태: 훈련 주차
      RokafTime.setMock(trainee.generation, Status.before);

      // db 저장
      const user = await userRepository.insert(trainee);

      const result = await userService.updateRokafProfile(user!.id, trainee);

      expect(result).toBe(syncResponse.before);

      // 유저 정보 검증
      const updatedUser = await userRepository.findById(user!.id);
      expect(updatedUser?.connect).toBe(false);
    });

    test('편지쓰기 기간이면 프로필을 불러옵니다.', async () => {
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });

      const trainee = createTrainee();
      // 현재 상태: 훈련 주차
      RokafTime.setMock(trainee.generation, Status.training);

      // db 저장
      const user = await userRepository.insert(trainee);

      const result = await userService.updateRokafProfile(user!.id, trainee);

      expect(result).toBe(syncResponse.complete);

      // 유저 정보 검증
      const updatedUser = await userRepository.findById(user!.id);
      expect(updatedUser?.connect).toBe(true);
      expect(updatedUser?.memberSeq).toBe('12341234');
      expect(updatedUser?.sodae).toBe('1111');
    });

    test('편지쓰기 기간인데 서버 오류나면 프로필을 불러오지 않습니다.', async () => {
      rokafClient.changeGetProfileReturnValue({
        serverOn: false,
      });

      const trainee = createTrainee();
      // 현재 상태: 훈련 주차
      RokafTime.setMock(trainee.generation, Status.training);

      // db 저장
      const user = await userRepository.insert(trainee);

      const result = await userService.updateRokafProfile(user!.id, trainee);

      expect(result).toBe(syncResponse.error);

      // 유저 정보 검증
      const updatedUser = await userRepository.findById(user!.id);
      expect(updatedUser?.connect).toBe(false);
    });

    test('편지쓰기 기간인데 프로필이 없으면 업데이트를 하지 않습니다.', async () => {
      rokafClient.changeGetProfileReturnValue({
        serverOn: true
      });

      const trainee = createTrainee();
      // 현재 상태: 훈련 주차
      RokafTime.setMock(trainee.generation, Status.training);

      // db 저장
      const user = await userRepository.insert(trainee);

      const result = await userService.updateRokafProfile(user!.id, trainee);

      expect(result).toBe(syncResponse.fail);

      // 유저 정보 검증
      const updatedUser = await userRepository.findById(user!.id);
      expect(updatedUser?.connect).toBe(false);
    });
  });


  describe('프로필 업데이트', () => {
    test('프로필 업데이트하면 소대번호를 불러옵니다.', async () => {
      // 잘못된 이름 입력해서 프로필을 찾을 수 없음
      rokafClient.changeGetProfileReturnValue({
        serverOn: true,
      });

      const trainee = createTrainee({ generation: 862 });

      // 현재 상태: 입대 전
      RokafTime.setMock(trainee.generation, Status.before);

      // 회원가입
      const userId = await userService.awaitRegister(trainee);

      // 정확한 정보 입력으로 소대번호 가져올 수 있음
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });

      // 862기 훈련기간
      RokafTime.setMock(trainee.generation, Status.training);

      // 정보 수정
      await userService.editProfile(userId, { name: '하이', birth: '20230405' });

      //expect(logger.cat()).toEqual('12341234');

      const updatedTrainee = await userService.getTrainee(userId);

      // 프로필 업데이트를 하면 소대번호가 업데이트된다.
      expect(updatedTrainee.memberSeq).toEqual('12341234');
      expect(updatedTrainee.sodae).toEqual('1111');
    })

    test('기존에 소대번호가 있어도 프로필 수정하면 바뀝니다.', async () => {
      // 서버 좋음
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '1111',
        },
        serverOn: true,
      });

      const trainee = createTrainee({ generation: 862 });

      // 현재 상태: 훈련 중
      RokafTime.setMock(trainee.generation, Status.ending);

      // 회원가입
      const userId = await userService.awaitRegister(trainee);

      const updatedTrainee1 = await userService.getTrainee(userId);

      expect(updatedTrainee1.memberSeq).toEqual('12341234');
      expect(updatedTrainee1.sodae).toEqual('1111');

      // 정확한 정보 입력으로 소대번호 가져올 수 있음
      rokafClient.changeGetProfileReturnValue({
        member: {
          memberSeq: '12341234',
          sodae: '2222',
        },
        serverOn: true,
      });

      // 862기 훈련기간
      RokafTime.setMock(trainee.generation, Status.training);

      // 정보 수정
      await userService.editProfile(userId, { name: '하이', birth: '20230405' });

      const updatedTrainee = await userService.getTrainee(userId);

      // 프로필 업데이트를 하면 소대번호가 업데이트된다.
      expect(updatedTrainee.memberSeq).toEqual('12341234');
      expect(updatedTrainee.sodae).toEqual('2222');
    })

  })
});

