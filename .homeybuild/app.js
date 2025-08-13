'use strict';

const Homey = require('homey');

class IopoolApp extends Homey.App {
  async onInit() {
    this.log('Iopool app initialized');

    // Action card: get_filtration_duration
    const card = this.homey.flow.getActionCard('get_filtration_duration');
    card.registerRunListener(async (args, state) => {
      // args.device est une instance de IopoolDevice
      const dev = args.device;
      // on lit la capability si présente, sinon 0
      let h = 0;
      try {
        const val = dev.getCapabilityValue('filtration_duration');
        if (typeof val === 'number') h = val;
      } catch (e) {
        this.error('get_filtration_duration read error:', e);
      }
      // renvoie le token
      return { duration_hours: h };
    });
  }
}

module.exports = IopoolApp;
