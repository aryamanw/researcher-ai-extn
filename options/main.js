import { initOptionsPage } from './optionsPage.js';

const form = document.getElementById('settings-form');
const connectButton = document.getElementById('connect-openrouter');
const statusEl = document.getElementById('openrouter-status');
const autosaveStatusEl = document.getElementById('autosave-status');

initOptionsPage(form, connectButton, statusEl, autosaveStatusEl);
