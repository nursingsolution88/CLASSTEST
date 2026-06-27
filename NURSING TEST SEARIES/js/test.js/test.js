let questions=[];
let index=0;
let answers={};

fetch("data/questions.json")
.then(res=>res.json())
.then(data=>{
questions=data;
loadQ();
});

function loadQ(){

let q=questions[index];

document.getElementById("question").innerText=q.question;

document.getElementById("op1").innerText=q.A;

document.getElementById("op2").innerText=q.B;

document.getElementById("op3").innerText=q.C;

document.getElementById("op4").innerText=q.D;

}

function nextQ(){

save();

if(index<questions.length-1){
index++;
loadQ();
}

}

function prevQ(){

save();

if(index>0){
index--;
loadQ();
}

}

function save(){

let opt=document.querySelector('input[name="opt"]:checked');

if(opt){
answers[index]=opt.value;
}

}