var NameError = document.getElementById("fname-error");
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

function lessThanHundread(){
  let percentage = document.getElementById('percentage').value
  if(percentage>100){
    document.getElementById('percentage-err').innerHTML='Percentage Must not Exceed 100%'
    document.getElementById("addSub").disabled = true;
  }else{
    document.getElementById('percentage-err').innerHTML=''
    document.getElementById("addSub").disabled = false;
  }
}

$("#loginmail").submit((e) => {
  e.preventDefault()
  $.ajax({
    url: '/loginmail',
    method: 'post',
    data: $('#loginmail').serialize(),
    success: (response) => {
      console.log(response)
      if (response.user) {
        //window.history.back()
        window.location.replace(document.referrer);
      } else if (response.nouser) {
        Swal.fire({
          title: '<strong>User Not Found Please Signup</strong>',
          icon: 'info',
          html:
            'You can use, ' +
            '<a href="/signup">This Link</a> ' +
            'To create Account',
          showCloseButton: true,
          showCancelButton: false,
          focusConfirm: false,
          confirmButtonText:
            '<i class="fa fa-thumbs-up"></i> Continue To Login..!'
        })
        //location.replace()
      } else if (response.wrongpassword) {
        let timerInterval
        Swal.fire({
          title: 'Wrong Password!',
          html: 'Please Try Again',
          timer: 3000,
          timerProgressBar: true,

          willClose: () => {
            clearInterval(timerInterval)
          }
        }).then((result) => {
          /* Read more about handling dismissals below */
          if (result.dismiss === Swal.DismissReason.timer) {
            console.log('I was closed by the timer')
          }
        })
      } else if (response.block) {
        Swal.fire({
          title: 'Account Disabled...Try With Another Account',
          showClass: {
            popup: 'animate__animated animate__fadeInDown'
          },
          hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
          }
        })
      }
    }
  })
})
