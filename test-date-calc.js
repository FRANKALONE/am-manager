// Test date calculation
const createdDate = new Date('2025-03-26T10:06:33.160Z');
const year = createdDate.getFullYear();
const month = createdDate.getMonth() + 1;

console.log('Date string:', '2025-03-26T10:06:33.160Z');
console.log('Parsed date:', createdDate);
console.log('getMonth():', createdDate.getMonth(), '(0-indexed)');
console.log('getMonth() + 1:', month);
console.log('Expected: 3 (March)');
console.log('Result:', month === 3 ? '✅ CORRECT' : '❌ WRONG');
