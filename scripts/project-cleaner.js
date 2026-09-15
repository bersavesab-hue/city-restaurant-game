'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const REPORT = path.join(ROOT, 'cleanup-report.json');

const SKIP_DIRS = new Set([
  '.git','node_modules','.gradle','.idea','.vscode','build','dist','coverage',
  '.cleanup-quarantine'
]);

const TEXT_EXTS = new Set([
  '.js','.cjs','.mjs','.json','.yml','.yaml','.html','.css','.md','.txt',
  '.gradle','.xml','.properties'
]);

const SOURCE_EXTS = new Set(['.js','.cjs','.mjs']);
const PROTECTED = new Set([
  'package.json','package-lock.json','android/entry.js',
  'scripts/project-cleaner.js','scripts/apply-update-patch.js'
]);

function p(rel){ return rel.split(path.sep).join('/'); }
function a(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(a(rel)); }

function walk(dir=ROOT){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(SKIP_DIRS.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    const rel=p(path.relative(ROOT,full));
    if(ent.isDirectory()) out.push(...walk(full)); else out.push(rel);
  }
  return out;
}

function read(rel){ try{return fs.readFileSync(a(rel),'utf8');}catch{return '';} }

function versionInfo(rel){
  const ext=path.posix.extname(rel);
  const dir=path.posix.dirname(rel);
  const base=path.posix.basename(rel,ext);

  // Only treat an explicit trailing version marker as a versioned source.
  // Examples: fooV081.js, foo-v0.8.2.js, foo_v12.js
  const m=base.match(/^(.*?)(?:[-_.]?v(?:ersion)?[-_.]?)(\d+(?:[._-]\d+)*)$/i);
  if(!m || !m[1]) return null;
  const family=p(path.posix.join(dir==='.'?'':dir,m[1]+ext));
  const parts=m[2].split(/[._-]/).map(x=>parseInt(x,10)||0);
  let score=0;
  for(const x of parts) score=score*1000+x;
  return {family,score,raw:m[2]};
}

function buildReferences(files){
  const refs=new Map(files.map(f=>[f,[]]));
  const textFiles=files.filter(f=>TEXT_EXTS.has(path.extname(f).toLowerCase()) && f!=='cleanup-report.json');
  const byBase=new Map();
  for(const f of files){
    const b=path.posix.basename(f);
    if(!byBase.has(b)) byBase.set(b,[]);
    byBase.get(b).push(f);
  }
  for(const src of textFiles){
    const txt=read(src); if(!txt) continue;
    for(const [base,targets] of byBase){
      if(!txt.includes(base)) continue;
      for(const t of targets){
        if(t===src) continue;
        if(txt.includes(t) || txt.includes('./'+t) || txt.includes('../'+t) || txt.includes(base)){
          refs.get(t).push(src);
        }
      }
    }
  }
  return refs;
}

function isBackup(rel){
  return /\.(?:bak|old|orig|rej|tmp|temp|log)$/i.test(rel)
    || /(?:^|\/)(?:backup|backups|trash|temp|tmp)(?:\/|$)/i.test(rel)
    || /(?: copy| - copy|副本)(?=\.[^./]+$)/i.test(rel)
    || /\(\d+\)(?=\.[^./]+$)/i.test(rel);
}

function isLegacyScript(rel){
  if(!/^scripts\//i.test(rel)) return false;
  if(rel==='scripts/apply-update-patch.js' || rel==='scripts/project-cleaner.js') return false;
  return /(?:^|\/)(?:repair|fix|migrate|migration|apply)[-_].*v\d+/i.test(rel)
      || /(?:legacy|obsolete|deprecated|old)[-_]?/i.test(rel);
}

function quarantine(rel,qroot){
  if(!exists(rel)) return;
  const dest=path.join(qroot,rel);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.renameSync(a(rel),dest);
}

function restore(qroot){
  if(!fs.existsSync(qroot)) return;
  function rec(dir){
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,ent.name);
      if(ent.isDirectory()) rec(full);
      else{
        const rel=path.relative(qroot,full);
        const dst=path.join(ROOT,rel);
        fs.mkdirSync(path.dirname(dst),{recursive:true});
        if(fs.existsSync(dst)) fs.rmSync(dst,{force:true,recursive:true});
        fs.renameSync(full,dst);
      }
    }
  }
  rec(qroot); fs.rmSync(qroot,{recursive:true,force:true});
}

