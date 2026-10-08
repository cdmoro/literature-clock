const fs=require('fs'),path=require('path');
const {Resvg}=require('@resvg/resvg-js');
const root=process.cwd(),out=path.join(root,'screensavers/macos-native/Assets/Patterns');fs.mkdirSync(out,{recursive:true});
const css=fs.readFileSync('src/styles/background-patterns.css','utf8');const meta={};
for(const match of css.matchAll(/\[data-background-pattern='([^']+)'\] \{([^}]+)\}/g)){
 const [,name,body]=match;const url=body.match(/url\('([^']+)'\)/),size=body.match(/--pattern-size:\s*([\d.]+)px ([\d.]+)px/);if(!url||!size)continue;
 const file=path.resolve(root,'src/styles',url[1]); const w=+size[1],h=+size[2];
 if(file.endsWith('.svg'))fs.writeFileSync(path.join(out,name+'.png'),new Resvg(fs.readFileSync(file),{fitTo:{mode:'width',value:Math.ceil(w*2)}}).render().asPng());else fs.copyFileSync(file,path.join(out,name+'.png'));
 meta[name]=[w,h];
}
const shapes={dots:[16,16,'<circle cx="8" cy="8" r="1.2"/>'],circles:[48,48,'<circle cx="24" cy="24" r="10"/>'],grid:[24,24,'<path d="M0 24V0H24" fill="none" stroke="#808686"/>'],diagonal:[17,17,'<path d="M-1 1L1-1M0 17L17 0M16 18L18 16" fill="none" stroke="#808686"/>'],'diagonal-wide':[23,23,'<path d="M-3 3L3-3M0 23L23 0M20 26L26 20" fill="none" stroke="#808686" stroke-width="4"/>'],zigzag:[32,32,'<path d="M-16 0L0 16L16 0L32 16L48 0L48 8L32 24L16 8L0 24L-16 8Z"/>']};
for(const [name,[w,h,shape]] of Object.entries(shapes)){meta[name]=[w,h];let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g fill="#808686" opacity="0.18">${shape}</g></svg>`;fs.writeFileSync(path.join(out,name+'.png'),new Resvg(svg,{fitTo:{mode:'width',value:w*2}}).render().asPng());}
fs.writeFileSync(path.join(out,'tiles.json'),JSON.stringify(meta,null,2)+'\n');
