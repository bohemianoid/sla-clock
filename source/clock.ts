import cron = require('cron');
import {
  differenceInHours,
  differenceInMinutes,
  format,
  set
} from 'date-fns';
import {
  BrowserWindow,
  NativeImage,
  nativeImage
} from 'electron';
import config from './config';
import tray from './tray';

let sla: Date;

const cronJob = new cron.CronJob('0 * * * * *', () => {
  const [win] = BrowserWindow.getAllWindows();
  win.webContents.send('send-mailbox-content');
});

export function formatTimer(sla: Date): string {
  const now = set(new Date(), {
    seconds: 0,
    milliseconds: 0
  });
  const hh = differenceInHours(sla, now);
  const mm = differenceInMinutes(sla, now);

  return `${
    hh<0 || mm<0 ? '-' : '+'
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
    milliseconds: 0
  });
  const mm = differenceInMinutes(sla, now);

  if (mm < 20) {
    return 'NSStatusUnavailable';
  }

  if (mm < 60) {
    return 'NSStatusPartiallyAvailable'
  }

  return 'NSStatusAvailable';
}

export function getStatusIcon(sla: Date): NativeImage {
  return nativeImage
           .createFromNamedImage(getStatusIconName(sla))
           .resize({width: 12});
}

export function updateClock(date?: Date): void {
  if (date) {
    sla = set(date, {
      seconds: 0,
      milliseconds: 0
    });
  }

  if (sla) {
    if (config.get('hideClock')) {
      tray.setTitle('');
    } else {
      tray.setTitle(config.get('timerView')
                    ? formatTimer(sla)
                    : format(sla, 'HH:mm'));
    }

    if (config.get('timerView') || !cronJob.running) {
      cronJob.start();
    } else {
      cronJob.stop();
    }
  }
}

export function stopClock(): void {
  cronJob.stop();
}
