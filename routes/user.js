const { response } = require('express');
var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const serviceId = process.env.TWILIO_SERVICE_ID
const client = require('twilio')(accountSid, authToken);
var uuid = require('uuid');
var paypal = require('paypal-rest-sdk');
paypal.configure({
  'mode': 'sandbox', //sandbox or live 
  'client_id': 'AfJs549ebqbB9hzZNAfPtD8Oi7GYwmzbEhFcxnyxrMFF_6j3H-F_Y_1AIgsqnLFnIWQRtFvpMlZ1BcVM', // please provide your client id here 
  'client_secret': 'EHYmg-Hy7ojAvdGgNUR8tgjbSm6YlTUCI97BvwcIK-PaOMLdWklopX34anc7tJIPpKf9aYt7NWvj7Nwz' // provide your client secret here 
});
const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn == true) {
    next()
  } else {
    res.redirect('/loginmail')
  }
}
/* GET home page. */
router.get('/', async (req, res, next) => {
  let totalh = null
  let header = null
  if (req.session.user) {
    totalh = await userHelpers.getTotalAmount(req.session.user._id)
    header = await userHelpers.getHeaderDetails(req.session.user._id)
    console.log(header, "header");
  }

  productHelpers.getAllCategories().then((category) => {
    productHelpers.getLatestProducts().then((product) => {
      //let { user } = req.session.user
      let user = req.session.user
      const h = true;
      res.render('user/home', { admin: false, user, category, product, h, totalh, header });
    })
  })
});

router.get('/login', (req, res, next) => {
  res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  let user = req.session.user
  if (user) {
    res.redirect('/')
  } else {
    res.render('user/login', { layout: 'admin', user, "loginErr": req.session.userLoginErr })
    req.session.userLoginErr = false
  }
})

router.post('/login', (req, res, next) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status == 222) {
      res.render('user/login', { layout: 'admin', "loginErr": "Blocked Account..! Contact Admin" })
      req.session.userLoginErr = "Blocked Account..! Contact Admin"
    } else if (response.status) {
      let mobileNumber = (`+91${req.body.mobile}`)
      req.session.Phoneno = mobileNumber
      client.verify.v2.services(serviceId).verifications.create({ to: mobileNumber, channel: 'sms' })
        .then((verification) => {
          console.log(verification.status);
          req.session.otpSended = true
          let otpsend = req.session.otpSended
          req.session.userPre = response.user
          console.log(mobileNumber);
          res.render('user/login', { layout: 'admin', otpsend })
        })
    } else {
      res.render('user/login', { layout: 'admin', "loginErr": "User not Found...!Please Signup" })
      req.session.userLoginErr = "User not Found...!Please Signup"
    }
  })
})

router.post('/verifyotp', (req, res) => {
  let mobileNumber = req.session.Phoneno
  let otp = req.body.otp
  client.verify.v2.services(serviceId)
    .verificationChecks
    .create({ to: mobileNumber, code: otp })
    .then((verification_check) => {
      console.log(verification_check.status)
      if (verification_check.status == 'approved') {
        req.session.user = req.session.userPre
        console.log("verify otp", req.session.user);
        req.session.userLoggedIn = true;
        res.redirect('/')
      } else {
        req.session.otpSended = true
        let otpsend = req.session.otpSended
        req.session.userLoginErr = "Invalid otp"
        res.render('user/login', { layout: 'admin', "loginErr": "Entered otp is invalid", otpsend })
      }
    })
})

router.get('/loginmail', (req, res) => {
  if (req.session.userLoggedIn) {
    res.redirect('/')
  } else {
    res.render('user/loginmail', { layout: 'admin' })
  }
})

router.post('/loginmail', (req, res) => {
  userHelpers.doLoginMail(req.body).then((response) => {
    if (response.status == 333) {
      res.json({ wrongpassword: true })
      //res.render('user/login', { layout: 'admin', "loginErr": "Wrong Password...! Try Again" })
      req.session.userLoginErr = "Wrong Password...! Try Again"
    } else if (response.status == 222) {
      res.json({ block: true })
      //res.render('user/login', { layout: 'admin', "loginErr": "Blocked Account..! Contact Admin" })
      req.session.userLoginErr = "Blocked Account..! Contact Admin"
    } else if (response.status) {
      req.session.user = response.user
      req.session.userLoggedIn = true;
      //res.redirect('/')
      res.json(response)
    } else {
      res.json({ nouser: true })
      //res.render('user/login', { layout: 'admin', "loginErr": "User not Found...!Please Signup" })
      req.session.userLoginErr = "User not Found...!Please Signup"
    }
  })
})

