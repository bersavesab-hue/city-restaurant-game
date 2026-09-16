// Furniture quality and rarity system
export const qualityLevels = {
  common: {name:'普通', bonus:0},
  refined: {name:'精良', bonus:5},
  premium: {name:'高级', bonus:12},
  luxury: {name:'豪华', bonus:25},
  limited: {name:'限定', bonus:40}
};

export function calculateQualityBonus(item){
  return qualityLevels[item.quality]?.bonus || 0;
}
