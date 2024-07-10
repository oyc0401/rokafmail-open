import { describe, expect, test, beforeEach } from '@jest/globals';
import MockRokafClient from './MockRokafClient';

describe('RokafClient Test', () => {
  
  test('getProfile Mocking', async () => {
    const rokafClient = new MockRokafClient();
    rokafClient.changeGetProfileReturnValue({
      member: {
        memberSeq: '12341234',
        sodae: '1111',
      },
      serverOn: true,
    });

    const response = await rokafClient.getProfile('이름', '12341234');

    expect(response.serverOn).toBe(true);
    expect(response.member).toStrictEqual({
      memberSeq: '12341234',
      sodae: '1111',
    });
  });

  test('PostMail Mocking', async () => {
    const rokafClient = new MockRokafClient();
    rokafClient.changePostMailReturnValue({
      serverOn: true,
      complete: true,
    });

    const response = await rokafClient.postMail({
      name: '유찬', relationship: '친구',
      title: '제목', contents: 'contents',
      password: '0000', sodae: '1234', memberSeq: '1234522'
    });


    expect(response.serverOn).toBe(true);
    expect(response.complete).toBe(true);
  });
})
