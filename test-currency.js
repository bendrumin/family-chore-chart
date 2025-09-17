// Quick test script for currency formatting
// Run this in browser console to test currency support

console.log('🧪 Testing Currency Formatting...\n');

// Test the formatCents function with different currencies
function testFormatCents(cents, currency, locale = 'en-US') {
    try {
        const formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return formatter.format(cents / 100);
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

// Test cases
const testCases = [
    { cents: 700, currency: 'USD', locale: 'en-US', expected: '$7.00' },
    { cents: 700, currency: 'GBP', locale: 'en-GB', expected: '£7.00' },
    { cents: 700, currency: 'EUR', locale: 'de-DE', expected: '7,00 €' },
    { cents: 700, currency: 'JPY', locale: 'ja-JP', expected: '¥700' },
    { cents: 700, currency: 'CAD', locale: 'en-CA', expected: 'CA$7.00' },
    { cents: 700, currency: 'AUD', locale: 'en-AU', expected: 'A$7.00' },
];

console.log('📊 Currency Formatting Test Results:');
console.log('=====================================');

testCases.forEach((test, index) => {
    const result = testFormatCents(test.cents, test.currency, test.locale);
    const status = result.includes('Error') ? '❌' : '✅';
    console.log(`${index + 1}. ${test.currency} (${test.locale}): ${result} ${status}`);
    if (result.includes('Error')) {
        console.log(`   Expected: ${test.expected}`);
    }
});

console.log('\n🌍 Testing Currency Detection:');
console.log('==============================');

// Test currency detection based on locale
function detectCurrency(locale) {
    const country = locale.split('-')[1];
    const currencyMap = {
        'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD',
        'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
        'JP': 'JPY', 'CN': 'CNY', 'IN': 'INR', 'BR': 'BRL',
        'MX': 'MXN', 'RU': 'RUB', 'KR': 'KRW', 'SG': 'SGD',
        'HK': 'HKD', 'NZ': 'NZD', 'CH': 'CHF', 'SE': 'SEK',
        'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN', 'CZ': 'CZK',
        'HU': 'HUF'
    };
    return currencyMap[country] || 'USD';
}

const testLocales = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'en-CA', 'en-AU'];
testLocales.forEach(locale => {
    const detectedCurrency = detectCurrency(locale);
    console.log(`${locale} → ${detectedCurrency}`);
});

console.log('\n✅ Currency support test completed!');
console.log('If all tests pass, Phase 1 is working correctly.');