router.get('/logout', (req, res) => {
  req.session.user = null
  req.session.userLoggedIn = false
  res.redirect('/')
})

router.get('/signup', (req, res) => {
  console.log(req.session.couponErr, "not valid");
  res.render('user/signup', { layout: 'admin', 'coupErr': req.session.couponErr })
  req.session.couponErr = null
})

router.post('/signup', (req, res) => {
  if (req.body.terms) {
    userHelpers.doSignup(req.body).then((response) => {
      if (response.status == "email") {
        console.log(response.status);
        res.render('user/signup', { layout: 'admin', "emailErr": "email already exists" })
      } else if (response.status == "mobile") {
        res.render('user/signup', { layout: 'admin', "mobileErr": "mobile number already exists" })
      } else if (response.status == "coupon") {
        req.session.couponErr = "refferal code is not valid..!  Try with valid refferal code"
        res.redirect('/signup')
      }
      else {
        req.session.couponErr = true
        res.redirect('/loginmail')
      }
    })
  } else {
    res.render('user/signup', { layout: 'admin', "termErr": "Please Agree Terms And Conditions" })
  }
})

router.get('/forgot', (req, res, next) => {
  res.render('user/forgot', { layout: 'admin' })
})

router.get('/get-products', async (req, res, next) => {
  let user = req.session.user
  let header
  let totalh = null
  if (req.session.user) {
    header = await userHelpers.getHeaderDetails(req.session.user._id)
    totalh = await userHelpers.getTotalAmount(req.session.user._id)
  }
  productHelpers.getAllCategories().then((category) => {
    productHelpers.getAllProducts().then((product) => {
      res.render('user/list-products', { category, product, user, header, totalh })
    })
  })

})
router.get('/product-details', async (req, res, next) => {
  let header = null
  let totalh = null
  if (req.session.user) {
    header = await userHelpers.getHeaderDetails(req.session.user._id)
    totalh = await userHelpers.getTotalAmount(req.session.user._id)
  }
  let category = await productHelpers.getAllCategories()
  let product = await productHelpers.getProductDetails(req.query.id)

  let images = product.Image
  console.log(images, "images");
  res.render('user/product-details', { product, category, header, 'user': req.session.user, totalh, images })
})

router.get('/mantain', (req, res) => {
  res.render('maintainance', { layout: 'admin' })
})

router.get('/add-to-cart/:id', verifyLogin, (req, res, next) => {
  let user = req.session.user
  userHelpers.addToCart(req.params.id, user._id).then((response) => {
    response.status = true
    console.log(response, "res cartttt");
    res.json(response)
  })
})

router.get('/add-to-cartt/:id', verifyLogin, (req, res, next) => {
  let user = req.session.user
  userHelpers.addToCartt(req.params.id, user._id).then(() => {
    res.json({ status: true })
  })
})

router.get('/add-to-wishlist/:id', verifyLogin, (req, res, next) => {
  let user = req.session.user
  userHelpers.addToWishlist(req.params.id, user._id).then((response) => {
    console.log(response, "response");
    res.json({ status: true, mod: response.modifiedCount })
  })
})

router.get('/cart', async (req, res) => {
  req.session.discount = null
  let user = req.session.user
  let userid
  let header = null
  let coupons = await userHelpers.getAllCoupons()
  console.log(coupons, "couponssss");
  if (user) {
    userid = req.session.user._id
    header = await userHelpers.getHeaderDetails(req.session.user._id)

  }
  if (userid) {
    let products = await userHelpers.getCartProducts(userid)
    let discount = await userHelpers.getTotalDiscount(req.session.user._id)
    let total = await userHelpers.getTotalAmount(req.session.user._id)

    res.render('user/cart', { products, user, header, total, discount, coupons })
  } else {
    res.redirect('/')
  }
})

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    response.discount = await userHelpers.getTotalDiscount(req.session.user._id)
    console.log(response, "respppp change quzN");
    res.json(response)
  })
})

