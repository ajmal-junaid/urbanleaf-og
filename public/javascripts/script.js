function addToCart(proId) {
  $.ajax({
    url: '/add-to-cart/' + proId,
    method: 'get',
    success: (response) => {
      if (response.status) {
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: 'Product Added to Cart',
          showConfirmButton: false,
          timer: 1500
        })
        let count = $('#cart-count').html()
        if (!response.stat) {
          count = parseInt(count) + 1
        }
        $("#cart-count").html(count)
        document.getElementById('totalh').innerHTML = response.total
        location.reload()
      } else {
        location.href = '/loginmail'
      }
    }
  })
}

function addToCartt(proId) {
  $.ajax({
    url: '/add-to-cartt/' + proId,
    method: 'get',
    success: (response) => {
      Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Product Added to Cart',
        showConfirmButton: false,
        timer: 1500
      })
      setTimeout(() => {
        location.reload()
      }, 1500);
      if (response.status) {
        let count = $('#cart-count').html()
        count = parseInt(count) + 1
        $("#cart-count").html(count)
        document.getElementById('totalh').innerHTML = response.total
        location.reload()
      }
    }
  })
}

function addToWishlist(proId) {
  $.ajax({
    url: '/add-to-wishlist/' + proId,
    method: 'get',
    success: (response) => {
      if (response.mod == 1) {
        let count = $('#wishlist-count').html()
        count = parseInt(count) + 1
        $("#wishlist-count").html(count)
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: 'Product Added to Wishlist',
          showConfirmButton: false,
          timer: 1500
        })
      } else if (response.mod == 0) {
        Swal.fire({
          position: 'top-end',
          icon: 'warning',
          title: 'Product Already Exists In Wishlist',
          showConfirmButton: false,
          timer: 1500
        })
      } else {
        Swal.fire({
          position: 'top-end',
          icon: 'error',
          title: 'Please Login to use Wishlist',
          showConfirmButton: false,
          timer: 1500
        })
      }
    }
  })
}

function cancelOrder(ordId, proId) {
  console.log(proId, "=============", ordId)
  $.ajax({
    url: '/cancel-order',

    data: {
      orderId: ordId,
      productId: proId
    },
    method: 'post',
    success: (response) => {
      Swal.fire({
        position: 'top-end',
        icon: 'warning',
        title: 'Order Canaceled',
        showConfirmButton: false,
        timer: 1000
      })
    }
  })
}

function returnOrder(ordId, proId) {
  $.ajax({
    url: '/return-order/',
    data: {
      orderId: ordId,
      productId: proId
    },
    method: 'post',
    success: (response) => {
      Swal.fire({
        position: 'top-end',
        icon: 'info',
        title: 'Return Requested',
        showConfirmButton: false,
        timer: 1500
      })
    }
  })
}

let count = 0
$("#checkout-form").submit((e) => {
  e.preventDefault()
  if (count == 0) {
    count++
    addressSelect = document.querySelector('input[name="address-method"]:checked').value
    paymentMethodS = document.querySelector('input[name="payment-method"]:checked').value

    $.ajax({
      url: '/proceed-page',
      data: {
        deliveryDetails: addressSelect,
        paymentMethod: paymentMethodS
      },
      method: 'post',
      success: (response) => {
        if (response.codSuccess) {
          location.href = '/order-succesfull'
        } else if (response.razor) {
          razorpayPayment(response)
        } else if (response.pay) {
          location.replace(response.linkto)
        } else if (response.wallet) {
          location.href = '/order-succesfull'
        } else if (response.statusW) {
          location.href = '/payment-failed'
        }
      }
    })
  } else {
    location.href = '/payment-failed'
    count = 0;
  }
})


