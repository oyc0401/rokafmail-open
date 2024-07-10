import { parseKorea } from "src/lib/time";

export function dateToStr(date: Date) {
  if (isToday(date)) {
    return toStringTime(date);
  } else {
    return toStringByFormatting(date, ".");
  }
}

function isToday(date: Date) {
  const today: Date = new Date();
  //console.log(date);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function leftPad(value: number) {
  if (value >= 10) {
    return value;
  }
  return `0${value}`;
}

function toStringTime(source: Date, delimiter = ":") {
   const koreaDate=parseKorea(source);
  const hour = leftPad(koreaDate.hour());
  const minute = leftPad(koreaDate.minute());
  return [hour, minute].join(delimiter);
}

function toStringByFormatting(source: Date, delimiter = "-") {
  const koreaDate=parseKorea(source);
  const year = koreaDate.year();
  const month = leftPad(koreaDate.month()+1);
  const day = leftPad(koreaDate.date());

  return [year, month, day].join(delimiter);
}
