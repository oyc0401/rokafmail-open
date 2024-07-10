import { getProfile } from "src/airforce/profile";
import { postMail } from "src/airforce/postMail";
import { RokafClientInterface } from "./RokafClientInterface";

export default class RokafClient implements RokafClientInterface {
  async getProfile(name: string, birth: string) {
    return await getProfile(name, birth);
  }
  async postMail(
    body: {
      name: string;
      relationship: string;
      title: string;
      contents: string;
      password: string;
      memberSeq: string;
      sodae: string;
    },
    createdAt = new Date(),
  ) {
    return await postMail(body, createdAt);
  }
}
