
const above = n => {
    return Math.pow( 2, Math.ceil( Math.log2( n ) ) );
};

const below = n => {

    let result = 0;
    for (let i = n; i >= 1; i--)
    {
        // If i is a power of 2
        if ((i & (i - 1)) === 0) {
            result = i;
            break;
        }
    }

    return result;
};

const { argv } = process;
const input = +argv[ 2 ];

let _above = above(input);
let _below = below(input);

_above -= _below;

const cooked = input - _below;

console.log('below 0 cooked ' + cooked + ' above ' + _above);

