import prisma from "src/db/prisma";
import { InputPost, PostRepository, UpdateType } from './postRepository';

export class PrismaPostRepository implements PostRepository {
  async insert(data: InputPost) {
    return await prisma.post.create({ data });
  }

  async findById(id: number) {
    return await prisma.post.findUnique({
      where: { id },
    });
  }

  async findByIdWithUser(id: number) {
    return await prisma.post.findUnique({
      include: {
        user: {
          select: {
            username: true,
            connect: true,
            generation: true,
            memberSeq: true,
            sodae: true,
          },
        },
      },
      where: { id },
    });
  }

  update = (id: number, data: UpdateType) =>
    prisma.post.update({
      where: { id },
      data,
    });

  findNotPostedByUserId = (userId: number) =>
    prisma.post.findMany({
      orderBy: { id: 'asc' },
      where: {
        userId,
        posted: false,
      },
    });


}
