var NameError = document.getElementById("fname-error");  //span id
var mobileError = document.getElementById("mobile-error");
var emailError = document.getElementById("email-error")
var passwordError = document.getElementById("password-error")
var submitError = document.getElementById("submit-error");




function validateName() {
    var fname = document.getElementById("contact-fname").value; //input id

    if (fname.length == 0) {
        NameError.innerHTML = 'First Name required';
        return false;
    }
    if (!fname.match(/(^[a-zA-Z][a-zA-Z\s]{0,20}[a-zA-Z]$)/)) {

        NameError.innerHTML = 'Invalid name';
        return false;
    }
    else {
        NameError.innerHTML = '';
        return true;
    }
}

function validateEmail() {
    var email = document.getElementById("contact-email").value;
    if (email.length == 0) {
        emailError.innerHTML = "Email required";
        return false;
    }
    if (!email.match(/^[a-zA-Z0-9.!#$%&’+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)$/)) {

        emailError.innerHTML = 'Email Invalid';
        return false;

    }
    emailError.innerHTML = "";
    return true;
}

function validatePassword() {
    var password = document.getElementById("contact-password").value;
    if (password.length == 0) {
        passwordError.innerHTML = "Password required";
        return false;
    } else if (password.length <= 4) {
        passwordError.innerHTML = "Minimum Five Characters Required";
        return false;
    }
    passwordError.innerHTML = "";
    return true;

}


function validateMobile() {
    var mobile = document.getElementById("contact-mobile").value;
    if (mobile.length == 0) {
        mobileError.innerHTML = "Mobile can't be empty";
        return false;
    }
    if (!mobile.match(/^([+]\d{2})?\d{10}$/)) {

        mobileError.innerHTML = 'Invalid Mobile';
        return false;

    }
    mobileError.innerHTML = '';
    return true;
}

function validateForm() {
    if (!validateName() || !validateMobile() || !validateEmail() || !validatePassword()) {

        submitError.innerHTML = 'Field Cannot be Empty';
        setTimeout(function () { submitError.style.display = 'none'; }, 4000)
        return false;
    }

}

function validateLogPassword() {
    var password = document.getElementById("contact-password").value;
    if (password.length == 0) {
        passwordError.innerHTML = "Password required";
        return false;
    } else if (password.length <= 4) {
        passwordError.innerHTML = "Minimum Five Characters Required";
        return false;
    }
    passwordError.innerHTML = "";
    return true;

}

function validateLoginForm() {
    if (!validateMobile()) {
        submitError.innerHTML = 'Field Cannot be Empty';
        setTimeout(function () { submitError.style.display = 'none'; }, 4000)
        return false;
    }

}

function validateLoginMailForm() {
    if (!validateEmail() || !!validateLogPassword()) {
        submitError.innerHTML = 'Field Cannot be Empty';
        setTimeout(function () { submitError.style.display = 'none'; }, 4000)
        return false;
    }

}

$(document).ready( function () {
    $('#tablejq').DataTable();
} );