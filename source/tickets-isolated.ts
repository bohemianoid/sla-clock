(window => {
  if (!window.App && window.appData) {
    window.location.reload();
    return;
  }

  if (window.App) {
    // eslint-disable-next-line unicorn/no-lonely-if
    if (window.App.convos) {
      // eslint-disable-next-line unicorn/no-lonely-if
      if (window.App.convos.pager.hasNext) {
        window.location.href = `${
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          window.App.convos.pager.baseURL
        }1/${
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          window.App.convos.pager.total
        }/`;
        return;
      }
    }
  }

  async function sendTickets(): Promise<void> {
    if (window.App) {
      // eslint-disable-next-line unicorn/no-lonely-if
      if (window.App.convos) {
        const convos = window.App.convos.models;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (Object.entries(convos).length > 0) {
          window.postMessage({
            type: 'tickets',
            data: JSON.parse(JSON.stringify(convos))
          }, '*');
        } else {
          window.postMessage({
            type: 'huzzah'
          }, '*');
        }
      }
    }
  }

  window.addEventListener('message', ({data: {type}}) => {
    if (type === 'send-tickets') {
      sendTickets();
    }
  });

  sendTickets();
})(window);
