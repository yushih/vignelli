chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return;
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['injected.js']
    });
    if (injection.result === 'started') {
      await chrome.action.setPopup({ tabId: tab.id, popup: 'popup.html' });
      try {
        await chrome.action.openPopup({ windowId: tab.windowId });
      } finally {
        // Route the next click back through this listener.
        await chrome.action.setPopup({ tabId: tab.id, popup: '' });
      }
    }
  } catch (error) {
    console.warn('Vignelli could not start on this page.', error);
  }
});