router.post('/remove-product-cart', (req, res) => {
  userHelpers.removeCartProduct(req.body).then((response) => {
    res.json(response)
  })
})

router.post('/remove-wishlist-cart', (req, res) => {
  userHelpers.removeWishlistProduct(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/proceed-page', verifyLogin, async (req, res) => {
  let user = req.session.user
  let total = await userHelpers.getTotalAmount(user._id)

  let discount = await userHelpers.getTotalDiscount(req.session.user._id)
  let header = await userHelpers.getHeaderDetails(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let address = await userHelpers.getAddresses(req.session.user._id)
  let actual = discount + total
  console.log(req.session.discount, "proceeed");
  if (req.session.discount) {
    discount = await discount + req.session.discount.discAmount
    total = await req.session.discount.totalPrice
  }
  res.render('user/proceed', { total, user, header, address, products, discount, actual })
})

router.post('/proceed-page', async (req, res) => {
  let products = await userHelpers.getCartProductList(req.session.user._id)
  let totalPrice
  if (req.session.discount) {
    totalPrice = await req.session.discount.totalPrice
  } else {
    totalPrice = await userHelpers.getTotalAmount(req.session.user._id)
  }
  let address = await userHelpers.getAddressDetails(req.body.deliveryDetails, req.session.user._id)
  let addrs = address.shift();
  addrs.paymentMethod = req.body.paymentMethod
  userHelpers.placeOrder(addrs, products, totalPrice).then(async (orderId) => {
    req.session.user.orderId=orderId
    if (req.body.paymentMethod == "COD") {
      res.json({ codSuccess: true })
    } else if (req.body.paymentMethod == "RAZOR") {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        response.razor = true
        console.log(response, "resp rezor");
        res.json(response)
      })
    } else if (req.body.paymentMethod == "PAYPAL") {
      var payment = {
        "intent": "authorize",
        "payer": {
          "payment_method": "paypal"
        },
        "redirect_urls": {
          "return_url": "http://localhost:3000/order-succesfull",
          "cancel_url": "http://localhost:3000/payment-failed"
        },
        "transactions": [{
          "amount": {
            "total": totalPrice,
            "currency": "USD"
          },
          "description": orderId
        }]
      }
      // call the create Pay method 
      userHelpers.createPay(payment).then((transaction) => {
        var id = transaction.id;
        var links = transaction.links;
        var counter = links.length;
        while (counter--) {
          if (links[counter].rel === 'approval_url') {
            transaction.pay = true
            transaction.linkto = links[counter].href
            transaction.orderId = orderId
            userHelpers.changePaymentStatus(orderId).then(() => {
              res.json(transaction)
            })
          }
        }
      })
        .catch((err) => {
          res.redirect('/err');
        });
    } else if (req.body.paymentMethod == "WALLET") {
      userHelpers.walletPayment(req.session.user._id, totalPrice).then((response) => {
        if (response.status) {
          userHelpers.changePaymentStatus(orderId).then(() => {
            response.wallet = response.status
            res.json(response)
          })
        } else {
          userHelpers.deleteOrder(orderId).then(() => {
            req.session.walletErr = "Insufficient Balance ....Please try with another payment method"
            res.json({ statusW: true })
          })

        }

      })
    }
    else {
      res.send("errrrrr")
    }
  })
})

router.post('/verify-payment', (req, res) => {
  //console.log("verifypayment", req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err, "error"); z
    res.json({ status: false, errMsg: 'Payment Failed' })
  })
})

router.get('/wishlist', verifyLogin, async (req, res) => {
  let user = req.session.user
  let products = await userHelpers.getWishlist(user._id)
  let header = await userHelpers.getHeaderDetails(req.session.user._id)
  console.log(products);
  res.render('user/wishlist', { user, products, header })
})

router.get('/order-succesfull', verifyLogin, async (req, res) => {
  let user = req.session.user
  let header = await userHelpers.getHeaderDetails(req.session.user._id)
  let totalh = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/order-placed', { user, totalh, header })
})

