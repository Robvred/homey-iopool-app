/* global Homey */

// Helpers
const $ = (id) => document.getElementById(id);
const show = (n) => n.classList.remove('hidden');
const hide = (n) => n.classList.add('hidden');
const setError = (n, msg) => { if (!msg) { n.textContent=''; hide(n); return; } n.textContent=String(msg); show(n); };

function initPairView(Homey) {
  const stepApi = $('step-api');
  const stepPool = $('step-pool');

  const apiKeyInput = $('apiKey');
  const btnFetch = $('btnFetch');
  const apiError = $('apiError');

  const poolSelect = $('pool');
  const devNameInput = $('devname');
  const btnCreate = $('btnCreate');
  const poolError = $('poolError');

  // ENTER déclenche Fetch
  apiKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnFetch.click(); });

  btnFetch.addEventListener('click', async () => {
    setError(apiError, '');
    const apiKey = (apiKeyInput.value || '').trim();
    if (!apiKey) return setError(apiError, 'Please enter your API key.');

    btnFetch.disabled = true;
    Homey.showLoadingOverlay();
    try {
      const pools = await Homey.emit('getPools', { apiKey });
      poolSelect.innerHTML = '';
      if (!Array.isArray(pools) || pools.length === 0) {
        setError(apiError, 'No pools found for this API key.');
        return;
      }
      for (const p of pools) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name || p.id} (${p.id})`;
        poolSelect.appendChild(opt);
      }
      hide(stepApi);
      show(stepPool);
      devNameInput.value = 'iopool Pool';
      devNameInput.focus();
    } catch (e) {
      setError(apiError, e?.message || 'Failed to list pools.');
    } finally {
      Homey.hideLoadingOverlay();
      btnFetch.disabled = false;
    }
  });

  btnCreate.addEventListener('click', async () => {
    setError(poolError, '');
    const apiKey = (apiKeyInput.value || '').trim();
    const poolId = poolSelect.value;
    const name = (devNameInput.value || 'iopool Pool').trim();

    if (!apiKey || !poolId) {
      return setError(poolError, 'Missing API key or pool selection.');
    }

    btnCreate.disabled = true;
    Homey.showLoadingOverlay();
    try {
      await Homey.createDevice({
        name,
        data: { id: poolId },
        settings: {
          apiKey,
          poolId,
          pollingInterval: 30
        }
      });
      if (typeof Homey.done === 'function') Homey.done();
    } catch (e) {
      // Ex: device déjà existant (409)
      setError(poolError, e?.message || 'Failed to create device. Maybe it already exists?');
      btnCreate.disabled = false;
    } finally {
      Homey.hideLoadingOverlay();
    }
  });

  if (typeof Homey.ready === 'function') Homey.ready();
}

// Fail-safe init
if (window.Homey) {
  try { initPairView(window.Homey); } catch (_) {}
} else {
  window.onHomeyReady = function (Homey) { initPairView(Homey); };
}
