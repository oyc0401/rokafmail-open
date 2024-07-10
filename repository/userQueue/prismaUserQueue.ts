import prisma from "src/db/prisma";

export class PrismaUserQueue {

  async insert(userId: number) {
    return prisma.usersQueue.create({
      data: {
        userId,
      }
    });
  }

  async front() {
    const result = await prisma.usersQueue.findFirst({
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

    await prisma.usersQueue.delete({
      where: {
        id: record.id
      }
    });

    return record;
  }

  async empty() {
    const count = await prisma.usersQueue.count();
    return count === 0;
  }

  async size() {
    return await prisma.usersQueue.count();
  }

  async frontWithUser() {
    const result = await prisma.usersQueue.findFirst({
      orderBy: {
        id: 'asc'
      },
      include: {
        user: {
          select: {
            name: true,
            birth: true,
            generation: true,
            username: true,
            connect: true
          }
        }

      }
    });
    if (!result) throw new Error('Queue is empty');
    return result;
  }

}
