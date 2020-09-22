export const range = (x: number, y: number) => Array.from((function* () {
  if (x < y) {
    while (x < y) yield x++;
  }
  
  if (x > y) {
    while (x > y) yield x--;
  }
  
  if ( x === y) {
    yield x
  }
})());
