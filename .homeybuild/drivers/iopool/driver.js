'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');

class IopoolDriver extends Homey.Driver {

  async onInit() {
    this.log('Iopool driver started');
  }

  async onPair(session) {
    this.log('Pairing session started');

    // Liste les piscines pour une API key donnée
    session.setHandler('getPools', async ({ apiKey }) => {
      const key = (apiKey || '').trim();
      if (!key) {
        throw new Error('Missing API key');
      }

      const url = 'https://api.iopool.com/v1/pools';
      let res;
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'x-api-key': key,
          },
          timeout: 10000,
        });
      } catch (e) {
        this.log('Pair getPools network error:', e.message);
        throw new Error('Network error while contacting iopool API');
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.log(`Pair getPools HTTP ${res.status} — body: ${text.slice(0, 300)}`);
        if (res.status === 401 || res.status === 403) {
          throw new Error('Invalid API key or insufficient permissions');
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const pools = await res.json();
      if (!Array.isArray(pools)) {
        throw new Error('Unexpected API response');
      }

      // Renvoie des items simples pour l’UI
      return pools.map(p => ({
        id: p.id,
        name: p.name || p.id,
      }));
    });

    // Log de fin de pairing
    session.setHandler('disconnect', () => {
      this.log('Pairing session ended');
    });
  }
}

module.exports = IopoolDriver;
