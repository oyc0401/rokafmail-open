import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import { timeDB, isEmpty, startGeneration } from "./DB";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);


dayjs.tz.setDefault("Asia/Seoul") // tz로 dayjs를 만들면 해당시간의 나라시간이 됌

/** 포맷하고 싶으면 .format("YY.MM.DD") 붙이기 */

// 시간

// 입대예정 ---- 입대 -- 편지시작 --- 편지 끝 - 훈련소 수료 -------- 전역자 --- 민간인
// 입대예정 / 편지 시작전 / 편지가능 / 편지끝 / 수료전 / 수료후 / 전역

/**
 * 주어진 날짜가 속한 주의 월요일을 반환하는 함수
 * @param {Dayjs} date - 주어진 날짜
 * @returns {Dayjs} 해당 주의 월요일
 */
function getProgramStart(generation: number): Dayjs {
  const enter = getEnter(generation);

  const dayOfWeek = enter.day();
  return enter.subtract(dayOfWeek - 1, "day");
}

// 입대
export function getEnter(generation: number): Dayjs {
  const [start] = timeDB(generation);

  return dayjs.tz(start);
}
// 편지 시작
export function getMailStart(generation: number): Dayjs {
  return getProgramStart(generation).add(14, "day").add(9, "hour");
}

// 편지 마감
export function getMailEnd(generation: number): Dayjs {
  return getProgramStart(generation).add(30, "day").add(17, "hour");
}

// 수료
export function getCompletion(generation: number): Dayjs {
  return getProgramStart(generation).add(32, "day");
}

// 전역
export function getDischarge(generation: number): Dayjs {
  const [, end] = timeDB(generation);
  return dayjs.tz(end);
}

export enum Status {
  before, // 입대 전
  beginning, // 훈련 1, 2주차
  training, // 훈련 3, 4, 5주차
  ending, // 편지쓰기 기간 끝나고, 수료 전
  working, // 군 복무 중
  discharged, // 전역 후
}

/**  
 * 복무상태
 *
 switch (status) {
  case Status.before:
  case Status.beginning:
  case Status.training:
  case Status.ending:
  case Status.working:
  case Status.discharged:
}
 */

export function serveStatus(generation: number) {
  if (isFuture(getEnter(generation))) {
    return Status.before;
  } else if (isFuture(getMailStart(generation))) {
    return Status.beginning;
  } else if (isFuture(getMailEnd(generation))) {
    // 편지쓰기 가능
    return Status.training;
  } else if (isFuture(getCompletion(generation))) {
    return Status.ending;
  } else if (isFuture(getDischarge(generation))) {
    return Status.working;
  } else {
    return Status.discharged;
  }
}



export function toStatus(generation: number, now: Date | Dayjs = new Date()): Status {
  if (dayjs.tz(now).isBefore(getEnter(generation))) {
    return Status.before;
  }
  if (dayjs.tz(now).isBefore(getMailStart(generation))) {
    return Status.beginning;
  }
  if (dayjs.tz(now).isBefore(getMailEnd(generation))) {
    return Status.training;
  }
  if (dayjs.tz(now).isBefore(getCompletion(generation))) {
    return Status.ending;
  }
  if (dayjs.tz(now).isBefore(getDischarge(generation))) {
    return Status.working;
  }

  return Status.discharged;

}

export function canSearch(generation: number) {
  return isPast(getMailStart(generation).add(3, "day"));
}

// 기수의 입영일을 아는지
export function knowTime(generation: number) {
  return !isEmpty(generation);
}

// 전역했는지
export function isDischarged(generation: number): boolean {
  if (generation < startGeneration) return true;
  if (!knowTime(generation)) return false;

  const now = dayjs.utc().tz("Asia/Seoul");
  return getDischarge(generation).isBefore(now);
}

// 현재와 차이나는 날짜
export function diffDay(date: Dayjs): number {
  const now = dayjs.utc().tz("Asia/Seoul");
  return date.diff(now, "day");
}

// 해당 날짜가 과거인지
export function isPast(date: Dayjs): boolean {
  const now = dayjs.utc().tz("Asia/Seoul");
  return date.isBefore(now);
}

// 해당 날짜가 미래인지
export function isFuture(date: Dayjs): boolean {
  const now = dayjs.utc().tz("Asia/Seoul");
  return now.isBefore(date);
}

// 현재시각
export function getNow(): Date {
  return dayjs.utc().tz("Asia/Seoul").toDate();
}

// 아직 메일쓰기 기간이 오지 않았을 때
export function mailStartIsFuture(generation: number): boolean {
  return isFuture(getMailStart(generation));
}

// 아직 메일쓰기 기간이 끝났을 때
export function mailEnded(generation: number): boolean {
  return isPast(getMailStart(generation));
}

// Date to Datejs
export function parseKorea(date: Date) {
  return dayjs.utc(date).tz("Asia/Seoul");
}


/**
 * string to Dayjs
 */
export function strToDayjs(date: string) {
  return dayjs.tz(date);
}


/**
 * @deprecated 서울로 설정한 dayjs.tz(koreaTimeStr).utc() 함수의 하위호환 입니다.
 */
export function koreanToUtc(koreaTimeStr: any) {
  return dayjs.utc(koreaTimeStr).add(-9, "hour"); // 시차 9시간 뺌;
}


export function postMailDday(generation: number) {

  const start = getMailStart(generation);
  const now = dayjs.tz();
  const diff = start.diff(now, "hour");
  return diff

}

export function postMailDMinute(generation: number) {

  const start = getMailStart(generation);
  const now = dayjs.tz();
  const diff = start.diff(now, "minute");
  return diff

}


export function minuteToStr(minutes) {
  const minutesPerDay = 1440;
  const minutesPerHour = 60;

  const days = Math.floor(minutes / minutesPerDay);
  const hours = Math.floor((minutes % minutesPerDay) / minutesPerHour);
  const remainingMinutes = minutes % minutesPerHour;

  let result = '';

  if (days > 0) {
    result += `${days}일`;
  }
  if (hours > 0) {
    if (result.length > 0) {
      result += ' ';
    }
    result += `${hours}시간`;
  }
  // 수정: 일이 나올 경우 분은 표시하지 않습니다.
  if (days === 0 && remainingMinutes > 0) {
    if (result.length > 0) {
      result += ' ';
    }
    result += `${remainingMinutes}분`;
  }

  return result || '0분';
}