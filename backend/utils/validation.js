const GHANA_PHONE_REGEX = /^(\+?233|0)(20|23|24|25|26|27|28|50|53|54|55|56|57|59)\d{7}$/;

function validateGhanaPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
        return { valid: false, message: 'Phone number is required.' };
    }

    const cleaned = phoneNumber.replace(/[\s\-]/g, '');

    if (!GHANA_PHONE_REGEX.test(cleaned)) {
        return { valid: false, message: 'Please enter a valid Ghanaian phone number (e.g., 0551234567).' };
    }

    let normalized = cleaned;
    if (normalized.startsWith('+233')) {
        normalized = '0' + normalized.slice(4);
    } else if (normalized.startsWith('233')) {
        normalized = '0' + normalized.slice(3);
    }

    return { valid: true, normalized };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
    if (!email) {
        return { valid: false, message: 'Email is required.' };
    }

    const trimmed = email.trim();

    if (trimmed.length > 254) {
        return { valid: false, message: 'Email address is too long.' };
    }

    if (!EMAIL_REGEX.test(trimmed)) {
        return { valid: false, message: 'Please enter a valid email address.' };
    }

    return { valid: true, normalized: trimmed.toLowerCase() };
}

const NETWORK_MAP = {
    MTN: 'YELLO',
    Telecel: 'TELECEL',
    AirtelTigo: 'AT_PREMIUM'
};

const DISPLAY_NETWORKS = [
    { key: 'MTN', label: 'MTN', code: 'YELLO', color: 'yellow' },
    { key: 'Telecel', label: 'Telecel', code: 'TELECEL', color: 'red' },
    { key: 'AirtelTigo', label: 'AirtelTigo', code: 'AT_PREMIUM', color: 'blue' }
];

function getNetworkCode(displayNetwork) {
    const entry = DISPLAY_NETWORKS.find(n =>
        n.key === displayNetwork || n.label === displayNetwork || n.code === displayNetwork
    );
    return entry ? entry.code : null;
}

function getNetworkLabel(code) {
    const entry = DISPLAY_NETWORKS.find(n => n.code === code);
    return entry ? entry.label : null;
}

function getNetworkColor(displayNetwork) {
    const entry = DISPLAY_NETWORKS.find(n => n.key === displayNetwork || n.label === displayNetwork);
    return entry ? entry.color : null;
}

module.exports = {
    validateGhanaPhoneNumber,
    validateEmail,
    NETWORK_MAP,
    DISPLAY_NETWORKS,
    getNetworkCode,
    getNetworkLabel,
    getNetworkColor
};
