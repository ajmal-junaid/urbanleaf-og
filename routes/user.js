const { response } = require('express');
var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const serviceId = process.env.TWILIO_SERVICE_ID
const client = require('twilio')(accountSid, authToken);


const verifyLogin = (req, res, next) => {
  if (req.session.userloggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}


/* GET home page. */
router.get('/', async (req, res, next) => {
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }

  productHelpers.getAllCategories().then((category) => {
    productHelpers.getAllProducts().then((product) => {
      //let { user } = req.session.user
      let user = req.session.user
      const h = true;
      res.render('user/home', { admin: false, user, category, product, h, cartCount });
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
      //res.redirect('/login')
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
          // res.redirect('/')
        })
    } else {
      res.render('user/login', { layout: 'admin', "loginErr": "User not Found...!Please Signup" })
      req.session.userLoginErr = "User not Found...!Please Signup"
      //res.redirect('/login')
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

router.get('/get-products', async (req, res, next) => {
  let user = req.session.user
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllCategories().then((category) => {
    productHelpers.getAllProducts().then((product) => {
      res.render('user/list-products', { category, product, user, cartCount })
    })


  })

})
router.get('/product-details', async (req, res, next) => {
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let category = await productHelpers.getAllCategories()
  let product = await productHelpers.getProductDetails(req.query.id)
  res.render('user/product-details', { product, category, cartCount })
})

router.get('/mantain', (req, res) => {
  res.render('maintainance', { layout: 'admin' })
})

router.get('/add-to-cart/:id', (req, res, next) => {
  let user = req.session.user
  userHelpers.addToCart(req.params.id, user._id).then(() => {
    res.json({ status: true })
    //res.redirect('/')
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
    let total = await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/cart', { products, user, cartCount, total })
  } else {
    res.redirect('/')
  }
  //let products = await userHelpers.getCartDetails(user._id)
  //console.log(products);

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
  let user = req.session.user
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  res.render('user/proceed', { total, user, cartCount })
})

router.post('/proceed-page', async (req, res) => {
  console.log(req.body, "bodyyyy");
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((response) => {
    res.json({ status: true })
  })
})

router.get('/add-to-wishlist', (req, res) => {
  res.render('user/cart')
})

router.get('/order-succesfull', (req, res) => {
  let user = req.session.user
  res.render('user/order-placed', { user })
})

router.get('/get-order', async (req, res) => {
  let user = req.session.user
  let orders = await userHelpers.getUserOrders(user._id)
  res.render('user/order-details', { user, orders })
})

router.get('/view-detail/', async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.query.id)
  let total = await userHelpers.getTotalAmountOrder(req.query.id)
  let user = req.session.user
console.log("totall",total);
  res.render('user/view-order-detail', { products, user ,total})
})

router.get('/contact-us', (req, res) => {
  res.render('user/contact')
})

router.get('/get-category-products', (req, res) => {
  productHelpers.getCategoryProducts(req.query.id).then((product) => {
    productHelpers.getAllCategories().then((category) => {
    
      res.render('user/list-products', { product, category })
    })


  })

})
module.exports = router;
