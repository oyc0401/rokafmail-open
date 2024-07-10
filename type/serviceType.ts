export interface Letter {
  name: string;
  relationship: string;
  title: string;
  contents: string;
  password: string;
  isPublic: boolean;
}

export interface Trainee {
  username: string;
  password: string;
  name: string;
  birth: string;
  generation: number;
  message: string;
  memberSeq?: string;
  sodae?: string;
}