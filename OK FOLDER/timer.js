let time=60*60;

let x=setInterval(()=>{

let m=Math.floor(time/60);

let s=time%60;

document.getElementById("timer").innerText=

m+":"+ (s<10?"0"+s:s);

time--;

if(time<0){

clearInterval(x);

submitTest();

}

},1000);