function razorpayPayment(order) {
  var options = {
    "key": "rzp_test_RQe2RaERuutCC1", // Enter the Key ID generated from the Dashboard
    "amount": order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
    "currency": "INR",
    "name": "Urban Leaf",
    "description": "Test Transaction",
    "image": "https://example.com/your_logo",
    "order_id": order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
    "handler": function (response) {
      // alert(response.razorpay_payment_id);
      // alert(response.razorpay_order_id);
      // alert(response.razorpay_signature);

      verifyPayment(response, order)
    },
    "prefill": {
      "name": "Gaurav Kumar",
      "email": "gaurav.kumar@example.com",
      "contact": "9999999999"
    },
    "notes": {
      "address": "Razorpay Corporate Office"
    },
    "theme": {
      "color": "#3399cc"
    },
    "modal": {
      "backdropclose": (val) => {
        location.href = '/payment-failed'
      },
      "escape": (val) => {
        location.href = '/payment-failed'
      },
      "handleback": (val) => {
        location.href = '/payment-failed'
      },
      "confirm_close": (val) => {
        location.href = '/payment-failed'
      },
      "ondismiss": (val) => {
        location.href = '/payment-failed'
      }
    }
  };
  var rzp1 = new Razorpay(options);
  rzp1.open();
}

function verifyPayment(payment, order) {
  $.ajax({
    url: '/verify-payment',
    data: {
      payment,
      order
    },
    method: 'post',
    success: (response) => {
      if (response.status) {
        location.href = '/order-succesfull'
      } else {
        location.href = '/payment-failed'
      }
    }
  })
}

// coupon submit
let visit = 1
$("#couponForm").submit((e) => {
  e.preventDefault()
  $.ajax({
    url: '/coupon-discounts',
    method: 'post',
    data: $('#couponForm').serialize(),

    success: (response) => {
      console.log(response, "respoooo")
      if (response.Price) {
        if (visit >= 2) {
          swal("Coupon " + response.code + " Already Applied", "One Coupon at a time", "error")
          // location.reload()
        } else {
          document.getElementById('couponDescription').innerHTML = response.code + " applied succesfully <br>" + response.percentage + "% Off Upto ₹" + response.maxDiscount
          var newSpan2 = document.createElement('li');
          newSpan2.innerHTML = "Coupon Offer <span>₹</span><span id='total'><span>" + response.discAmount + "</span><sub>(" + response.percentage + "%)</sub></span>"
          document.getElementById('cartTotal').appendChild(newSpan2);
          document.getElementById('gtotal').innerHTML = response.Price
          visit += 1

          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: 'You Saved ₹' + response.discAmount,
            showConfirmButton: false,
            timer: 1500
          })
        }
        console.log(response)
        // document.getElementById('total').innerHTML = response.Price

      } else if (response.statu) {
        console.log(response, "respooooooo")
        Swal.fire({
          position: 'top-end',
          icon: 'error',
          title: 'Coupon is Not Applicable for This Order....! ',
          showConfirmButton: false,
          timer: 1500
        })
      }
      else {
        Swal.fire({
          position: 'top-end',
          icon: 'error',
          title: 'Coupon is not Valid...! , Try Again with valid coupon',
          showConfirmButton: false,
          timer: 1500
        })
        document.getElementById('couponDescription').innerHTML = " <P class='text-danger'>Coupon Not Valid<P> "
      }

    }
  })
})

$("#address-form").submit((e) => {
  e.preventDefault()
  $.ajax({
    url: '/address',
    method: 'post',
    data: $('#address-form').serialize(),
    success: (response) => {
      if (response) {
        $("#address-form").trigger("reset");
        Swal.fire({
          title: 'Address Added Succesfully',
          icon: 'success',
          showCancelButton: false,
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Continue..'
        }).then((result) => {
          if (result.isConfirmed) {
            location.reload()
          }
        })
      }
    }
  })
})

$("#address-update").submit((e) => {
  e.preventDefault()
  $.ajax({
    url: '/updateaddress',
    method: 'post',
    data: $('#address-update').serialize(),
    success: (response) => {
      if (response) {
        $("#address-update").trigger("reset");
        Swal.fire({
          title: 'Address Edited Succesfully',
          icon: 'success',
          showCancelButton: false,
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Continue..'
        }).then((result) => {
          if (result.isConfirmed) {
            location.reload()
          }
        })
      }
    }
  })
})