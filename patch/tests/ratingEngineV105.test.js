const r=require('../src/rating/ratingEngineV105.js');
const a=r.calculateStoreRating({});
if(!a.grade) throw new Error('rating failed');
console.log('ratingEngineV105 ok');
