import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Deliberately no URL parameter: all commands target this local Docker container.
export const container = 'supabase_db_NAC';
export const queries = {
  columns: `select table_name, ordinal_position, column_name, udt_name, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale from information_schema.columns where table_schema='public' order by table_name,ordinal_position`,
  constraints: `select c.conrelid::regclass::text as table_name,c.conname,c.contype,pg_get_constraintdef(c.oid) as definition from pg_constraint c where c.connamespace='public'::regnamespace order by table_name,c.conname`,
  indexes: `select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`,
  triggers: `select n.nspname as schema_name,c.relname as table_name,t.tgname as trigger_name,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and not t.tgisinternal order by schema_name,table_name,trigger_name`,
  functions: `select n.nspname as schema_name,p.proname as function_name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition,p.prosecdef as security_definer,p.proconfig as config,pg_get_userbyid(p.proowner) as owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','nac_private') order by schema_name,function_name,arguments`,
  policies: `select tablename,policyname,permissive,roles::text as roles,cmd,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname`,
  'table-grants': `select table_name,grantee,string_agg(privilege_type,',' order by privilege_type) as privileges from information_schema.table_privileges where table_schema='public' and grantee in ('anon','authenticated','service_role') group by table_name,grantee order by table_name,grantee`,
  'function-grants': `select n.nspname as schema_name,p.proname as function_name,pg_get_function_identity_arguments(p.oid) as arguments,r.rolname as grantee,has_function_privilege(r.oid,p.oid,'EXECUTE') as can_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join pg_roles r where n.nspname in ('public','nac_private') and r.rolname in ('anon','authenticated','service_role') order by schema_name,function_name,arguments,grantee`,
  tables: `select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced,pg_get_userbyid(c.relowner) as owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by table_name`,
  enums: `select n.nspname as schema_name,t.typname as type_name,e.enumlabel as value,e.enumsortorder as sort_order from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' order by type_name,sort_order`,
};
export function sql(query, database='postgres') {
  if (!['postgres', 'nac_master_remote', 'nac_master_remote_v2', 'nac_master_clean', 'nac_mission11_rehearsal', 'nac_mission111_rehearsal', 'nac_mission111_signed_media_rehearsal', 'nac_mission111_signed_media_final_rehearsal'].includes(database)) throw Error('Unexpected local database');
  return execFileSync('docker', ['exec','-i',container,'psql','-X','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1','-At'], {input:query,encoding:'utf8',maxBuffer:16*1024*1024});
}
export function capture(prefix, database='postgres') {
  for(const [name, query] of Object.entries(queries)) {
    const result = JSON.parse(sql(`select coalesce(json_agg(q),'[]'::json) from (${query}) q;`,database));
    writeFileSync(resolve('supabase/audit',`${prefix}-${name}.json`), JSON.stringify(result,null,2)+'\n');
  }
}
const keys={columns:['table_name','column_name'],constraints:['table_name','conname'],indexes:['tablename','indexname'],triggers:['schema_name','table_name','trigger_name'],functions:['schema_name','function_name','arguments'],policies:['tablename','policyname'],'table-grants':['table_name','grantee'],'function-grants':['schema_name','function_name','arguments','grantee'],tables:['schema_name','table_name'],enums:['schema_name','type_name','value']};
export function compare(left='local',right='remote') {
  const results=[];
  for(const name of Object.keys(queries)) {
    const a=JSON.parse(readFileSync(resolve('supabase/audit',`${left}-${name}.json`),'utf8'));
    const b=JSON.parse(readFileSync(resolve('supabase/audit',`${right}-${name}.json`),'utf8'));
    const key=row=>keys[name].map(k=>row[k]).join('.');
    const amap=new Map(a.map(row=>[key(row),row])), bmap=new Map(b.map(row=>[key(row),row]));
    for(const k of new Set([...amap.keys(),...bmap.keys()])) {
      const local=amap.get(k),remote=bmap.get(k);
      // CRLF in function source is formatting, not a behavior difference.
      const canonical=v=>JSON.stringify(v).replaceAll('\\r\\n','\\n');
      const changes=local&&remote?Object.keys(local).filter(p=>canonical(local[p])!==canonical(remote[p])):[];
      results.push({category:name,object:k,status:!local?'remote_only':!remote?'missing_remote':changes.length?'different':'equal',changes,local,remote});
    }
  }
  return results;
}
if(process.argv[1]===resolve('scripts/audit-catalog.mjs')) {
  capture('local');
  const rows=compare();
  writeFileSync('supabase/audit/catalog-diff.json',JSON.stringify(rows,null,2)+'\n');
  console.log(JSON.stringify(rows.filter(r=>r.status!=='equal').map(({category,object,status,changes})=>({category,object,status,changes})),null,2));
  console.log('TOTAL',rows.length,'EQUAL',rows.filter(r=>r.status==='equal').length);
}
