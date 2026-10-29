/*
 * Persistenz im Browser (localStorage). Fehler (privater Modus, voller
 * Speicher) werden abgefangen und gemeldet statt die App abstürzen zu lassen.
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});
  var M = UP.model;

  var KEY = 'urlaubsplaner.state';
  var KEY_EXPORT = 'urlaubsplaner.lastExport';

  function ls() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  /** Lädt den Stand; bei fehlenden/kaputten Daten den Standard. */
  function load() {
    var store = ls();
    var raw = null;
    try { raw = store && store.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) return { state: M.createDefaultState(), warning: null };
    try {
      var res = M.validateState(JSON.parse(raw));
      if (res.ok) return { state: res.state, warning: null };
      return { state: M.createDefaultState(), warning: 'Gespeicherte Daten waren beschädigt und wurden nicht geladen: ' + res.errors.join(' ') };
    } catch (e) {
      return { state: M.createDefaultState(), warning: 'Gespeicherte Daten konnten nicht gelesen werden.' };
    }
  }

  /** Speichert den Stand. Rückgabe true bei Erfolg. */
  function save(state) {
    var store = ls();
    if (!store) return false;
    try {
      store.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getLastExport() {
    var store = ls();
    try { return (store && store.getItem(KEY_EXPORT)) || null; } catch (e) { return null; }
  }

  function setLastExport(isoTimestamp) {
    var store = ls();
    try { if (store) store.setItem(KEY_EXPORT, isoTimestamp); } catch (e) { /* ignorieren */ }
  }

  UP.storage = {
    load: load,
    save: save,
    getLastExport: getLastExport,
    setLastExport: setLastExport
  };
})(typeof window !== 'undefined' ? window : globalThis);
