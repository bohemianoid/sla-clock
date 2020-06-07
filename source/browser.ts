import {
  add,
  set
} from 'date-fns';
import { ipcRenderer } from 'electron';
import elementReady = require('element-ready');
import selectors from './selectors';

let isOnline = true;

ipcRenderer.on('log-out', async () => {
  document.querySelector<HTMLElement>(selectors.accountDropdown)!.click();

  const logOut: HTMLElement = await elementReady<HTMLElement>(
    selectors.logOutMenuItem, {
      stopOnDomReady: false
    }
  );
  logOut.click();

  await ipcRenderer.invoke('config-reset', 'mailboxFolderURL');
});

async function createTicket(entry: any): Promise<Ticket> {
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
    hours: await ipcRenderer.invoke('config-get', 'slaStart.hours'),
    minutes: await ipcRenderer.invoke('config-get', 'slaStart.minutes'),
    seconds: 0,
    milliseconds: 0
  });
  const slaEnd = set(new Date(), {
    hours: await ipcRenderer.invoke('config-get', 'slaEnd.hours'),
    minutes: await ipcRenderer.invoke('config-get', 'slaEnd.minutes'),
    seconds: 0,
    milliseconds: 0
  });

  if (ticket.waitingSince < slaStart) {
    ticket.sla = add(slaStart, {
      hours: await ipcRenderer.invoke('config-get', 'sla')
    });
  } else if (ticket.waitingSince > slaEnd) {
    ticket.sla = add(slaStart, {
      days: 1,
      hours: await ipcRenderer.invoke('config-get', 'sla')
    });
  } else {
    ticket.sla = add(ticket.waitingSince, {
      hours: await ipcRenderer.invoke('config-get', 'sla')
    });
  }

  return ticket as Ticket;
}

async function createTicketList(data: any): Promise<Ticket[]> {
  const tickets: Ticket[] = await Promise.all(data.map(createTicket));

  return tickets;
}

async function createHuzzahMessage(): Promise<Huzzah> {
  const content = await elementReady<HTMLElement>(
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
  if (isOnline === false) {
    return;
  }

  const ticketTable = document.querySelector<HTMLElement>('#tblTickets');
  const emptyFolder = document.querySelector<HTMLElement>('#emptyFolder');

  if (ticketTable) {
    window.postMessage({type: 'post-tickets'}, '*');
  } else if (emptyFolder) {
    ipcRenderer.send('huzzah', await createHuzzahMessage());
  }
}

ipcRenderer.on('send-mailbox-content', sendMailboxContent);

window.addEventListener('load', async () => {
  const mailbox = document.querySelector<HTMLElement>('#mainCol');
  const offlineUI = document.querySelector<HTMLElement>('.offline-ui');

  if (mailbox) {
    await sendMailboxContent();

    const mailboxContentObserver = new MutationObserver(sendMailboxContent);

    mailboxContentObserver.observe(mailbox, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  if (offlineUI) {
    const offlineObserver = new MutationObserver(() => {
      if (
        offlineUI.classList.contains('offline-ui-down')
        && isOnline === true
      ) {
        isOnline = false;
        ipcRenderer.send('is-offline');
      } else if (
        offlineUI.classList.contains('offline-ui-up')
        && isOnline === false
      ) {
        isOnline = true;
        ipcRenderer.send('is-online');
      }
    });

    offlineObserver.observe(offlineUI, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
});

window.addEventListener('message', ({ data: { type, data }}) => {
  if (type === 'tickets') {
    ipcRenderer.send('tickets', createTicketList(data));
  }
});
