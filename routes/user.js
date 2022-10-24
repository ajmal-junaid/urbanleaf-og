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
  'client_id': 'AWe8io06sh96342VhmFGyj06SI1F22dVRzwGdQDUd399Y3YegtHH4_EO1LCGuOC7GKbuzw2K_UcNxk_g', // please provide your client id here 
  'client_secret': 'EGTqB02Zmpgg7NX5fR2Hb5YPgSSB6c_lGBnos_v8YgBJj9aBAB68YFRsby79lp2c2-wQmTwrqX-IC66Z' // provide your client secret here 
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
  let cartCount = null
  let totalh = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    totalh = await userHelpers.getTotalAmount(req.session.user._id)
  }

  productHelpers.getAllCategories().then((category) => {
    productHelpers.getAllProducts().then((product) => {
      //let { user } = req.session.user
      let user = req.session.user
      const h = true;
      res.render('user/home', { admin: false, user, category, product, h, cartCount, totalh });
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
  res.render('user/loginmail', { layout: 'admin' })
})

router.post('/loginmail', (req, res) => {
  userHelpers.doLoginMail(req.body).then((response) => {
    if (response.status == 333) {
      res.render('user/login', { layout: 'admin', "loginErr": "Wrong Password...! Try Again" })
      req.session.userLoginErr = "Wrong Password...! Try Again"
    } else if (response.status == 222) {
      res.render('user/login', { layout: 'admin', "loginErr": "Blocked Account..! Contact Admin" })
      req.session.userLoginErr = "Blocked Account..! Contact Admin"
    } else if (response.status) {
      req.session.user = response.user
      req.session.userLoggedIn = true;
      res.redirect('/')
    } else {
      res.render('user/login', { layout: 'admin', "loginErr": "User not Found...!Please Signup" })
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
  res.render('user/signup', { layout: 'admin' })
})

router.post('/signup', (req, res) => {
  if (req.body.terms) {
    userHelpers.doSignup(req.body).then((response) => {
      if (response.status == "email") {
        console.log(response.status);
        res.render('user/signup', { layout: 'admin', "emailErr": "email already exists" })
      } else if (response.status == "mobile") {
        res.render('user/signup', { layout: 'admin', "mobileErr": "mobile number already exists" })
      }
      else {
        res.redirect('/login')
      }
    })
  } else {
    res.render('user/signup', { layout: 'admin', "termErr": "Please Agree Terms And Conditions" })
  }
})

router.get('/forgot', (req, res, next) => {
  res.render('user/forgot', { layout: 'admin' })
})

router.get('/get-products', verifyLogin, async (req, res, next) => {
  let user = req.session.user
  let cartCount = null
  let totalh = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    totalh = await userHelpers.getTotalAmount(req.session.user._id)
  }
  productHelpers.getAllCategories().then((category) => {
    productHelpers.getAllProducts().then((product) => {
      res.render('user/list-products', { category, product, user, cartCount, totalh })
    })
  })

})
router.get('/product-details', async (req, res, next) => {
  let cartCount = null
  let totalh = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    totalh = await userHelpers.getTotalAmount(req.session.user._id)
  }
  let category = await productHelpers.getAllCategories()
  let product = await productHelpers.getProductDetails(req.query.id)
  res.render('user/product-details', { product, category, cartCount, 'user': req.session.user, totalh })
})

router.get('/mantain', (req, res) => {
  res.render('maintainance', { layout: 'admin' })
})

router.get('/add-to-cart/:id', (req, res, next) => {
  let user = req.session.user
  userHelpers.addToCart(req.params.id, user._id).then(() => {
    res.json({ status: true })
  })
})

router.get('/cart', async (req, res) => {
  let user = req.session.user
  let userid
  let cartCount = null
  if (user) {
    userid = req.session.user._id
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  if (userid) {
    let products = await userHelpers.getCartProducts(userid)
    let discount = await userHelpers.getTotalDiscount(req.session.user._id)
    let total = await userHelpers.getTotalAmount(req.session.user._id)
    let totalh = await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/cart', { products, user, cartCount, total, discount, totalh })
  } else {
    res.redirect('/')
  }
})

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.post('/remove-product-cart', (req, res) => {
  userHelpers.removeCartProduct(req.body).then((response) => {

    res.json(response)
  })
})

router.get('/proceed-page', async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let discount = await userHelpers.getTotalDiscount(req.session.user._id)
  let user = req.session.user
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let address = await userHelpers.getAddresses(req.session.user._id)
  let totalh = await userHelpers.getTotalAmount(req.session.user._id)
  let actual = discount + total
  res.render('user/proceed', { total, user, cartCount, address, products, discount, actual, totalh })
})

router.post('/proceed-page', async (req, res) => {
  let products = await userHelpers.getCartProductList(req.session.user._id)
  let totalPrice = await userHelpers.getTotalAmount(req.session.user._id)
  let address = await userHelpers.getAddressDetails(req.body.deliveryDetails, req.session.user._id)
  let addrs = address.shift();
  console.log(req.body);
  addrs.paymentMethod = req.body.paymentMethod
  userHelpers.placeOrder(addrs, products, totalPrice).then((orderId) => {
    if (req.body.paymentMethod == "COD") {
      res.json({ codSuccess: true })
    } else if (req.body.paymentMethod == "RAZOR") {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        res.json({ razorSuccess: true })
      })
    } else if (req.body.paymentMethod == "PAYPAL") {
      var payment = {
        "intent": "authorize",
        "payer": {
          "payment_method": "paypal"
        },
        "redirect_urls": {
          "return_url": "/order-succesfull",
          "cancel_url": "/payment-failed"
        },
        "transactions": [{
          "amount": {
            "total": totalPrice * 100,
            "currency": "USD"
          },
          "description": orderId
        }]
      }
      userHelpers.generatePaypal(orderId, totalPrice).then((response => {
        res.json(response)
      }))
    }
  })
})

router.post('/verify-payment', (req, res) => {
  console.log("verifypayment", req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err, "error");
    res.json({ status: false, errMsg: 'Payment Failed' })
  })
})

