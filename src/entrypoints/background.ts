export default defineBackground(() => {
  // Clicking the toolbar icon toggles the side panel.
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error('setPanelBehavior failed', error));
});
