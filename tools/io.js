/*
 * This script reads a file and produces a new file like the original with all
 * the r's and l's replaced with w's.  The input file is assumed to be encoded
 * using UTF-8; the output file will also be UTF-8 encoded.  The new file's name
 * is formed from the input file name by appending a '.w'.
 *
 * For example, if the file 'greeting.txt' contained the text
 *
 *   Hello, how are you today?
 *
 * The executing
 *
 *   node io.js greeting.txt
 *
 * will produce a new file named 'greeting.text.w' containing
 *
 *   Hewwo, how awe you today?
 */
const fs = require('fs');

if (3 !== process.argv.length) {
    console.error('Exactly one argument required');
    process.exit(1);
}

const input = process.argv[2];
const output = input + '.w';

// Read the entire file asynchronously, with a callback to replace the r's and l's
// with w's then write the result to the new file.
fs.readFile(input, 'utf-8', (err, text) => {

    if (err) {
        throw err;
    }

    const  fuddified = text.replace(/[rl]/g, 'w').replace(/[RL]/g, 'W');

    fs.writeFile(output, fuddified, (err) => {
        if (err) {
            throw err;
        }
    });
});
