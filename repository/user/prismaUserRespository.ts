import prisma from "src/db/prisma";
import { EditProfileProps, InputUser, RokafProfile, UserRepository } from "./userRepository";


export class PrismaUserRepository implements UserRepository {

  insert = (data: InputUser) => prisma.user.create({ data });

  findById = (id: number) =>
    prisma.user.findUnique({ where: { id }, });

  findByUsername = (username: string) =>
    prisma.user.findUnique({ where: { username }, });

  updateRokafProfile = (id: number, rokafProfile: RokafProfile) =>
    prisma.user.update({
      where: { id },
      data: {
        memberSeq: rokafProfile.memberSeq,
        sodae: rokafProfile.sodae,
        connect: true
      },
    });

  editProfile = (id: number, editProps: EditProfileProps) =>
    prisma.user.update({
      where: { id },
      data: editProps,
    });
}
