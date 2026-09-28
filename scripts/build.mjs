import{build}from'esbuild';import{cp,mkdir,rm}from'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await build({entryPoints:['src/main.js'],bundle:true,format:'esm',minify:true,outfile:'dist/app.js',target:['es2022'],external:['https://*']});
for(const f of ['index.html','styles.css','manifest.webmanifest','service-worker.js','assets'])await cp(f,`dist/${f}`,{recursive:true});
console.log('Pallet Stacker built.');
