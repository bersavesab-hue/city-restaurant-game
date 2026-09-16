'use strict';

function clamp(v){
  return Math.max(0, Math.min(100, Number(v)||0));
}

function grade(score){
  score=clamp(score);
  if(score>=90)return 'S';
  if(score>=80)return 'A';
  if(score>=70)return 'B';
  if(score>=60)return 'C';
  return 'D';
}

function calculateStoreRating(data={}){
  const score = clamp(
    (data.dish||70)*0.25+
    (data.service||70)*0.20+
    (data.environment||70)*0.15+
    (data.health||70)*0.15+
    (data.value||70)*0.15+
    (data.stability||70)*0.10
  );
  return {score, grade:grade(score)};
}

module.exports={grade,calculateStoreRating};
