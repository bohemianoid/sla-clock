import {ipcRenderer} from 'electron';
import {
  add,
  set,
} from 'date-fns';
import elementReady from 'element-ready';
import selectors from './selectors.js';

ipcRenderer.on('log-out', async () => {
  document.querySelector<HTMLElement>(selectors.accountDropdown)!.click();

  const logOut: HTMLElement = await elementReady(
    selectors.logOutMenuItem, {
      stopOnDomReady: false,
    },
  );
  logOut.click();

  await ipcRenderer.invoke('config-reset', 'mailboxFolderUrl');
});

async function createTicket(entry: any): Promise<Ticket> {
  const ticket: Partial<Ticket> = {};

  ticket.id = entry.id;
  ticket.customer = entry.customer.fullName;
  ticket.subject = entry.subject;
  ticket.number = entry.number;
  ticket.status = entry.status;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  ticket.tags = entry.tags === null ? [] : entry.tags.map(tag => tag.name);

  if (typeof entry.waitingSince === 'string') {
    ticket.waitingSince = entry.waitingSince === ''
      ? new Date(entry.modifiedAt)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      : new Date(Date.parse(`${entry.waitingSince} UTC`));
  } else {
    ticket.waitingSince = new Date(entry.waitingSince);
  }

  const slaStart = set(new Date(), {
    hours: await ipcRenderer.invoke('config-get', 'slaStart.hours'),
    minutes: await ipcRenderer.invoke('config-get', 'slaStart.minutes'),
    seconds: 0,
    milliseconds: 0,
  });
  const slaEnd = set(new Date(), {
    hours: await ipcRenderer.invoke('config-get', 'slaEnd.hours'),
    minutes: await ipcRenderer.invoke('config-get', 'slaEnd.minutes'),
    seconds: 0,
    milliseconds: 0,
  });

  let sla = await ipcRenderer.invoke('config-get', 'slaGeneral');

  if (ticket.tags.includes('priority-support')) {
    sla = await ipcRenderer.invoke('config-get', 'slaPriority');
  }

  if (ticket.waitingSince < slaStart) {
    ticket.sla = add(slaStart, {
      hours: sla.hours,
      minutes: sla.minutes,
    });
  } else if (ticket.waitingSince > slaEnd) {
    ticket.sla = add(slaStart, {
      days: 1,
      hours: sla.hours,
      minutes: sla.minutes,
    });
  } else {
    ticket.sla = add(ticket.waitingSince, {
      hours: sla.hours,
      minutes: sla.minutes,
    });
  }

  return ticket as Ticket;
}

async function createTicketList(data: any): Promise<Ticket[]> {
  const tickets: Ticket[] = await Promise.all(data.map(
    async entry => createTicket(entry),
  ));

  return tickets;
}

async function createHuzzahMessage(): Promise<Huzzah> {
  const content = await elementReady(
    selectors.emptyFolderContent, {
      stopOnDomReady: false,
    },
  );

  const huzzah: Partial<Huzzah> = {};

  if (!content) {
    console.error(
      'Could not find empty folder content',
      selectors.emptyFolderContent,
    );

    return huzzah as Huzzah;
  }

  huzzah.title = content.querySelector<HTMLElement>('h2, h4')!.textContent;
  huzzah.body = content.querySelector<HTMLElement>('p')!.textContent;

  const link = content.querySelector<HTMLLinkElement>('p > a');

  if (link) {
    huzzah.url = link.href;
  }

  return huzzah as Huzzah;
}

function sendTicketList(): void {
  window.postMessage({type: 'send-tickets'}, '*');
}

ipcRenderer.on('send-ticket-list', sendTicketList);

window.addEventListener('load', async () => {
  const mailbox = document.querySelector<HTMLElement>('#mainCol');
  const offlineUi = document.querySelector<HTMLElement>('.offline-ui');

  if (mailbox) {
    const ticketListObserver = new MutationObserver(sendTicketList);

    ticketListObserver.observe(mailbox, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }

  if (offlineUi) {
    const offlineObserver = new MutationObserver(() => {
      if (offlineUi.classList.contains('offline-ui-down')) {
        ipcRenderer.send('is-offline');
      }
    });

    offlineObserver.observe(offlineUi, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
});

window.addEventListener('message', async ({data: {type, data}}) => {
  if (type === 'tickets') {
    ipcRenderer.send('tickets', await createTicketList(data));
  }

  if (type === 'huzzah') {
    ipcRenderer.send('huzzah', await createHuzzahMessage());
  }
});
