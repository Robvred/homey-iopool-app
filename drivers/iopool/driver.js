'use strict';
const Homey = require('homey');

class IopoolDriver extends Homey.Driver {
  async onInit() {
    this.log('Iopool driver started');
  }

  onPair(session) {
    this.log('Pairing session started');

    // Étape 1: lister le(s) device(s)
    session.setHandler('list_devices', async () => {
      return [{
        name: 'iopool Pool',
        data: { id: 'iopool-' + Date.now() },
        settings: { refreshMinutes: 5 }
      }];
    });

    // Étape 2: valider l’ajout (OBLIGATOIRE pour que le bouton apparaisse)
    session.setHandler('add_devices', async (devices) => {
      // Homey attend qu’on renvoie la liste à ajouter
      return devices;
    });
  }
}

module.exports = IopoolDriver;
