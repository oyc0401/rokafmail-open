import { describe, expect, test, it } from '@jest/globals';
import { getRecommendGenerationBinary } from './recommendDate';

describe('getRecommendGeneration 함수 테스트', () => {
  it('DB에 있는 첫 번째 기수보다 이전 날짜에 대해 830을 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2021-08-01"))).toBe(830);
  });

  it('입대일 기준 7일 전 날짜에 해당하는 기수를 정확히 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2021-08-30"))).toBe(830); // 830 기수의 입대일 7일 전
  });

  it('입대일 기준 7일 전 이후부터 입대일 전까지 날짜에 해당 기수를 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2021-09-05"))).toBe(830); // 입대일 직전
  });

  it('모든 기수를 넘는 날짜에 대해 마지막 기수를 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2026-10-01"))).toBe(864); // 마지막 기수
  });

  it('특정 기수의 입대일 당일 날짜에 대해 올바른 기수를 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2021-09-06"))).toBe(830); // 830 기수의 입대일
  });

  it('특정 기수의 입대일 기준 7일 후 날짜에 대해 올바른 기수를 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2021-09-13"))).toBe(830); // 830 기수의 입대일 7일 후
  });

  it('연도 넘어가는 날짜에 대해 올바른 기수를 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2021-12-31"))).toBe(833); // 833 기수 검증
  });

  it('다양한 유효 날짜에 대해 올바른 기수를 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2022-01-03"))).toBe(834); // 834 기수 검증
    expect(getRecommendGenerationBinary(new Date("2022-02-06"))).toBe(834); // 같은 기수의 다른 날짜
    expect(getRecommendGenerationBinary(new Date("2022-03-13"))).toBe(835); // 다음 기수 검증
  });

  it('마지막 기수의 입대일 당일 날짜에 대해 올바른 기수를 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2024-12-23"))).toBe(864); // 864 기수 검증
  });

  it('마지막 기수 입대일 기준 7일 후 날짜에 대해 올바른 기수를 반환한다', () => {
    expect(getRecommendGenerationBinary(new Date("2025-12-31"))).toBe(864); // 864 기수의 입대일 7일 후
  });
});