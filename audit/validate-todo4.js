const fs=require('fs');
const a=require('./brand-navigation-audit.json');
console.log(JSON.stringify({brandVariants:[...new Set(a.flatMap(x=>Object.keys(x.brand)))],withMissingLegal:a.filter(x=>x.missingLegal.length).map(x=>x.file),withoutPremiumNav:a.filter(x=>!x.navPremium).map(x=>x.file)},null,2));
