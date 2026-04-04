export function parseLocalDateTime(value?: string | null): Date {
  const normalized = String(value || '').trim();
  if (!normalized) return new Date(NaN);

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    const [datePart, timePart] = normalized.split(' ');
    return new Date(`${datePart}T${timePart}`);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return new Date(`${normalized}:00`);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized);
  }

  return new Date(normalized);
}

export function formatLocalDateTime(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '-';
  const date = parseLocalDateTime(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString([], options);
}

export function formatLocalTime(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '-';
  const date = parseLocalDateTime(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString([], options);
}

export function toLocalInputDateTime(value?: string | null) {
  if (!value) return '';
  const date = parseLocalDateTime(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toApiLocalDateTime(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  return normalized;
}

export function getStartOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isPendingReminderFollowUp(value?: string | null, reminderDone?: boolean) {
  if (!value || reminderDone) return false;
  const reminderDate = parseLocalDateTime(value);
  if (Number.isNaN(reminderDate.getTime())) return false;
  const today = getStartOfLocalDay();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return reminderDate >= today && reminderDate < dayAfterTomorrow;
}

export function isPendingReminderOverdue(value?: string | null, reminderDone?: boolean) {
  if (!value || reminderDone) return false;
  const reminderDate = parseLocalDateTime(value);
  if (Number.isNaN(reminderDate.getTime())) return false;
  const today = getStartOfLocalDay();
  return reminderDate < today;
}
