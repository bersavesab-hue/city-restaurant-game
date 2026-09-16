'use strict';

function append(history,item){
  const list=Array.isArray(history)?history:[];
  list.push(item);
  return list.slice(-30);
}

module.exports={append};
