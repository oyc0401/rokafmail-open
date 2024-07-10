import { Status, serveStatus } from "src/lib/time";
import { UserQueue } from "src/repository/userQueue/userQueue";
import { UserRepository } from "src/repository/user/userRepository";
import { ValidateError } from "src/utils/validate";
import { RokafClientInterface } from "../rokafClient/RokafClientInterface";
import { MailService } from "../mail/MailService";
import { Trainee } from "src/type/serviceType";
import { labelLogger } from "config/logger/labelLogger";
import { RokafTime } from "src/lib/time/rokafTime";

export class UserService {
  private rokafClient: RokafClientInterface;
  private userRepository: UserRepository;
  private userQueue: UserQueue;
  private mailService: MailService;

  constructor({ userRepository, userQueue, rokafClient, mailService }) {
    this.userRepository = userRepository;
    this.userQueue = userQueue;
    this.rokafClient = rokafClient;
    this.mailService = mailService;
  }

  async existUsername(username: string) {
    const user = await this.userRepository.findByUsername(username);
    return user != null;
  }

  async register(trainee: Trainee) {
    const logger = labelLogger("Register");
    if (await this.existUsername(trainee.username)) {
      throw new ValidateError('아이디가 중복되었습니다.');
    }

    // 유저 생성
    const newUser = await this.userRepository.insert(trainee);
    const { id: userId, username } = newUser

    // 빠른 응답을 위해 남은 로직은 비동기에서 진행
    this.updateRokafProfile(userId, trainee).then((response) =>
      logger.info(`${username} (${userId}) | ${syncResponseToStr(response)}`));

    return userId;
  }

  // 테스트용! 나중에 지워라 retry에 있다
  async awaitRegister(trainee: Trainee) {
    const logger = labelLogger("AwaitRegister");
    if (await this.existUsername(trainee.username)) {
      throw new ValidateError('아이디가 중복되었습니다.');
    }

    // 유저 생성
    const newUser = await this.userRepository.insert(trainee);
    const { id: userId, username } = newUser

    // 빠른 응답을 위해 남은 로직은 비동기에서 진행
    const response = await this.updateRokafProfile(userId, trainee);
    logger.info(`${username} (${userId}) | ${syncResponseToStr(response)}`)

    return userId;
  }

  async getTrainee(userId: number): Promise<Trainee> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw Error('유저가 없습니다.')
    const { username, password, name, birth, generation, message,
      memberSeq, sodae } = user;
    if (memberSeq && sodae) {
      const trainee: Trainee = { username, password, name, birth, generation, message, memberSeq, sodae };
      return trainee;
    }
    const trainee: Trainee = { username, password, name, birth, generation, message };
    return trainee;

  }

  /**
   * 유저의 소대번호, 멤버번호를 불러오고, 업데이트 한다.
   * 만약 오류가 나거나 프로필 불러올 수 없으면 재시도 큐에 넣는다.
   * 수료 후에 프로필을 불러올 수 없으면 큐에 넣지 않는다.
   */
  async updateRokafProfile(userId: number, trainee: Trainee) {
    const response = await this.getRokafProfile(trainee);
    const status = response.status;

    switch (status) {
      case syncResponse.before:
        await this.userQueue.insert(userId);
        break;
      case syncResponse.complete:
        const member = response.member!;
        await this.userRepository.updateRokafProfile(userId, {
          memberSeq: member.memberSeq,
          sodae: member.sodae
        });
        break;
      case syncResponse.error:
        await this.userQueue.insert(userId);
        break;
      case syncResponse.fail:
        const status = RokafTime.getStatus(trainee.generation)
        if (status == Status.working || status == Status.discharged) {
          // 수료를 했는데도 못찾으면 없는 유저로 판단하고 큐에 넣지 않는다.
        } else {
          // 안나오면 나중에 다시 검색
          await this.userQueue.insert(userId);
        }
        break;
    }

    return status;
  }

  /**
   * 유저의 소대번호, 멤버번호를 불러온다.
   */
  private async getRokafProfile(trainee: Trainee) {
    const status = RokafTime.getStatus(trainee.generation)

    // 입대 이전이면 syncResponse.before
    if (status == Status.before || status == Status.beginning) {
      return { status: syncResponse.before };
    }

    const result = await this.rokafClient.getProfile(trainee.name, trainee.birth);

    // 기훈단 서버 오류있으면 syncResponse.error 
    if (!result.serverOn) {
      return { status: syncResponse.error };
    }

    // 소대번호, 멤버번호를 업데이트하고 연결됬다고 알려줌
    if (result.member) {
      // 검색 성공 했으면 syncResponse.complete 
      return {
        status: syncResponse.complete,
        member: {
          memberSeq: result.member.memberSeq,
          sodae: result.member.sodae
        }
      };
    } else {
      // 검색 실패했으면 syncResponse.fail 
      return { status: syncResponse.fail };
    }
  }

  async editProfile(userId: number, editProps: {
    name?: string, birth?: string, message?: string, generation?: number
  }) {
    const logger = labelLogger("EditProfile");

    await this.userRepository.editProfile(userId, editProps);

    const trainee = await this.getTrainee(userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      logger.info(`${userId} | 해당 유저가 없습니다.`);
      return;
    }

    const serves = RokafTime.getStatus(user.generation);

    if (serves == Status.training) {
      const status = await this.updateRokafProfile(userId, trainee);
      if (status == syncResponse.complete) {
        await this.mailService.sendUnpostedMails(userId)
      }
      logger.info(`${userId} | ${syncResponseToStr(status)}`);
    } else {
      // 훈련기간이 아니면 DB값만 바꿔놓음
      logger.info(`${userId} | Not Train Time`);
    }


  }

  async editPassword(userId: number, newPassword: string) {
    const logger = labelLogger("EditPassword");

    await this.userRepository.editProfile(userId, { password: newPassword });
    logger.info(`${userId}`)
  }

}

export function syncResponseToStr(response: syncResponse) {
  switch (response) {
    case syncResponse.before:
      return "BeforeMailTime";
    case syncResponse.complete:
      return `Complete`;
    case syncResponse.error:
      return "ServerConnectionFalse";
    case syncResponse.fail:
      return "Fail";
  }
}

export enum syncResponse { before, complete, error, fail }

export interface RegisterProps {
  username: string;
  password: string;
  name: string;
  birth: string;
  generation: number;
  message: string;
}

interface ProfileCallBack {
  onBefore?: (queue) => Promise<any>;
  onError?: (queue) => Promise<any>;
  onComplete?: (queue) => Promise<any>;
  onFail?: (queue) => Promise<any>;
}
