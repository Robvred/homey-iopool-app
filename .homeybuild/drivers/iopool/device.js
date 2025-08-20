'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');

class IopoolDevice extends Homey.Device {

  async onInit() {
    this.log('Device has been initialized');

    this.apiKey = (this.getSetting('apiKey') || '').trim();
    this.poolId = (this.getSetting('poolId') || '').trim();
    this.pollingInterval = this.getSetting('pollingInterval') || 5;

    this._isAvailable = true;

    this.startPolling();
  }

  async onAdded() {
    this.log('Device added');
  }

  async onDeleted() {
    this.log('Device deleted');
    this.stopPolling();
  }

  async onSettings({ changedKeys, newSettings }) {
    this.log('Settings changed:', changedKeys);

    if (changedKeys.includes('apiKey')) {
      this.apiKey = (newSettings.apiKey || '').trim();
    }
    if (changedKeys.includes('poolId')) {
      this.poolId = (newSettings.poolId || '').trim();
    }
    if (changedKeys.includes('pollingInterval')) {
      this.pollingInterval = newSettings.pollingInterval;
      this.startPolling();
    }

    this.pollData();
  }

  async startPolling() {
    this.stopPolling();
    this.pollingIntervalId = this.homey.setInterval(
      () => this.pollData(),
      this.pollingInterval * 60 * 1000
    );
    this.pollData();
  }

  stopPolling() {
    if (this.pollingIntervalId) {
      this.homey.clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  async pollData() {
    if (!this.apiKey || !this.poolId) {
      const reason = 'Missing apiKey or poolId in settings';
      this.log(reason);
      await this._setUnavailableOnce(reason);
      return;
    }

    try {
      const url = `https://api.iopool.com/v1/pools`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': this.apiKey,
        },
        timeout: 10000
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.log(`HTTP ${response.status} on ${url} — body: ${text?.slice(0, 300)}`);
        if (response.status === 401 || response.status === 403) {
          throw new Error('Auth failed (401/403): API key invalid or insufficient permissions');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const pools = await response.json();
      if (!Array.isArray(pools)) {
        throw new Error('Unexpected API response (not an array)');
      }

      const pool = pools.find(p => p && p.id === this.poolId);
      if (!pool) {
        const reason = `Pool ${this.poolId} not found`;
        this.log(reason);
        await this._setUnavailableOnce(reason);
        return;
      }

      await this._setAvailableOnce();
      this.updateCapabilitiesFromPool(pool);

    } catch (err) {
      this.log('Polling error:', err.message);
      await this._setUnavailableOnce(`API error: ${err.message}`);
    }
  }

  // Mappe le mode API vers l’enum Homey attendue
  normalizeMode(input) {
    if (!input || typeof input !== 'string') return undefined;
    const v = input.trim().toUpperCase();

    // Alias connus
    const aliases = {
      'GATEWAY': 'STANDARD',
      'NORMAL': 'STANDARD',
      'STD': 'STANDARD',
      'OPEN': 'OPENING',
      'START': 'INITIALIZATION',
      'INIT': 'INITIALIZATION',
      'WINTERING': 'WINTER',
    };

    const mapped = aliases[v] || v;
    const allowed = new Set(['STANDARD', 'OPENING', 'WINTER', 'INITIALIZATION']);
    return allowed.has(mapped) ? mapped : undefined;
  }

  updateCapabilitiesFromPool(pool) {
    const lm = pool.latestMeasure || {};

    // Température (°C)
    if (typeof lm.temperature === 'number') {
      this.setCapabilityValue('measure_temperature', lm.temperature).catch(this.error);
    }

    // pH
    if (typeof lm.ph === 'number') {
      this.setCapabilityValue('measure_ph', lm.ph).catch(this.error);
    }

    // ORP (mV)
    if (typeof lm.orp === 'number') {
      this.setCapabilityValue('measure_orp', lm.orp).catch(this.error);
    }

    // Durée de filtration (heures)
    if (pool.advice && typeof pool.advice.filtrationDuration === 'number') {
      this.setCapabilityValue('filtration_duration', pool.advice.filtrationDuration).catch(this.error);
    }

    // Mode (enum)
    const rawMode = (lm.mode ?? pool.mode);
    const norm = this.normalizeMode(rawMode);
    if (norm) {
      this.setCapabilityValue('pool_mode', norm).catch(this.error);
    } else if (rawMode) {
      this.log(`Unknown pool_mode '${rawMode}', ignoring (expects STANDARD|OPENING|WINTER|INITIALIZATION)`);
    }

    // Action requise -> bool
    if (typeof pool.hasAnActionRequired === 'boolean') {
      this.setCapabilityValue('alarm_generic', pool.hasAnActionRequired).catch(this.error);
    }
  }

  async _setUnavailableOnce(reason) {
    if (this._isAvailable) {
      await this.setUnavailable(reason).catch(this.error);
      this._isAvailable = false;
    }
  }

  async _setAvailableOnce() {
    if (!this._isAvailable) {
      await this.setAvailable().catch(this.error);
      this._isAvailable = true;
    }
  }

}

module.exports = IopoolDevice;