function main(){
  let files=walk();
  const refs=buildReferences(files);
  const report={
    mode:APPLY?'apply':'scan',
    generatedAt:new Date().toISOString(),
    deleted:[],keptActive:[],groups:[],warnings:[]
  };
  const qroot=path.join(ROOT,'.cleanup-quarantine');
  if(APPLY) fs.rmSync(qroot,{recursive:true,force:true});

  try{
    const groups=new Map();
    for(const f of files){
      if(!SOURCE_EXTS.has(path.extname(f).toLowerCase())) continue;
      const vi=versionInfo(f); if(!vi) continue;
      if(!groups.has(vi.family)) groups.set(vi.family,[]);
      groups.get(vi.family).push({file:f,score:vi.score});
    }

    const deleteSet=new Set();

    // Versioned source cleanup: NEVER rename active code.
    // Referenced variants are kept. Unreferenced siblings are old versions and can be removed.
    for(const [family,arr] of groups){
      const canonicalExists=files.includes(family);
      const active=arr.filter(x=>(refs.get(x.file)||[]).length>0);
      const inactive=arr.filter(x=>(refs.get(x.file)||[]).length===0);
      const g={family,canonicalExists,active:active.map(x=>x.file),inactive:inactive.map(x=>x.file),deleted:[]};

      if(active.length>0 || canonicalExists){
        for(const x of inactive){
          if(!PROTECTED.has(x.file)) { deleteSet.add(x.file); g.deleted.push(x.file); }
        }
      }else if(arr.length>1){
        // Nothing references this family. Keep only the highest explicit version as a safety anchor.
        const sorted=[...arr].sort((x,y)=>y.score-x.score);
        for(const x of sorted.slice(1)){
          if(!PROTECTED.has(x.file)) { deleteSet.add(x.file); g.deleted.push(x.file); }
        }
        report.keptActive.push({file:sorted[0].file,reason:'unreferenced-version-family-newest-safety-anchor'});
      }
      report.groups.push(g);
    }

    // Backups/copies/temp files: delete only when not referenced.
    for(const f of files){
      if(PROTECTED.has(f)) continue;
      if(isBackup(f)){
        const r=refs.get(f)||[];
        if(r.length===0) deleteSet.add(f);
        else report.keptActive.push({file:f,reason:'backup-like-but-referenced',references:r});
      }
    }

    // Old patch/repair/migration scripts: delete only when no current text/package/workflow references remain.
    for(const f of files){
      if(PROTECTED.has(f) || !isLegacyScript(f)) continue;
      const r=refs.get(f)||[];
      if(r.length===0) deleteSet.add(f);
      else report.keptActive.push({file:f,reason:'legacy-named-but-still-referenced',references:r});
    }

    for(const f of [...deleteSet].sort()){
      report.deleted.push({file:f,reason:'provably-unreferenced-old-or-residual'});
      if(APPLY && exists(f)) quarantine(f,qroot);
    }

    // No nested npm test/build here. Existing CI owns verification after this patch.
    if(APPLY && fs.existsSync(qroot)) fs.rmSync(qroot,{recursive:true,force:true});
    fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n','utf8');
    console.log(`[cleanup-bot-v2] ${APPLY?'APPLY':'SCAN'} complete; deleted=${report.deleted.length}; kept=${report.keptActive.length}`);
  }catch(err){
    if(APPLY) restore(qroot);
    report.warnings.push(String(err&&err.stack?err.stack:err));
    fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n','utf8');
    console.error('[cleanup-bot-v2] FAILED; restored quarantined files');
    console.error(err&&err.stack?err.stack:err);
    process.exit(1);
  }
}

main();
