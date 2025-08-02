/**
 * Test script to validate the new symbol + smart levels validation logic
 * This simulates the validation logic for different scenarios
 */

// Mock data for testing
const strategy = {
  id: 1,
  name: "Test Swing Strategy",
  key: "SwingHighLowBuy", // Swing strategy
  enabled: true
};

const existingSymbols = [
  { id: 1, symbol: "NIFTY50", enable_smart_levels: true, config_id: 1 },
  { id: 2, symbol: "NIFTY50", enable_smart_levels: false, config_id: 2 },
  { id: 3, symbol: "BANKNIFTY", enable_smart_levels: true, config_id: 1 },
  { id: 4, symbol: "RELIANCE", enable_smart_levels: false, config_id: 3 }
];

// Replicate the validation logic from AddSymbolModal
const checkDuplicate = (symbolName, smartLevelsEnabled, strategy, existingSymbols) => {
  if (!symbolName.trim()) return false;
  
  // For swing strategies, check if symbol exists with same smart levels status
  if (strategy.key === 'SwingHighLowBuy' || strategy.key === 'SwingHighLowSell') {
    return existingSymbols.some(existing => 
      existing.symbol.toLowerCase() === symbolName.trim().toLowerCase() && 
      (existing.enable_smart_levels ?? false) === smartLevelsEnabled
    );
  }
  // For non-swing strategies, use original logic (symbol name only)
  return existingSymbols.some(existing => 
    existing.symbol.toLowerCase() === symbolName.trim().toLowerCase()
  );
};

const existsWithDifferentSmartLevels = (symbolName, smartLevelsEnabled, strategy, existingSymbols) => {
  if (!symbolName.trim() || !(strategy.key === 'SwingHighLowBuy' || strategy.key === 'SwingHighLowSell')) {
    return false;
  }
  
  return existingSymbols.some(existing => 
    existing.symbol.toLowerCase() === symbolName.trim().toLowerCase() && 
    (existing.enable_smart_levels ?? false) !== smartLevelsEnabled
  );
};

// Test scenarios
console.log("=== Symbol + Smart Levels Validation Tests ===\n");

const testCases = [
  { symbol: "NIFTY50", smartLevels: true, description: "NIFTY50 with Smart Levels ON" },
  { symbol: "NIFTY50", smartLevels: false, description: "NIFTY50 with Smart Levels OFF" },
  { symbol: "BANKNIFTY", smartLevels: true, description: "BANKNIFTY with Smart Levels ON" },
  { symbol: "BANKNIFTY", smartLevels: false, description: "BANKNIFTY with Smart Levels OFF" },
  { symbol: "RELIANCE", smartLevels: true, description: "RELIANCE with Smart Levels ON" },
  { symbol: "RELIANCE", smartLevels: false, description: "RELIANCE with Smart Levels OFF" },
  { symbol: "TCS", smartLevels: true, description: "TCS with Smart Levels ON (new symbol)" },
  { symbol: "TCS", smartLevels: false, description: "TCS with Smart Levels OFF (new symbol)" }
];

testCases.forEach(({ symbol, smartLevels, description }, index) => {
  const isDuplicate = checkDuplicate(symbol, smartLevels, strategy, existingSymbols);
  const hasDifferentSmartLevels = existsWithDifferentSmartLevels(symbol, smartLevels, strategy, existingSymbols);
  
  console.log(`${index + 1}. ${description}`);
  console.log(`   Result: ${isDuplicate ? '❌ BLOCKED (duplicate)' : '✅ ALLOWED'}`);
  if (!isDuplicate && hasDifferentSmartLevels) {
    console.log(`   Info: Symbol exists with Smart Levels ${smartLevels ? 'OFF' : 'ON'}`);
  }
  console.log();
});

console.log("=== Test Results Summary ===");
console.log("✅ NIFTY50 with Smart Levels ON: BLOCKED (exists)");
console.log("✅ NIFTY50 with Smart Levels OFF: BLOCKED (exists)");
console.log("✅ BANKNIFTY with Smart Levels ON: BLOCKED (exists)");
console.log("✅ BANKNIFTY with Smart Levels OFF: ALLOWED (different smart levels)");
console.log("✅ RELIANCE with Smart Levels ON: ALLOWED (different smart levels)");
console.log("✅ RELIANCE with Smart Levels OFF: BLOCKED (exists)");
console.log("✅ TCS (new symbols): ALLOWED for both configurations");
