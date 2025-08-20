'use strict';

const { Device } = require('homey');

class IopoolDevice extends Device {

  async onInit() {
    this.log('Iopool device has been initialized');

    // Start polling
    this.pollInterval = setInterval(() => {
      this.updateMeasurements();
    }, (this.getSetting('refreshMinutes') || 5) * 60 * 1000);

    // Do first update right away
    this.updateMeasurements();
  }

  async onAdded() {
    this.log('Iopool device has been added');
  }

  async onDeleted() {
    this.log('Iopool device has been deleted');
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async updateMeasurements() {
    try {
      const apiKey = this.getSetting('apiKey');
      const poolId = this.getSetting('poolId');

      if (!apiKey || !poolId) {
        this.log('Missing API key or poolId');
        return;
      }

      const response = await this.homey.cloud.request({
        method: 'GET',
        url: `https://api.iopool.com/v1/pools/${poolId}`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response || !response.result) {
        this.log('No response from API');
        return;
      }

      const data = response.result;
      const latest = data.latestMeasure;

      if (latest) {
        if (typeof latest.temperature !== 'undefined') {
          await this.setCapabilityValue('measure_temperature', latest.temperature);
        }
        if (typeof latest.ph !== 'undefined') {
          await this.setCapabilityValue('measure_ph', latest.ph);
        }
        if (typeof latest.orp !== 'undefined') {
          await this.setCapabilityValue('measure_orp', latest.orp);
        }
        if (typeof data.advice?.filtrationDuration !== 'undefined') {
          await this.setCapabilityValue('filtration_duration', data.advice.filtrationDuration);
        }
        if (typeof latest.mode !== 'undefined') {
          await this.setCapabilityValue('pool_mode', latest.mode);
        }
        if (typeof data.hasAnActionRequired !== 'undefined') {
          await this.setCapabilityValue('alarm_generic', data.hasAnActionRequired);
        }
        if (typeof latest.measuredAt !== 'undefined') {
          // Convert timestamp to human-readable string
          const date = new Date(latest.measuredAt);
          await this.setCapabilityValue('last_update', date.toISOString());
        }
      }

    } catch (err) {
      this.log('Error updating measurements', err);
    }
  }
}

module.exports = IopoolDevice;
