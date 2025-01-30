import { TimeExemption } from './types';
import * as cron from 'cron-parser';

export const isWithinTimeExemption = (exemption: TimeExemption, now = new Date()): boolean => {
  return exemption.times.some(time => {
    try {
      const cronExpression = cron.parseExpression(time, { currentDate: now });
      const prev = cronExpression.prev().toDate();
      const next = cronExpression.next().toDate();
      // Check if current time falls between the previous and next occurrence
      return now >= prev && now <= next;
    } catch (err) {
      console.error('Invalid cron expression:', time, err);
      return false;
    }
  });
};
