'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Safe API surface exposed to the renderer via contextBridge.
 * The renderer has NO direct Node.js or Electron access — only what's listed here.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ── App info ───────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),

  // ── Shell ──────────────────────────────────────────────────
  /** Open a URL in the OS default browser. Only http/https is allowed by main. */
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // ── Window controls (for custom titlebar) ──────────────────
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // ── Persistent config ──────────────────────────────────────
  /** Read a key from userData/config.json (returns null if not set). */
  getConfig: (key) => ipcRenderer.invoke('config:get', key),
  /** Write a key/value to userData/config.json. */
  setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),
});
