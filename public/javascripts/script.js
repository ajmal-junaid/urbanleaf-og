function addToCart(proId) {
  $.ajax({
    url: '/add-to-cart/' + proId,
    method: 'get',
    success: (response) => {
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
function cancelOrder(ordId) {
  $.ajax({
    url: '/cancel-order/' + ordId,
    method: 'get',
    success: (response) => {
      document.getElementById(ordId).innerHTML = "Canceled sucesfully"

    }
  })
}

$("#checkout-form").submit((e) => {
  //function placeorder() {
  addressSelect = document.querySelector('input[name="address-method"]:checked').value
  paymentMethodS = document.querySelector('input[name="payment-method"]:checked').value
  //var form = document.getElementById("checkout-form");
  //alert(form.elements["checkout-form"].value);
  e.preventDefault()

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
      } else if(response.razor){
        razorpayPayment(response)
      }else if(response.pay){
        location.replace(response.linkto)
      }

    }
  })
  // }
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
