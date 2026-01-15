// Test timezone issue
const dateString = '2025-03-26T10:06:33.160Z';
const createdDate = new Date(dateString);

console.log('=== TIMEZONE TEST ===');
console.log('Input:', dateString);
console.log('Date object:', createdDate);
console.log('toISOString():', createdDate.toISOString());
console.log('toString():', createdDate.toString());
console.log('\n=== METHODS ===');
console.log('getMonth():', createdDate.getMonth(), '(0-indexed)');
console.log('getMonth() + 1:', createdDate.getMonth() + 1);
console.log('getUTCMonth():', createdDate.getUTCMonth(), '(0-indexed)');
console.log('getUTCMonth() + 1:', createdDate.getUTCMonth() + 1);
console.log('\n=== YEAR ===');
console.log('getFullYear():', createdDate.getFullYear());
console.log('getUTCFullYear():', createdDate.getUTCFullYear());

console.log('\n=== CONCLUSION ===');
const localMonth = createdDate.getMonth() + 1;
const utcMonth = createdDate.getUTCMonth() + 1;
console.log('Local month:', localMonth);
console.log('UTC month:', utcMonth);
console.log('Should be: 3 (March)');
