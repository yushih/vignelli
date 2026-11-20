chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['injected.js']
    });
  } catch (error) {
    console.warn('Vignelli could not start on this page.', error);
  }
});
