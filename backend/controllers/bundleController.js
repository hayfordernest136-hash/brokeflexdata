const datamartService = require('../services/datamartService');
const { getNetworkCode, DISPLAY_NETWORKS } = require('../utils/validation');
const { calculateSellingPrice } = require('../utils/pricing');
const { logInfo, logError } = require('../utils/logger');

const CACHE_DURATION = 60 * 1000;
let bundlesCache = null;
let bundlesCacheTime = 0;
let bundlesRefreshPromise = null;

async function refreshBundlesCache() {
    if (bundlesRefreshPromise) {
        return bundlesRefreshPromise;
    }

    bundlesRefreshPromise = (async () => {
        logInfo('Fetching bundles from DataMart API...');
        const packagesData = await datamartService.getDataPackages();

        if (!packagesData || packagesData.status !== 'success') {
            throw new Error('Failed to fetch data packages from provider');
        }

        const rawPackages = packagesData.data || {};
        const networks = ['YELLO', 'TELECEL', 'AT_PREMIUM'];
        const NETWORK_LABELS = {
            YELLO: 'MTN',
            TELECEL: 'Telecel',
            AT_PREMIUM: 'AirtelTigo'
        };

        const formattedBundles = {};
        for (const netCode of networks) {
            const pkgs = rawPackages[netCode] || [];
            formattedBundles[netCode] = pkgs.map(pkg => {
                const datamartCost = Number(pkg.price);
                const pricing = calculateSellingPrice(datamartCost);
                return {
                    capacity: Number(pkg.capacity),
                    capacityString: String(pkg.capacity),
                    mb: Number(pkg.mb),
                    price: pricing.sellingPrice,
                    datamartCost,
                    networkCode: pkg.network,
                    networkLabel: NETWORK_LABELS[pkg.network] || pkg.network,
                    displayName: `${pkg.capacity}GB`
                };
            });
        }

        bundlesCache = { data: formattedBundles, pricingTier: packagesData.pricingTier };
        bundlesCacheTime = Date.now();
        logInfo(`Bundles cached. Networks: ${Object.keys(formattedBundles).join(', ')}`);
        return bundlesCache;
    })().finally(() => {
        bundlesRefreshPromise = null;
    });

    return bundlesRefreshPromise;
}

async function getBundles(req, res, next) {
    try {
        const network = req.query.network;
        let networkCode = null;

        if (network) {
            networkCode = getNetworkCode(network);
            if (!networkCode) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid network. Supported: MTN, Telecel, AirtelTigo'
                });
            }
        }

        const cacheExpired = Date.now() - bundlesCacheTime > CACHE_DURATION;
        if (!bundlesCache) {
            await refreshBundlesCache();
        } else if (cacheExpired) {
            refreshBundlesCache().catch(err => logError(`Background bundle refresh failed: ${err.message}`));
        }

        let bundles = bundlesCache.data;

        if (networkCode) {
            bundles = { [networkCode]: bundles[networkCode] || [] };
        }

        res.json({
            status: 'success',
            pricingTier: bundlesCache.pricingTier,
            data: bundles
        });
    } catch (err) {
        logError(`Bundle fetch error: ${err.message}`);
        next(err);
    }
}

async function getNetworks(req, res) {
    const networks = [
        { key: 'MTN', label: 'MTN', code: 'YELLO', color: 'yellow' },
        { key: 'Telecel', label: 'Telecel', code: 'TELECEL', color: 'red' },
        { key: 'AirtelTigo', label: 'AirtelTigo', code: 'AT_PREMIUM', color: 'blue' }
    ];

    res.json({
        status: 'success',
        data: networks
    });
}

async function checkBalance(req, res, next) {
    try {
        const balance = await datamartService.checkBalance();
        res.json(balance);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getBundles,
    getNetworks,
    checkBalance,
    warmBundlesCache: () => refreshBundlesCache().catch(err => {
        logError(`Initial bundle cache warm-up failed: ${err.message}`);
    })
};
