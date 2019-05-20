/*
 * A command line script to write the average of its two
 * command line arguments, which will be treated as numbers.
 * Example:
 *
 *     node avg.js 84 22
 */

const { argv } = process;
const [ x, y ] = [ +argv[ 2 ], +argv[ 3 ] ];
// const x = +process.argv[2];
// const y = +process.argv[3];
console.log((x + y) / 2);
