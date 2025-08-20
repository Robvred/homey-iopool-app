'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');
const moment = require('moment');

class IopoolDevice extends Device {

  async onInit() {
    this.log('Iopool device initialized');

    this.apiKey = this.getSetting('apiKey');
    this.poolId = this.getSetting('poolId');
    this.refreshMinutes = this.getSetting('refreshMinutes') || 5;

    // schedule refresh
    this.interval = setInterval(() => {
      this.updateMeasurements().catch(this.error);
    }, this.refreshMinutes * 60 * 1000);

    // initial update
    this.updateMeasurements().catch(this.error);
  }

  async onAdded() {
    this.log('Iopool device added');
  }

  async onDeleted() {
    this.log('Iopool device deleted');
    if (this.interval) clearInterval(this.interval);
  }

  async updateMeasurements() {
    if (!this.apiKey || !this.poolId) {
      this.error('Missing API Key or Pool ID');
      return;
    }

    const url = `https://api.iopool.com/v1/pools/${this.poolId}`;
    this.log('Fetching data from', url);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.error('API request failed', response.status);
        return;
      }

      const data = await response.json();
      this.log('API response', data);

      const latest = data.latestMeasure || {};
      const advice = data.advice || {};

      // Mise à jour des capabilities
      if (typeof latest.temperature === 'number') {
        await this.setCapabilityValue('measure_temperature', latest.temperature);
      }
      if (typeof latest.ph === 'number') {
        await this.setCapabilityValue('measure_ph', latest.ph);
      }
      if (typeof latest.orp === 'number') {
        await this.setCapabilityValue('measure_orp', latest.orp);
      }
      if (typeof advice.filtrationDuration === 'number') {
        await this.setCapabilityValue('filtration_duration', advice.filtrationDuration);
      }
      if (typeof latest.mode === 'string') {
        await this.setCapabilityValue('pool_mode', latest.mode);
      }
      if (typeof data.hasAnActionRequired === 'boolean') {
        await this.setCapabilityValue('alarm_generic', data.hasAnActionRequired);
      }

      // Ajout du champ last_update formaté
      if (latest.measuredAt) {
        const formattedDate = moment(latest.measuredAt).format('DD/MM/YYYY HH:mm');
        await this.setCapabilityValue('last_update', formattedDate);
      }

    } catch (err) {
      this.error('Error fetching or parsing data', err);
    }
  }

}

module.exports = IopoolDevice;
