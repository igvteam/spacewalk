
const distance = (dx, dy, dz) => {
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
};

const a = [ 3, 3, 7 ];
const b = [ 11, 11, -5 ];

let pre;
let dt;

pre = Date.now();
for (let i = 0; i < 2e8; i++) {
    const dist = distance((a[0] - b[0]), (a[1] - b[1]), (a[2] - b[2]));
}
dt = Date.now() - pre;
console.log('dist dt ' + dt);

pre = Date.now();
for (let i = 0; i < 2e8; i++) {
    const dist = approximate_distance((a[0] - b[0]), (a[1] - b[1]), (a[2] - b[2]));
}
dt = Date.now() - pre;
console.log('approximate_distance dt ' + dt);
