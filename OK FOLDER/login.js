function login(){

let name=document.getElementById("studentName").value;

let father=document.getElementById("fatherName").value;

let mobile=document.getElementById("mobile").value;

if(name=="" || father=="" || mobile==""){

alert("Please Fill All Details");

return;

}

localStorage.setItem("studentName",name);

localStorage.setItem("fatherName",father);

localStorage.setItem("mobile",mobile);

window.location="test.html";

}