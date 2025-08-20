'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');

class IopoolDevice extends Homey.Device {

  async onInit() {
    this.log('Device has been initialized');

    this.apiKey = this.getSetting('apiKey');
    this.poolId = this.getSetting('poolId');
    this.pollingInterval = this.getSetting('pollingInterval') || 5;

    this.startPolling();
  }

  async onAdded() {
    this.log('Device added');
  }

  async onDeleted() {
    this.log('Device deleted');
    this.stopPolling();
  }

  async onSettings({ changedKeys, newSettings, oldSettings }) {
    this.log('Settings changed:', changedKeys);

    if (changedKeys.includes('apiKey')) {
      this.apiKey = newSettings.apiKey;
    }
    if (changedKeys.includes('poolId')) {
      this.poolId = newSettings.poolId;
    }
    if (changedKeys.includes('pollingInterval')) {
      this.pollingInterval = newSettings.pollingInterval;
      this.startPolling();
    }
  }

  async startPolling() {
    this.stopPolling();
    this.pollingIntervalId = this.homey.setInterval(
      () => this.pollData(),
      this.pollingInterval * 60 * 1000
    );
    this.pollData(); // immediate first run
  }

  stopPolling() {
    if (this.pollingIntervalId) {
      this.homey.clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  async pollData() {
    if (!this.apiKey || !this.poolId) {
      this.log('Missing apiKey or poolId');
      return;
    }

    try {
      const response = await fetch(`https://api.iopool.com/v1/pool/${this.poolId}/status`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-Key': this.apiKey
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.updateCapabilities(data);

    } catch (err) {
      this.log('Polling error:', err.message);
    }
  }

  updateCapabilities(data) {
    if (data.water_temperature !== undefined) {
      this.setCapabilityValue('measure_temperature', data.water_temperature).catch(this.error);
    }
    if (data.ph !== undefined) {
      this.setCapabilityValue('measure_ph', data.ph).catch(this.error);
    }
    if (data.orp !== undefined) {
      this.setCapabilityValue('measure_orp', data.orp).catch(this.error);
    }
    if (data.filtration_duration !== undefined) {
      this.setCapabilityValue('filtration_duration', data.filtration_duration).catch(this.error);
    }
    if (data.pool_mode !== undefined) {
      this.setCapabilityValue('pool_mode', data.pool_mode).catch(this.error);
    }
    if (data.action_required !== undefined) {
      this.setCapabilityValue('alarm_generic', data.action_required).catch(this.error);
    }
  }

}

module.exports = IopoolDevice;
