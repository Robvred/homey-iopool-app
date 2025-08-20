'use strict';

const Homey = require('homey');

class IopoolApp extends Homey.App {
  async onInit() {
    try {
      this.log('Iopool app initialized');

      // Flow trigger (device arg dans le JSON de la carte)
      this.flowTriggerPoolMode = this.homey.flow.getTriggerCard('pool_mode_changed');

      // Flow condition "Action required?"
      const cond = this.homey.flow.getConditionCard('action_required');
      cond.registerRunListener(async ({ device }) => {
        const val = device.getCapabilityValue('alarm_generic');
        return !!val;
      });
    } catch (e) {
      this.error('Init error:', e);
      throw e; // pour faire échouer proprement si nécessaire
    }
  }
}

module.exports = IopoolApp;