router.get('/add-to-wishlist', (req, res) => {
  res.render('user/cart')
})

router.get('/order-succesfull', async (req, res) => {
  let user = req.session.user
  let totalh = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/order-placed', { user, totalh })
})

router.get('/get-order', verifyLogin, async (req, res) => {
  let user = req.session.user
  let orders = await userHelpers.getUserOrders(user._id)
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  res.render('user/order-details', { user, orders, cartCount })
})

router.get('/view-detail/', async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.query.id)
  let total = await userHelpers.getTotalAmountOrder(req.query.id)
  let totalh = await userHelpers.getTotalAmount(req.session.user._id)
  let user = req.session.user
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  // console.log("totall", products);
  res.render('user/view-order-detail', { products, user, total, cartCount, totalh })
})

router.get('/contact-us', (req, res) => {
  res.render('user/contact')
})

router.get('/get-category-products', async (req, res) => {
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
   
  }
  productHelpers.getCategoryProducts(req.query.id).then((product) => {
    productHelpers.getAllCategories().then(async(category) => {
      let totalh = await userHelpers.getTotalAmount(req.session.user._id)
      res.render('user/list-products', { product, category, cartCount, 'user': req.session.user, totalh })
    })
  })
})

router.post('/address', (req, res) => {
  userHelpers.addNewAddress(req.body).then((response) => {
    res.redirect('/proceed-page')
  })
})

router.get('/payment-failed', (req, res) => {
  res.render('user/paymentfailed')
})

router.get('/userProfile',verifyLogin, async (req, res) => {
  let address = await userHelpers.getAddresses(req.session.user._id)
  let userdata=await userHelpers.userProfile(req.session.user._id)
  res.render('user/user-profile', { address,userdata,'user':req.session.user._id })
})

router.post('/user-profile', (req, res) => {
  console.log(req.body, "newww bodyyyy");
  res.redirect('/userProfile')
})

router.get('/cancel-order/:id', (req, res) => {
  console.log("paramss", req.params.id);
  userHelpers.cancelOrder(req.params.id).then(() => {
    res.json({ status: true })
  })
})

router.get('/delete-address/',(req,res)=>{
  userHelpers.deleteAddress(req.session.user._id,req.query.id).then(()=>{
    res.redirect('/userProfile')
  })
  
})

module.exports = router;
