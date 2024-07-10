import { PostRepository } from "src/repository/post/postRepository";
import { PostQueue } from "src/repository/postQueue/postQueue";
import { UserRepository } from "src/repository/user/userRepository";
import { UserQueue } from "src/repository/userQueue/userQueue";
import { MailService } from "src/service/mail/MailService";
import { RetryService } from "src/service/retry/retryService";
import { RokafClientInterface } from "src/service/rokafClient/RokafClientInterface";
import { UserService } from "src/service/user/UserService";

export interface BeanInterface {
  postRepository: PostRepository;
  userRepository: UserRepository;
  postQueue: PostQueue;
  userQueue: UserQueue;
  rokafClient: RokafClientInterface;
  mailService: MailService;
  userService: UserService;
  retryService: RetryService;
}