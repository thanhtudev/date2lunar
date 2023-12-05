// Mathematical constant PI
const PI: number = Math.PI;

// Function to round down a number
function INT(d: number): number {
  return Math.floor(d);
}

// Calculate Julian Day from date
function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  const jd =
    dd +
    INT((153 * m + 2) / 5) +
    365 * y +
    INT(y / 4) -
    INT(y / 100) +
    INT(y / 400) -
    32045;

  // Adjust for Julian to Gregorian calendar transition
  if (jd < 2299161) {
    return dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }

  return jd;
}

// Convert Julian Day to date
function jdToDate(jd: number): number[] {
  const a = jd > 2299160 ? jd + 32044 : 0;
  const b = a > 0 ? INT((4 * a + 3) / 146097) : 0;
  const c = a > 0 ? a - INT((b * 146097) / 4) : jd + 32082;

  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  const day = e - INT((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * INT(m / 10);
  const year = b * 100 + d - 4800 + INT(m / 10);

  return [day, month, year];
}

// Calculate time of the New Moon
function NewMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;

  // Initial approximation for New Moon time
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;

  // Additional corrections
  Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(dr * 2 * Mpr) -
    0.0004 * Math.sin(dr * 3 * Mpr) +
    0.0104 * Math.sin(dr * 2 * F) -
    0.0051 * Math.sin(dr * (M + Mpr)) -
    0.0074 * Math.sin(dr * (M - Mpr)) +
    0.0004 * Math.sin(dr * (2 * F + M)) -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr)) +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M));

  let deltat;

  // Additional correction for different time periods
  if (T < -11) {
    deltat =
      0.001 +
      0.000839 * T +
      0.0002261 * T2 -
      0.00000845 * T3 -
      0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }

  // Final New Moon time
  return Jd1 + C1 - deltat;
}

// Calculate the Sun's longitude
function SunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;

  // Mean anomaly and mean longitude of the Sun
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;

  // Corrections to mean longitude
  const DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);

  // True longitude of the Sun
  let L = L0 + DL;
  L = L * dr;
  L = L - PI * 2 * INT(L / (PI * 2));

  return L;
}

// Get the Sun's longitude for a given day
function getSunLongitude(dayNumber: number, timeZone: number): number {
  return INT((SunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6);
}

// Get the day of the New Moon for a given lunation and timezone
function getNewMoonDay(k: number, timeZone: number): number {
  return INT(NewMoon(k) + 0.5 + timeZone / 24);
}

// Get the day of the 11th new moon for a given lunar year and timezone
function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);

  // Correct for the case where the 11th new moon is after the 12th new moon
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }

  return nm;
}

// Get the offset for the leap month in a given lunar year and timezone
function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);

  // Find the difference between solar longitudes of consecutive lunations
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);

  return i - 1;
}

// Convert a solar date to lunar date
export function convertSolar2Lunar(
  dd: number,
  mm: number,
  yy: number,
): number[] {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  const monthStart = getNewMoonDay(k + 1, 7);

  let a11 = getLunarMonth11(yy, 7);
  let b11 = a11;

  // Determine the correct lunar year for the given solar date
  if (a11 >= monthStart) {
    const temp = getLunarMonth11(yy - 1, 7);
    a11 = temp;
  } else {
    const temp = getLunarMonth11(yy + 1, 7);
    b11 = temp;
  }

  let lunarYear = a11 >= monthStart ? yy : yy + 1;
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarLeap = 0;
  let lunarMonth = diff + 11;

  // Adjust for leap months
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, 7);

    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;

      if (diff === leapMonthDiff) {
        lunarLeap = 1;
      }
    }
  }

  // Normalize lunar month
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }

  // Adjust lunar year if needed
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return [lunarDay, lunarMonth, lunarYear, lunarLeap];
}

// Convert a lunar date to solar date
export function convertLunar2Solar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap: number,
): number[] {
  let a11, b11, off, leapOff, leapMonth;

  // Find the 11th new moon of the lunar year
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, 7);
    b11 = getLunarMonth11(lunarYear, 7);
  } else {
    a11 = getLunarMonth11(lunarYear, 7);
    b11 = getLunarMonth11(lunarYear + 1, 7);
  }

  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  off = lunarMonth - 11;

  // Normalize the offset
  if (off < 0) {
    off += 12;
  }

  // Adjust for leap months
  if (b11 - a11 > 365) {
    leapOff = getLeapMonthOffset(a11, 7);
    leapMonth = leapOff - 2;

    // Normalize the leap month
    if (leapMonth < 0) {
      leapMonth += 12;
    }

    // Check for valid leap month
    if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
      return [0, 0, 0];
    } else if (lunarLeap !== 0 || off >= leapOff) {
      off += 1;
    }
  }

  // Find the day of the 11th new moon
  const monthStart = getNewMoonDay(k + off, 7);

  // Convert the Julian day to Gregorian date
  return jdToDate(monthStart + lunarDay - 1);
}
