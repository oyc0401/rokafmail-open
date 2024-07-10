import { store } from './DB'

import dayjs from 'dayjs';

/**
 * 날짜에 따른 추천하는 기수 보여주기
 * 전역변수에 저장해서 하루에 한번만 실행 됌
 */
export class RecommendGeneration {

  private static generation: number;
  private static lastUpdated?: Date;

  static getGeneration() {
    if (!RecommendGeneration.lastUpdated) {
      const init = getRecommendGenerationBinary(new Date());
      RecommendGeneration.setGeneration(init)
      return RecommendGeneration.generation;
    }

    if (dayjs(RecommendGeneration.lastUpdated).isBefore(dayjs().subtract(1, 'day'))) {
      const init = getRecommendGenerationBinary(new Date());
      RecommendGeneration.setGeneration(init)
      return RecommendGeneration.generation;
    }

    return RecommendGeneration.generation;
  }

  private static setGeneration(generation: number) {
    RecommendGeneration.generation = generation;
    RecommendGeneration.lastUpdated = new Date();
  }

}

/**
 * 날짜에 따른 추천하는 기수 보여주기
 * (이분탐색)
 */
export function getRecommendGenerationBinary(date: Date): number {
  const targetDate = dayjs(date);
  const generations = Object.keys(store).map(Number); // store의 키는 이미 정렬되어 있다고 가정

  let left = 0;
  let right = generations.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const startDate = dayjs(store[generations[mid]][0]).subtract(7, 'day');

    if (startDate.isAfter(targetDate)) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  if (left === 0) {
    return generations[0]; // DB에 있는 첫 번째 기수보다 이전 날짜는 첫 번째 기수를 반환
  }

  return generations[right];
}