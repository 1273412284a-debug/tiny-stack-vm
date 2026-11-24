const fs=require('node:fs'),path=require('node:path');
function run(p,input){
  let s=[],c=[],m=new Int32Array(256),out=[],pc=0,ip=0,steps=0,code=0;
  const need={3:1,4:1,5:2,6:2,7:3,23:1,27:1,49:1,50:1,64:1,65:2,80:1,81:1,83:1};
  for(let i=16;i<=30;i++)if(i!==23&&i!==27)need[i]=2;
  for(let i=32;i<=34;i++)need[i]=2;
  const valid=new Set([0,1,2,3,4,5,6,7,...Array.from({length:15},(_,i)=>i+16),32,33,34,48,49,50,51,52,64,65,80,81,82,83]);
  // Check limits, opcode and immediate before stack and instruction traps.
  while(true){
    if(steps===1000000){code=10;break}
    if(pc<0||pc>=p.length){code=9;break}
    let op=p[pc++];
    if(!valid.has(op)){code=5;break}
    let len=op===1?1:op===2?4:op>=48&&op<=51?2:0;
    if(pc+len>p.length){code=9;break}
    let imm=len===1?p.readInt8(pc):len===4?p.readInt32LE(pc):len===2?(op===51?p.readUInt16LE(pc):p.readInt16LE(pc)):0;
    pc+=len;steps++;
    let n=need[op]||0,delta=op===1||op===2||op===4||op===6||op===82?1:op===3||op===49||op===50||op===80||op===81||op===83?-1:op===65?-2:(op>=16&&op<=30&&op!==23&&op!==27)||op>=32&&op<=34?-1:0;
    if(s.length<n){code=2;break}
    if(s.length+delta>256){code=3;break}
    let a,b,v;
    if(op===0)break;
    if(op===1||op===2){s.push(imm);continue}
    if(op===3){s.pop();continue}
    if(op===4){s.push(s.at(-1));continue}
    if(op===5){a=s.pop();b=s.pop();s.push(a,b);continue}
    if(op===6){s.push(s.at(-2));continue}
    if(op===7){a=s.splice(-3,1)[0];s.push(a);continue}
    if(op>=16&&op<=34){
      b=s.pop();a=op===23||op===27?0:s.pop();
      if(op>=19&&op<=22&&!b){code=4;break}
      switch(op){
        case 16:v=a+b;break;case 17:v=a-b;break;case 18:v=Math.imul(a,b);break;
        case 19:v=a/b;break;case 20:v=a%b;break;case 21:v=(a>>>0)/(b>>>0);break;case 22:v=(a>>>0)%(b>>>0);break;
        case 23:v=-b;break;case 24:v=a&b;break;case 25:v=a|b;break;case 26:v=a^b;break;case 27:v=~b;break;
        case 28:v=a<<b;break;case 29:v=a>>b;break;case 30:v=a>>>b;break;
        case 32:v=+(a===b);break;case 33:v=+(a<b);break;case 34:v=+((a>>>0)<(b>>>0));
      }
      s.push(v|0);continue;
    }
    if(op===48){pc+=imm;continue}
    if(op===49||op===50){v=s.pop();if((op===49&&!v)||(op===50&&v))pc+=imm;continue}
    if(op===51){if(c.length===64){code=7;break}c.push(pc);pc=imm;continue}
    if(op===52){if(!c.length){code=8;break}pc=c.pop();continue}
    if(op===64||op===65){a=s.pop();if(a<0||a>255){code=6;break}if(op===64)s.push(m[a]);else m[a]=s.pop();continue}
    if(op===80||op===81){v=s.pop();let bytes=op===80?Buffer.from(String(v)):Buffer.from([v&255]);if(out.length+bytes.length>65536){code=11;break}for(const x of bytes)out.push(x);continue}
    if(op===82){s.push(ip<input.length?input[ip++]:-1);continue}
    if(op===83){code=s.pop()&255;break}
  }
  return [Buffer.from(out),code];
}
const src=process.env.MAKEFUN_INPUT_DIR||'/input',dst=process.env.MAKEFUN_OUTPUT_DIR||'/output';
for(const id of fs.readdirSync(src).sort()){
  const dir=path.join(src,id);if(!fs.statSync(dir).isDirectory())continue;
  const [out,code]=run(fs.readFileSync(path.join(dir,'program.bin')),fs.readFileSync(path.join(dir,'input.bin'))),target=path.join(dst,id);
  fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'stdout.bin'),out);fs.writeFileSync(path.join(target,'exit.txt'),code+'\n');
}
