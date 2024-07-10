
import { describe, expect, test } from '@jest/globals';
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
import { getEnter, getMailStart, getMailEnd, getCompletion, toStatus, Status, koreanToUtc, postMailDday, minuteToStr } from "./time";

dayjs.tz.setDefault("Asia/Seoul")

describe('time 라이브러리', () => {
  test('한국시간 변경', () => {

    // tz로 dayjs를 만들면 해당시간의 나라시간이 됌
    expect(dayjs.tz('2024-04-17 16:28:00').utc().format('YYYY-MM-DD HH:mm:ss'))
      .toBe('2024-04-17 07:28:00');


    expect(dayjs.tz('2024-04-17 16:28:00').format('YYYY-MM-DD HH:mm:ss'))
      .toBe(dayjs.utc('2024-04-17 07:28:00').tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss'));
    expect(dayjs.tz('2024-04-17 16:28:00').tz("America/New_York").format('YYYY-MM-DD HH:mm:ss'))
      .toBe(dayjs.utc('2024-04-17 07:28:00').tz("America/New_York").format('YYYY-MM-DD HH:mm:ss'));

    // 하지만 tz안에 Date나 dayjs가 오면 해당시간을 utc로 받아드림
    // 왜냐? date객체는 int와 같기 때문에.....
    expect(dayjs.tz(new Date('2024-04-17 16:28:00')).utc().format('YYYY-MM-DD HH:mm:ss'))
      .toBe('2024-04-17 16:28:00');
    expect(dayjs.tz(dayjs('2024-04-17 16:28:00')).utc().format('YYYY-MM-DD HH:mm:ss'))
      .toBe('2024-04-17 16:28:00');
    expect(dayjs.tz(dayjs('2024-04-17 16:28:00').tz("Asia/Seoul")).utc().format('YYYY-MM-DD HH:mm:ss'))
      .toBe('2024-04-17 16:28:00');

    // new Date() 로 만든 날짜는 현재가 한국이라는걸 알고, utc기준으로 생성된다.
    // 하지만 new Date( 문자열:utc값 )로 만든 날짜는 그 값이 utc가 된다.
    // 그럼 newDate로 만든 시간하고 현재 시간하고 utc 기준으로 시을 검사해보면 다르겠네...

  });

  test('850기', () => {
    expect(getEnter(850).format('YYYY-MM-DD HH:mm:ss')).toBe('2023-08-14 00:00:00');
    expect(getMailStart(850).format('YYYY-MM-DD HH:mm:ss')).toBe('2023-08-28 09:00:00');
    expect(getMailEnd(850).format('YYYY-MM-DD HH:mm:ss')).toBe('2023-09-13 17:00:00');
    expect(getCompletion(850).format('YYYY-MM-DD HH:mm:ss')).toBe('2023-09-15 00:00:00');
  });

  test('toStatus() 테스트', () => {

    // 입대 전
    expect(toStatus(850, dayjs.tz('2023-08-13 23:00:00'))).toBe(Status.before);
    expect(toStatus(850, dayjs.tz('2023-08-13 23:59:59').toDate())).toBe(Status.before);
    expect(toStatus(850, dayjs.tz('2023-08-14 00:00:00'))).not.toBe(Status.before);
    expect(toStatus(850, dayjs.tz('2023-08-14').toDate())).not.toBe(Status.before);

    // 훈련소 초반
    expect(toStatus(850, dayjs.tz('2023-08-13 23:59:59'))).not.toBe(Status.beginning);
    expect(toStatus(850, dayjs.tz('2023-08-14 00:00:00'))).toBe(Status.beginning);
    expect(toStatus(850, dayjs.tz('2023-08-28 08:59:59'))).toBe(Status.beginning);
    expect(toStatus(850, dayjs.tz('2023-08-28 09:00:00'))).not.toBe(Status.beginning);

    // 편지쓰기 기간
    expect(toStatus(850, dayjs.tz('2023-08-28 08:59:59'))).not.toBe(Status.training);
    expect(toStatus(850, dayjs.tz('2023-08-28 09:00:00'))).toBe(Status.training);
    expect(toStatus(850, dayjs.tz('2023-09-13 16:59:59'))).toBe(Status.training);
    expect(toStatus(850, dayjs.tz('2023-09-13 17:00:00'))).not.toBe(Status.training);

    // 수료 전
    expect(toStatus(850, dayjs.tz('2023-09-13 16:59:59'))).not.toBe(Status.ending);
    expect(toStatus(850, dayjs.tz('2023-09-13 17:00:00'))).toBe(Status.ending);
    expect(toStatus(850, dayjs.tz('2023-09-14 23:59:59'))).toBe(Status.ending);
    expect(toStatus(850, dayjs.tz('2023-09-15 00:00:00'))).not.toBe(Status.ending);

    // 수료 후
    expect(toStatus(850, dayjs.tz('2023-09-14 23:59:59'))).not.toBe(Status.working);
    expect(toStatus(850, dayjs.tz('2023-09-15 00:00:00'))).toBe(Status.working);
    expect(toStatus(850, dayjs.tz('2025-05-12 23:59:59'))).toBe(Status.working);
    expect(toStatus(850, dayjs.tz('2023-05-13 00:00:00'))).not.toBe(Status.working);

    // 전역 후
    expect(toStatus(850, dayjs.tz('2025-05-12 23:59:59'))).not.toBe(Status.discharged);
    expect(toStatus(850, dayjs.tz('2025-05-13 00:00:00'))).toBe(Status.discharged);
  });






  test('minuteToStr 함수 테스트', () => {
    expect(minuteToStr(0)).toBe('0분');
    expect(minuteToStr(3)).toBe('3분');
    expect(minuteToStr(59)).toBe('59분');
    expect(minuteToStr(60)).toBe('1시간');
    expect(minuteToStr(67)).toBe('1시간 7분');
    expect(minuteToStr(90)).toBe('1시간 30분');
    expect(minuteToStr(1440)).toBe('1일');
    expect(minuteToStr(1450)).toBe('1일');
    expect(minuteToStr(1500)).toBe('1일 1시간');
    expect(minuteToStr(1568)).toBe('1일 2시간');
  });
})
