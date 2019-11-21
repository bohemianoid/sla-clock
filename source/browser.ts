import {
  addDays,
  addHours,
  set
} from 'date-fns';
import { ipcRenderer } from 'electron';
import elementReady = require('element-ready');
import config from './config';
import selectors from './selectors';

ipcRenderer.on('log-out', async () => {
  config.reset('mailboxFolderURL');

  document.querySelector<HTMLElement>('.c-AccountDropdownToggle')!.click();

  const logOut: HTMLElement = await elementReady<HTMLElement>('#jsLogout', {
    stopOnDomReady: false
  });
  logOut.click();
});

function createTicket(entry: any): Ticket {
  const ticket: Partial<Ticket> = {};

  ticket.id = entry.id;
  ticket.customer = entry.customer.fullName;
  ticket.subject = entry.subject;
  ticket.number = entry.number;
  ticket.status = entry.status;

  if (typeof entry.waitingSince === 'string') {
    if (entry.waitingSince === '') {
      ticket.waitingSince = new Date(entry.modifiedAt);
    } else {
      ticket.waitingSince = new Date(Date.parse(`${entry.waitingSince} UTC`));
    }
  } else {
    ticket.waitingSince = new Date(entry.waitingSince);
  }

  const slaStart = set(new Date(), {
    hours: config.get('slaStart.hours' as any),
    minutes: config.get('slaStart.minutes' as any),
    seconds: 0,
    milliseconds: 0
  });
  const slaEnd = set(new Date(), {
    hours: config.get('slaEnd.hours' as any),
    minutes: config.get('slaEnd.minutes' as any),
    seconds: 0,
    milliseconds: 0
  });

  if (ticket.waitingSince < slaStart) {
    ticket.sla = addHours(slaStart, config.get('sla'));
  } else if (ticket.waitingSince > slaEnd) {
    ticket.sla = addDays(addHours(slaStart, config.get('sla')), 1);
  } else {
    ticket.sla = addHours(ticket.waitingSince, config.get('sla'));
  }

  return ticket as Ticket;
}

function createTicketList(data: any): Ticket[] {
  const tickets: Ticket[] = data.map(createTicket);

  return tickets;
}

async function createHuzzahMessage(): Promise<Huzzah> {
  const content: HTMLElement = await elementReady<HTMLElement>(
    selectors.emptyFolderContent, {
      stopOnDomReady: false
    }
  );

  const huzzah: Partial<Huzzah> = {};

  if (!content) {
    console.error(
      'Could not find empty folder content',
      selectors.emptyFolderContent
    );

    return huzzah as Huzzah;
  }

  huzzah.title = content.querySelector<HTMLElement>('h4')!.textContent;
  huzzah.body = content.querySelector<HTMLElement>('p')!.textContent;

  const link = content.querySelector<HTMLElement>('p > a');

  if (link) {
    huzzah.url = link.getAttribute('href');
  }

  return huzzah as Huzzah;
}

async function sendMailboxContent(): Promise<void> {
  const ticketTable = document.querySelector<HTMLElement>('#tblTickets');
  const emptyFolder = document.querySelector<HTMLElement>('#emptyFolder');

  if (ticketTable) {
    window.postMessage({type: 'post-tickets'}, '*');
  }

  if (emptyFolder) {
    ipcRenderer.send('huzzah', await createHuzzahMessage());
  }
}

ipcRenderer.on('send-mailbox-content', sendMailboxContent);

window.addEventListener('load', async () => {
  const mailbox = document.querySelector<HTMLElement>('#mainCol');

  if (mailbox) {
    await sendMailboxContent();

    const mailboxContentObserver = new MutationObserver(sendMailboxContent);

    mailboxContentObserver.observe(mailbox, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
});

window.addEventListener('message', ({ data: { type, data }}) => {
  if (type === 'tickets') {
    ipcRenderer.send('tickets', createTicketList(data));
  }
});
