/**
 * 공군 기본군사훈련단에서 훈련병의 프로필을 가져오고, 편지를 보내는 인터페이스
 */
export interface RokafClientInterface {
  getProfile(name: string, birth: string): Promise<RokafProfile>

  postMail(body: {
    name: string; relationship: string; title: string; contents: string;
    password: string; memberSeq: string; sodae: string;
  }, createdAt: Date): Promise<RokafMail>
}

export interface RokafProfile {
  serverOn: boolean,
  member?: {
    memberSeq: string,
    sodae: string,
  }
}

export interface RokafMail {
  serverOn: boolean,
  complete: boolean,
}