import prisma from "src/db/prisma";
import { Post } from "src/db";

// implements PostQueue
export class PrismaPostQueue  {

  async insert(postId: number) {
    // 나중에 지워라 DB 수정하기 귀찮아서 이렇게 한거임..
    const post = await Post.findById(postId);
    const { userId } = post!;
    
    return prisma.postQueue.create({
      data: {
        postId,
        userId,
      }
    });
  }

  async front() {
    const result = await prisma.postQueue.findFirst({
      orderBy: {
        id: 'asc'
      }
    });
    if (!result) throw new Error('Queue is empty');
    return result;
  }


  async pop() {
    const record = await this.front();
    if (!record) throw new Error('Queue is empty');

    await prisma.postQueue.delete({
      where: {
        id: record.id
      }
    });

    return record;
  }

  async empty() {
    const count = await prisma.postQueue.count();
    return count === 0;
  }

  async size() {
    return await prisma.postQueue.count();
  }

  async frontWithPost() {
    const result = await prisma.postQueue.findFirst({
      orderBy: {
        id: 'asc'
      },
      include: {
        post: {
          select: {
            posted: true,
            userId: true,
          }
        }
      }
    });
    if (!result) throw new Error('Queue is empty');
    return result;
  }



}
