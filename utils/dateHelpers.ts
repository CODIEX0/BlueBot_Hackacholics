/**
 * Date utility functions for financial data
 */

export const formatDate = (
  date: string | Date,
  options: {
    format?: 'short' | 'medium' | 'long' | 'relative';
    includeTime?: boolean;
  } = {}
): string => {
  const { format = 'medium', includeTime = false } = options;
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'relative') {
    return formatRelativeDate(dateObj);
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: format === 'short' ? '2-digit' : 'numeric',
    month: format === 'short' ? 'numeric' : format === 'medium' ? 'short' : 'long',
    day: 'numeric',
  };

  if (includeTime) {
    dateOptions.hour = '2-digit';
    dateOptions.minute = '2-digit';
  }

  return dateObj.toLocaleDateString('en-ZA', dateOptions);
};

const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

export const getDateRange = (
  period: 'week' | 'month' | 'quarter' | 'year',
  offset: number = 0
): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'week':
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek - (offset * 7));
      end.setDate(start.getDate() + 6);
      break;

    case 'month':
      start.setMonth(now.getMonth() - offset, 1);
      end.setMonth(start.getMonth() + 1, 0);
      break;

    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const targetQuarter = currentQuarter - offset;
      start.setMonth(targetQuarter * 3, 1);
      end.setMonth(start.getMonth() + 3, 0);
      break;

    case 'year':
      start.setFullYear(now.getFullYear() - offset, 0, 1);
      end.setFullYear(start.getFullYear(), 11, 31);
      break;
  }

  // Set time to start/end of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const isDateInRange = (
  date: string | Date,
  start: Date,
  end: Date
): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj >= start && dateObj <= end;
};

export const getDaysUntil = (targetDate: string | Date): number => {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  const diffInMs = target.getTime() - now.getTime();
  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
};

export const getMonthName = (monthIndex: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex] || '';
};

export const getWeekdayName = (dayIndex: number): string => {
  const days = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
    'Thursday', 'Friday', 'Saturday'
  ];
  return days[dayIndex] || '';
};

export const formatTimeAgo = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  
  const minutes = Math.floor(diffInMs / (1000 * 60));
  const hours = Math.floor(diffInMs / (1000 * 60 * 60));
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return formatDate(dateObj, { format: 'short' });
  }
};

export const isToday = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
};

export const isThisWeek = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const { start, end } = getDateRange('week');
  return isDateInRange(dateObj, start, end);
};

export const isThisMonth = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const { start, end } = getDateRange('month');
  return isDateInRange(dateObj, start, end);
};