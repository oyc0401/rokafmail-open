import { getNow, Status } from "src/lib/time";
import { PostRepository } from "src/repository/post/postRepository";
import { Letter } from "src/type/serviceType";
import { PostQueue } from "src/repository/postQueue/postQueue";
import { RokafClientInterface } from "../rokafClient/RokafClientInterface";
import { labelLogger } from "config/logger/labelLogger";
import { RokafTime } from "src/lib/time/rokafTime";
import { UserRepository } from "src/repository/user/userRepository";

const MAX_COUNT = 10;

export enum SendResponse { before, notfound, success, fail, error }

export class MailService {
  private rokafClient: RokafClientInterface;
  private postRepository: PostRepository;
  private userRepository: UserRepository;
  private postQueue: PostQueue;

  constructor({ postRepository, userRepository, postQueue, rokafClient }) {
    this.postRepository = postRepository;
    this.userRepository = userRepository;
    this.postQueue = postQueue;
    this.rokafClient = rokafClient;
  }

  /**
   * 편지를 보낸다.
   * 
   * DB에 해당 편지를 저장한 뒤, 기훈단 서버에 편지를 보낸다.
   *
   * 이때 기훈단 서버에 편지를 보내는것은 비동기적으로 실행한다.
   */
  async sendLetterAsync(userId: number, letter: Letter) {
    const logger = labelLogger("SendLetter");

    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('유저가 없습니다.')

    const { name, relationship, title, contents, password, isPublic } = letter;
    // 편지 저장
    const newPost = await this.postRepository.insert({
      userId, name, relationship,
      title, contents, password, isPublic
    });

    const { id: postId } = newPost;

    // 연결되었으면 편지를 보낸다.
    // 편지를 보내다 오류가 나면 큐에 저장합니다.
    if (user.connect) {
      // 편지가 보내졌으면 로그를 찍는다.
      this.sendMailFalseEnqueue(postId)
        .then((status) => logger.info(`(${postId}) | ${sendResponseToStr(status)}`));

    } else {
      logger.info(`(${postId}) | BeforeMailTime`)
    }
    return postId;
  }

  /**
   * 편지를 보낸다.
   * 
   * DB에 해당 편지를 저장한 뒤, 기훈단 서버에 편지를 보낸다.
   */
  async sendLetterAwait(userId: number, letter: Letter) {
    const logger = labelLogger("AwaitSendLetter");

    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('유저가 없습니다.')

    const { name, relationship, title, contents, password, isPublic } = letter;
    // 편지 저장
    const newPost = await this.postRepository.insert({
      userId, name, relationship,
      title, contents, password, isPublic
    });

    const { id: postId } = newPost;

    // 연결되었으면 편지를 보낸다.
    // 편지를 보내다 오류가 나면 큐에 저장합니다.
    if (user.connect) {
      // await가 붇어있어야 함
      await this.sendMailFalseEnqueue(postId)
        .then((status) => logger.info(`(${postId}) | ${sendResponseToStr(status)}`));
    } else {
      logger.info(`(${postId}) | BeforeMailTime`)
    }
    return postId;
  }

  /**
   * 해당 id의 편지를 보내고 발송 완료 처리한다.
  **/
  async sendMail(postId: number): Promise<SendResponse> {
    const post = await this.postRepository.findByIdWithUser(postId);
    if (!post) throw Error(`id가 ${postId}인 편지를 찾을 수 없습니다.`);

    const { name, relationship, title, contents, password, createdAt } = post;
    const { memberSeq, sodae, generation } = post.user;

    const status = RokafTime.getStatus(generation);

    // 편지 발송완료 처리 함수
    const updatePostSent = async (postId: number) =>
      this.postRepository.update(postId, { posted: true, postAt: getNow() });

    switch (status) {
      case Status.before:
      case Status.beginning:
        return SendResponse.before;
      case Status.training:
        if (!memberSeq || !sodae) {
          return SendResponse.notfound;
        }

        const postComplete = await this.rokafClient.postMail(
          { name, relationship, title, contents, password, memberSeq, sodae },
          createdAt);

        // 국방서버에 보내는 요청
        if (!postComplete.serverOn) {
          return SendResponse.error;
        }

        if (postComplete.complete) {
          await updatePostSent(postId);
          return SendResponse.success;
        } else {
          return SendResponse.fail;
        }
      case Status.ending:
      case Status.working:
      case Status.discharged:
        // 편지쓰기 기간 이후에 전송하면 보내졌다고 치기
        await updatePostSent(postId);
        return SendResponse.success;
    }
  }

  /**
   * 편지를 보내고, 실패하면 큐에 넣는다.
   */
  async sendMailFalseEnqueue(postId: number): Promise<SendResponse> {
    const response = await this.sendMail(postId);
    if (response == SendResponse.error || response == SendResponse.fail) {
      // 오류가 나거나 실패하면 큐에 넣는다.
      await this.postQueue.insert(postId);
    }
    return response;
  }


  /**
   * 해당 유저의 모든 미발송 편지들을 다시 보내기
   */
  async sendUnpostedMails(userId: number) {
    const logger = labelLogger("SendUnpostedMails");
    const posts = await this.postRepository.findNotPostedByUserId(userId);

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];

      if (i < MAX_COUNT) {

        const response = await this.sendMailFalseEnqueue(post.id);
        logger.info(`(${post.id}) | ${sendResponseToStr(response)}`)

      } else {
        // 한번에 많이 보내지 않게 나머지는 큐에 넣음
        await this.postQueue.insert(post.id);
        logger.info(`(${post.id}) | Limit`)
      }
    }
  }
}

export function sendResponseToStr(status: SendResponse) {
  switch (status) {
    case SendResponse.before:
      return `QueueAdded - BeforeMailTime`;
    case SendResponse.notfound:
      return `QueueAdded - ProfileNotFound`;
    case SendResponse.success:
      return `Complete`;
    case SendResponse.error:
      return `QueueAdded - ServerError`;
    case SendResponse.fail:
      return `QueueAdded - Fail`;
  }
}


