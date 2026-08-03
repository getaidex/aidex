import { Playground } from './Playground.js';

const playground = new Playground();
const result = await playground.run('Hello, Aidex!');

console.log(result);
