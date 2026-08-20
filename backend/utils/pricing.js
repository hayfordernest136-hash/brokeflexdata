const MARKUP_PERCENTAGE = 17;
const ROUNDING_DENOMINATOR = 10;

const PAYSTACK_PERCENTAGE_FEE = parseFloat(process.env.PAYSTACK_FEE_PERCENTAGE || '2.5');

function ghanaToPesewas(amount) {
    return Math.round(parseFloat(amount) * 100);
}

function pesewasToGhana(pesewas) {
    return Math.round(pesewas) / 100;
}

function roundToNearestTenPesewas(pesewas) {
    return Math.round(pesewas / ROUNDING_DENOMINATOR) * ROUNDING_DENOMINATOR;
}

function addMarkup(datamartCostPesewas) {
    const cost = datamartCostPesewas;
    const markupPesewas = Math.round(cost * (MARKUP_PERCENTAGE / 100));
    return cost + markupPesewas;
}

function calculateSellingPrice(datamartCostGhana) {
    const datamartCostPesewas = ghanaToPesewas(datamartCostGhana);
    const withMarkup = addMarkup(datamartCostPesewas);
    const roundedPesewas = roundToNearestTenPesewas(withMarkup);

    return {
        datamartCost: pesewasToGhana(datamartCostPesewas),
        markup: MARKUP_PERCENTAGE,
        sellingPrice: pesewasToGhana(roundedPesewas),
        sellingPricePesewas: roundedPesewas,
    };
}

function calculatePaystackFee(sellingPricePesewas) {
    const feeRate = PAYSTACK_PERCENTAGE_FEE / 100;
    const paystackAmountPesewas = Math.round(sellingPricePesewas / (1 - feeRate));
    const paystackFeePesewas = paystackAmountPesewas - sellingPricePesewas;

    return {
        sellingPrice: pesewasToGhana(sellingPricePesewas),
        paystackFee: pesewasToGhana(paystackFeePesewas),
        paystackAmount: pesewasToGhana(paystackAmountPesewas),
        paystackAmountPesewas: paystackAmountPesewas,
        feePercentage: PAYSTACK_PERCENTAGE_FEE,
    };
}

function calculateFullPricing(datamartCostGhana) {
    const base = calculateSellingPrice(datamartCostGhana);
    const payment = calculatePaystackFee(base.sellingPricePesewas);

    return {
        ...base,
        ...payment,
    };
}

module.exports = {
    MARKUP_PERCENTAGE,
    calculateSellingPrice,
    calculatePaystackFee,
    calculateFullPricing,
    ghanaToPesewas,
    pesewasToGhana,
};
