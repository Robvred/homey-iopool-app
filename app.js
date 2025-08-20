'use strict';

const Homey = require('homey');

class IopoolApp extends Homey.App {
  async onInit() {
    this.log('Iopool app initialized');

    // Device Trigger (avec argument device dans la carte)
    this.flowTriggerPoolMode = this.homey.flow.getDeviceTriggerCard('pool_mode_changed');

    // Condition "Action required?"
    const cond = this.homey.flow.getConditionCard('action_required');
    cond.registerRunListener(async ({ device }) => {
      const val = device.getCapabilityValue('alarm_generic');
      return !!val;
    });
  }
}

module.exports = IopoolApp;
