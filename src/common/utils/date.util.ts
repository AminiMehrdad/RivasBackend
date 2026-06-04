type DateInput = Date | number | string;

const persianDateFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function normalizeDate(date?: DateInput): Date {
  return date === undefined ? new Date() : new Date(date);
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function getJalaliParts(date: Date): Record<string, string> {
  const parts = persianDateFormatter.formatToParts(date);
  const dateParts = Object.fromEntries(
    parts
      .filter((part) => ['year', 'month', 'day'].includes(part.type))
      .map((part) => [part.type, part.value]),
  );

  return {
    jYYYY: dateParts.year ?? '',
    jMM: dateParts.month ?? '',
    jDD: dateParts.day ?? '',
    HH: padDatePart(date.getHours()),
    mm: padDatePart(date.getMinutes()),
    ss: padDatePart(date.getSeconds()),
  };
}

function formatJalaliDate(date: Date, format: string): string {
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const parts = getJalaliParts(date);

  return format.replace(/jYYYY|jMM|jDD|HH|mm|ss/g, (token) => parts[token] ?? token);
}

export const dateUtils = {
  toJalali(date?: DateInput, format = 'jYYYY/jMM/jDD'): string {
    return formatJalaliDate(normalizeDate(date), format);
  },

  nowJalali(format = 'jYYYY/jMM/jDD HH:mm:ss'): string {
    return formatJalaliDate(new Date(), format);
  },

  toJalaliDateTime(date?: DateInput): string {
    return formatJalaliDate(normalizeDate(date), 'jYYYY/jMM/jDD HH:mm:ss');
  },
};
