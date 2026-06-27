function submitTest(){

save();

let correct=0;

for(let i=0;i<questions.length;i++){

if(answers[i]==questions[i].answer){
correct++;
}

}

let wrong=questions.length-correct;

let percent=(correct/questions.length)*100;

fetch("https://script.google.com/macros/s/AKfycbzoo-uGmK60mscXzl20pj4OxMfZM6Xbr_o0hVKHT8of6pLBuglKuGUz-THOrshON1tw/exec",{

method:"POST",

body:JSON.stringify({

studentName:localStorage.getItem("studentName"),

fatherName:localStorage.getItem("fatherName"),

mobile:localStorage.getItem("mobile"),

testName:"Nursing Test Series",

date:new Date().toLocaleDateString(),

startTime:"",

submitTime:new Date().toLocaleTimeString(),

correct:correct,

wrong:wrong,

score:correct,

percentage:percent,

duration:"60 min"

})

})

.then(res=>res.text())

.then(data=>{

window.location="thankyou.html";

});

}