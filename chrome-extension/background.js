// ZaSync Chrome Extension - Background Service Worker
// Opens the ZaSync app in a dedicated tab when extension icon is clicked

chrome.action.onClicked.addListener(() => {
    // Check if ZaSync tab already exists
    chrome.tabs.query({}, (tabs) => {
        const existingTab = tabs.find(tab =>
            tab.url && tab.url.includes(chrome.runtime.getURL('app/index.html'))
        );

        if (existingTab && existingTab.id) {
            // Focus existing tab
            chrome.tabs.update(existingTab.id, { active: true });
            if (existingTab.windowId) {
                chrome.windows.update(existingTab.windowId, { focused: true });
            }
        } else {
            // Open new tab with the app
            chrome.tabs.create({
                url: chrome.runtime.getURL('app/index.html'),
            });
        }
    });
});
