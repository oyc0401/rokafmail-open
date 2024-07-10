import { RokafMail, RokafProfile, RokafClientInterface } from "./RokafClientInterface";

export default class MockRokafClient implements RokafClientInterface {

  private getProfileResponse: RokafProfile;
  private postMailResponse: RokafMail;

  setRokafServerError() {
    this.getProfileResponse = { serverOn: false };
    this.postMailResponse = { serverOn: false, complete: false };
  }

  changePostMailReturnValue(response: RokafMail) {
    this.postMailResponse = response;
  }

  changeGetProfileReturnValue(response: RokafProfile) {
    this.getProfileResponse = response;
  }

  async getProfile(name: string, birth: string) {
    return this.getProfileResponse;
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
    return this.postMailResponse;
  }


}
