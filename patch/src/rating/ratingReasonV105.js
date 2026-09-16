'use strict';

function analyze(before,after){
  const reasons=[];
  if(after>before) reasons.push('经营指标改善');
  if(after<before) reasons.push('存在经营压力');
  return reasons;
}

module.exports={analyze};
