import {createHash} from 'node:crypto';
const hash = x => createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export class Kernel {
  constructor(snapshot) {this.events=snapshot?.events??[];this.objects=new Map(snapshot?.objects??[]);this.anchor=snapshot?.anchor??null;this.state=new Map();this.replay();}
  put(data){const h=hash(data);this.objects.set(h,data);return h;}
  verify(h){return this.objects.has(h)&&hash(this.objects.get(h))===h;}
  append(id,to,extra={}){
    const before=this.state.get(id)??'NONE';
    const allowed={NONE:['REQUESTED'],REQUESTED:['DISPATCHED'],DISPATCHED:['PARTIAL','RESULTED','UNKNOWN'],PARTIAL:['RESULTED','UNKNOWN'],RESULTED:[],UNKNOWN:[]};
    if(!allowed[before]?.includes(to))throw Error(`illegal ${before}->${to}`);
    if(to==='RESULTED'&&(!this.verify(extra.evidence)||!this.verify(extra.receipt)))throw Error('unverified evidence');
    const prev=this.events.at(-1)?.digest??'GENESIS';
    const event={seq:this.events.length+1,id,before,to,extra,prev};event.digest=hash(event);
    this.events.push(event);this.state.set(id,to);return event;
  }
  replay(){this.state.clear();let prev='GENESIS';for(const [i,e] of this.events.entries()){
    if(e.seq!==i+1||e.prev!==prev||hash(Object.fromEntries(Object.entries(e).filter(([k])=>k!=='digest')))!==e.digest)throw Error('event integrity failure');
    const before=this.state.get(e.id)??'NONE';if(before!==e.before)throw Error('projection mismatch');
    if(e.to==='RESULTED'&&(!this.verify(e.extra.evidence)||!this.verify(e.extra.receipt)))throw Error('missing or corrupted evidence');
    this.state.set(e.id,e.to);prev=e.digest;
  }if(this.anchor&&this.anchor!==prev)throw Error('anchor mismatch');return this.state;}
  seal(){this.anchor=this.events.at(-1)?.digest??'GENESIS';return this.anchor;}
  snapshot(){return structuredClone({events:this.events,objects:[...this.objects],anchor:this.anchor});}
  reconcile(id,{evidence,receipt}={}){const state=this.state.get(id);if(state==='RESULTED'||state==='UNKNOWN')return state;
    if(state!=='DISPATCHED'&&state!=='PARTIAL')throw Error('not dispatchable');
    if(evidence&&receipt&&this.verify(evidence)&&this.verify(receipt))this.append(id,'RESULTED',{evidence,receipt});
    else if(evidence&&this.verify(evidence)&&state==='DISPATCHED')this.append(id,'PARTIAL',{evidence});
    else this.append(id,'UNKNOWN',{reason:'unprovable'});
    return this.state.get(id);
  }
}
