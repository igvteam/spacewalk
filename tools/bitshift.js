const { argv } = process;
const number = +argv[ 2 ];
const divisor = +argv[ 3 ];
const count = Math.log2(divisor);
const index = number >> count;
console.log('number ' + number + ' divisor ' + divisor + ' count ' + count + ' index ' + index);
