'use strict';
const Homey = require('homey');
const fetch = require('node-fetch');

class IopoolDevice extends Homey.Device {

  async onInit() {
    this.log('Iopool device initialized');
    await this._loadSettings();
    this.log('[iopool] settings:', { hasKey: !!this.apiKey, poolId: this.poolId });
    this._startPolling();

    // relance sur changement des paramètres (clé/pool/intervalle)
    this.on('settings.set', async () => {
      await this._loadSettings();
      this._startPolling();
    });
  }

  async _loadSettings() {
    this.apiKey = this.getSetting('apiKey');
    this.poolId = this.getSetting('poolId');
    this.refreshMinutes = Number(this.getSetting('refreshMinutes') || 5);
  }

  _startPolling() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (!this.apiKey) {
      this.log('Missing apiKey; not polling.');
      return;
    }
    const ms = Math.max(1, this.refreshMinutes) * 60 * 1000;
    this._updateOnce().catch(err => this.error(err));
    this.refreshInterval = setInterval(() => {
      this._updateOnce().catch(err => this.error(err));
    }, ms);
  }

  async _updateOnce() {
    const data = await this._fetchIopool();

    if (typeof data.temperature === 'number') {
      await this.setCapabilityValue('measure_temperature', data.temperature);
    }
    if (typeof data.ph === 'number') {
      await this.setCapabilityValue('measure_ph', data.ph);
    }
    if (typeof data.orp === 'number') {
      await this.setCapabilityValue('measure_orp', data.orp);
    }
    if (typeof data.filtrationDuration === 'number') {
      await this.setCapabilityValue('filtration_duration', data.filtrationDuration);
    }

    // pool_mode (enum en lecture seule)
    const allowedPoolModes = new Set(['STANDARD','OPENING','WINTER','INITIALIZATION']);
    const poolMode = (data.poolMode || '').toString().toUpperCase();
    if (allowedPoolModes.has(poolMode)) {
      await this.setCapabilityValue('pool_mode', poolMode);
    } else if (poolMode) {
      this.log('[iopool] pool_mode inconnu ignoré:', data.poolMode);
    }

    if (typeof data.actionRequired !== 'undefined') {
      await this.setCapabilityValue('alarm_generic', !!data.actionRequired);
    }
  }

  /**
   * Appels API iopool (lecture seule)
   * - Liste:   GET /v1/pool/         (x-api-key)
   * - Détail:  GET /v1/pool/{poolId}  (x-api-key)  ← singulier !
   */
  async _fetchIopool() {
    const base = 'https://api.iopool.com/v1';
    const headers = { 'x-api-key': this.apiKey, 'accept': 'application/json' };

    // Auto-détection du poolId si manquant
    let poolId = (this.poolId || '').trim();
    if (!poolId) {
      this.log('[iopool] poolId absent → GET /v1/pool/');
      const resList = await fetch(`${base}/pool/`, { headers, timeout: 10000 });
      const textList = await resList.text().catch(() => '');
      if (!resList.ok) throw new Error(`List pools HTTP ${resList.status}: ${textList}`);
      const list = JSON.parse(textList);
      if (!Array.isArray(list) || list.length === 0) throw new Error('Aucune piscine trouvée pour cette clé API');
      poolId = list[0].id;
      this.log('[iopool] poolId détecté =', poolId);
      try { await this.setSettings({ poolId }); } catch (e) { this.error('setSettings failed', e); }
    }

    const url = `${base}/pool/${encodeURIComponent(poolId)}`; // <-- /pool (singulier)
    this.log('[iopool] GET', url);
    const res = await fetch(url, { headers, timeout: 10000 });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      this.error(`[iopool] HTTP ${res.status}: ${text}`);
      throw new Error(`Pool HTTP ${res.status}`);
    }

    let raw;
    try { raw = JSON.parse(text); } catch { throw new Error('JSON invalide'); }

    const lm  = raw.latestMeasure || {};
    const adv = raw.advice || {};

    return {
      temperature: typeof lm.temperature === 'number' ? lm.temperature : undefined,
      ph:          typeof lm.ph === 'number' ? lm.ph : undefined,
      orp:         typeof lm.orp === 'number' ? lm.orp : undefined,
      filtrationDuration: typeof adv.filtrationDuration === 'number' ? adv.filtrationDuration : undefined,
      poolMode: String(raw.mode || ''), // statut global du bassin (STANDARD/OPENING/WINTER/INITIALIZATION)
      actionRequired: !!raw.hasAnActionRequired,
    };
  }

  onDeleted() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
}

module.exports = IopoolDevice;
