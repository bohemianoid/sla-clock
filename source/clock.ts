import {
  NativeImage,
  nativeImage,
} from 'electron';
import {CronJob} from 'cron';
import {
  differenceInHours,
  differenceInMinutes,
  format,
  set,
} from 'date-fns';
import config from './config.js';
import tray from './tray.js';
import {
  getWindow,
  reloadWindow,
  sendAction,
} from './util.js';

const sendJob = new CronJob('0 * * * * *', () => {
  sendAction('send-ticket-list');
});
sendJob.start();

const syncJob = new CronJob('0 */5 * * * *', () => {
  if (!getWindow().isVisible()) {
    reloadWindow();
  }
});
syncJob.start();

export function formatTimer(sla: Date): string {
  sla = set(sla, {
    seconds: 0,
    milliseconds: 0,
  });
  const now = set(new Date(), {
    seconds: 0,
    milliseconds: 0,
  });
  const hh = differenceInHours(sla, now);
  const mm = differenceInMinutes(sla, now);

  return `${
    hh < 0 || mm < 0 ? '-' : '+'
  }${
    Math.abs(hh)
  }:${
    Math.abs(mm % 60)
      .toString()
      .padStart(2, '0')
  }`;
}

function getStatusIconName(sla: Date): string {
  const now = set(new Date(), {
    seconds: 0,
    milliseconds: 0,
  });
  const mm = differenceInMinutes(sla, now);

  if (mm < 20) {
    return 'NSStatusUnavailable';
  }

  if (mm < 60) {
    return 'NSStatusPartiallyAvailable';
  }

  return 'NSStatusAvailable';
}

export function getStatusIcon(sla: Date): NativeImage {
  return nativeImage
    .createFromNamedImage(getStatusIconName(sla))
    .resize({width: 12});
}

export function updateClock(sla: Date): void {
  tray.setIdle(false);

  if (config.get('hideClock')) {
    tray.setTitle('');
  } else {
    tray.setTitle(config.get('timerView')
      ? formatTimer(sla)
      : format(sla, 'HH:mm'));
  }
}