router.get('/get-order', verifyLogin, async (req, res) => {
  let user = req.session.user
  let orders = await userHelpers.getUserOrders(user._id)
  orders.forEach(orders => {
    orders.date = orders.date.toDateString()
  });
  header = await userHelpers.getHeaderDetails(req.session.user._id)
  res.render('user/order-details', { user, orders, header })
})

router.get('/view-detail/', verifyLogin, async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.query.id)
  let order = await userHelpers.getOneOrder(req.query.id)
  let totalh = await userHelpers.getTotalAmountOrder(req.query.id)
  //let totalh = await userHelpers.getTotalAmount(req.session.user._id)
  order.date = order.date.toDateString()
  let discount = 0
  let user = req.session.user
  let total = await userHelpers.getOrderTotal(req.query.id)
  if (products.disc) {
    total = await products[0].totalAmount

  }
  discount = totalh - total
  let header = await userHelpers.getHeaderDetails(req.session.user._id)
  res.render('user/view-order-detail', { products, user, total, header, totalh, discount, order })
})

router.get('/contact-us', async (req, res) => {
  let header = null
  if (req.session.user) {
    header = await userHelpers.getHeaderDetails(req.session.user._id)
  }
  res.render('user/contact', { 'user': req.session.user, header })
})

router.get('/get-category-products', async (req, res) => {
  let header = null
  let totalh = null
  if (req.session.user) {
    header = await userHelpers.getHeaderDetails(req.session.user._id)
    totalh = await userHelpers.getTotalAmount(req.session.user._id)
  }
  productHelpers.getCategoryProducts(req.query.id).then((product) => {
    productHelpers.getAllCategories().then(async (category) => {

      res.render('user/list-products', { product, category, header, 'user': req.session.user, totalh })
    })
  })
})

router.post('/address', (req, res) => {
  console.log(req.body, "adddddddddddddddddddddddddddd");
  userHelpers.addNewAddress(req.body).then((response) => {
    res.redirect('/proceed-page')
  })
})

router.post('/addressP', (req, res) => {
  console.log(req.body, "adddddddddddddddddddddddddddd");
  userHelpers.addNewAddress(req.body).then((response) => {
    res.redirect('/proceed-page')
  })
})

router.get('/payment-failed', async (req, res) => {
  let header = await userHelpers.getHeaderDetails(req.session.user._id)
  if(req.session.user.orderId){
    await userHelpers.deleteOrder(req.session.user.orderId)
    req.session.user.orderId=null
  }
  res.render('user/paymentfailed', { 'walletErr': req.session.walletErr, 'user': req.session.user, header })
})

router.get('/userProfile', verifyLogin, async (req, res) => {
  let address = await userHelpers.getAddresses(req.session.user._id)
  let userdata = await userHelpers.userProfile(req.session.user._id)
  let header = await userHelpers.getHeaderDetails(req.session.user._id)
  res.render('user/user-profile', { address, userdata, 'user': req.session.user, header })
})

router.post('/user-profile', (req, res) => {
  console.log(req.body, "newww bodyyyy");
  res.redirect('/userProfile')
})

router.post('/cancel-order', (req, res) => {
  userHelpers.cancelOrder(req.body).then(() => {
    res.json({ status: true })
  })
})

router.post('/return-order', (req, res) => {
  console.log("paramss", req.body);
  userHelpers.returnOrder(req.body).then(() => {
    res.json({ status: true })
  })
})

router.get('/delete-address/', (req, res) => {
  userHelpers.deleteAddress(req.session.user._id, req.query.id).then(() => {
    res.redirect('/userProfile')
  })
})

router.get('/block/', (req, res) => {
  let userID = req.query.id
  userHelpers.doBlockUser(userID).then(() => {
    req.session.user = null
    req.session.userLoggedIn = false
    res.redirect('/')
  })
})

router.post('/coupon-discounts', async (req, res) => {
  let beftotal = await userHelpers.getTotalAmount(req.session.user._id)
  let coupon = await userHelpers.applyCoupon(req.session.user._id, req.body, beftotal)
  console.log(coupon, "routtttttttttttttt");
  let obj = {}
  obj.totalPrice = coupon.Price
  obj.discAmount = coupon.discAmount
  req.session.discount = obj
  res.json(coupon)
})

module.exports = router;
