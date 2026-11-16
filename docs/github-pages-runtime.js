// The public website uses the existing hosted API; no API keys are sent to the browser.
(() => {
  const apiOrigin = 'https://ai-home-kitchen-assistant.toastyflora5.chatgpt.site';
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, options) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return nativeFetch(apiOrigin + input, {...options, credentials: 'omit', mode: 'cors'});
    }
    return nativeFetch(input, options);
  };
})();
