const { response } = require('express');
var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')
const accountSid = "AC727ae40726c18b57c3f0ff4dd946cc47"
const authToken = "b432bcbe22e7351ef5ca7170c539e438"
const serviceId = "VAc22e87302ff985d0bdbccd5e79f1495b"
const client = require('twilio')(accountSid, authToken);
var uuid = require('uuid');
var paypal = require('paypal-rest-sdk');
const adminHelpers = require('../helpers/admin-helpers');
// <------------------------------------------PAYPAL CONFIGURE------------------------------------------->

paypal.configure({
  'mode': 'sandbox', //sandbox or live 
  'client_id': 'AfJs549ebqbB9hzZNAfPtD8Oi7GYwmzbEhFcxnyxrMFF_6j3H-F_Y_1AIgsqnLFnIWQRtFvpMlZ1BcVM', // please provide your client id here 
  'client_secret': 'EHYmg-Hy7ojAvdGgNUR8tgjbSm6YlTUCI97BvwcIK-PaOMLdWklopX34anc7tJIPpKf9aYt7NWvj7Nwz' // provide your client secret here 
});

module.exports = {
  getHome: async (req, res, next) => {
    let totalh = null
    let header = null
    let banner = await adminHelpers.getBanner()
    totalh = await userHelpers.getTotalAmount(req.session.user?._id)
    if (req.session.user) {
      header = await userHelpers.getHeaderDetails(req.session.user?._id)
    }
    productHelpers.getAllCategories().then((category) => {
      productHelpers.getLatestProducts().then((product) => {
        let user = req.session.user
        const h = true;
        res.render('user/home', { admin: false, user, category, product, h, totalh, header, banner });
      })
    })
  },
  getLogin: (req, res, next) => {
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
  },
  postLogin: (req, res, next) => {
    userHelpers.doLogin(req.body).then((response) => {
      if (response.status == 222) {
        res.render('user/login', { layout: 'admin', "loginErr": "Blocked Account..! Contact Admin" })
        req.session.userLoginErr = "Blocked Account..! Contact Admin"
      } else if (response.status) {
        let mobileNumber = (`+91${req.body.mobile}`)
        req.session.Phoneno = mobileNumber
        client.verify.v2.services(serviceId).verifications.create({ to: mobileNumber, channel: 'sms' })
          .then((verification) => {
            req.session.otpSended = true
            let otpsend = req.session.otpSended
            req.session.userPre = response.user
            res.render('user/login', { layout: 'admin', otpsend })
          })
      } else {
        res.render('user/login', { layout: 'admin', "loginErr": "User not Found...!Please Signup" })
        req.session.userLoginErr = "User not Found...!Please Signup"
      }
    })
  },
  postVerifyOtp: (req, res) => {
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
  },
  getLoginMail: (req, res) => {
    if (req.session.userLoggedIn) {
      res.redirect('/')
    } else {
      res.render('user/loginmail', { layout: 'admin' })
    }
  },
  postLoginMail: (req, res) => {
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
  },
  getSignup: (req, res) => {
    res.render('user/signup', { layout: 'admin', 'coupErr': req.session.couponErr })
    req.session.couponErr = null
  },
  getLogout: (req, res) => {
    req.session.user = null
    req.session.userLoggedIn = false
    res.redirect('/')
  },
  postSignup: (req, res) => {
    if (req.body.terms) {
      userHelpers.doSignup(req.body).then((response) => {
        if (response.status == "email") {
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
  },
  getForgot: (req, res, next) => {
    res.render('user/forgot', { layout: 'admin' })
  },
  getProducts: async (req, res, next) => {
    let user = req.session.user
    let header
    let totalh = null
    if (req.session.user) {
      header = await userHelpers.getHeaderDetails(req.session.user._id)
      totalh = await userHelpers.getTotalAmount(req.session.user._id)
    }
    productHelpers.getAllCategories().then((category) => {
      productHelpers.getAllProducts().then(async (product) => {
        let count = 0
        product.forEach(product => {
          count++
        });
        let pageCount = await userHelpers.paginatorCount(count)
        product = await userHelpers.getTenProducts(req.query.id)
        if (req.query.minimum) {
          let minimum = req.query.minimum.slice(1)
          let maximum = req.query.maximum.slice(1)
          let arr = []
          product = await productHelpers.getAllProducts()
          product.forEach(product => {
            if (product.OurPrice >= minimum && product.OurPrice <= maximum) {
              arr.push(product)
            }
          });
          product = arr
        }
        res.render('user/list-products', { category, product, user, header, totalh, pageCount })
      })
    })
  },
  getProductDetails: async (req, res, next) => {
    let header = null
    let totalh = null
    if (req.session.user) {
      header = await userHelpers.getHeaderDetails(req.session.user._id)
      totalh = await userHelpers.getTotalAmount(req.session.user._id)
    }
    let category = await productHelpers.getAllCategories()
    let product = await productHelpers.getProductDetails(req.query.id)
    let images = product.Image
    res.render('user/product-details', { product, category, header, 'user': req.session.user, totalh, images })
  },
  maintainance: (req, res) => {
    res.render('maintainance', { layout: 'admin' })
  },
  getAddtoCart: (req, res, next) => {
    let user = req.session.user
    userHelpers.addToCart(req.params.id, user._id).then((response) => {
      response.status = true
      res.json(response)
    })
  },
  getaddToCartt: (req, res, next) => {
    let user = req.session.user
    userHelpers.addToCartt(req.params.id, user._id).then(() => {
      res.json({ status: true })
    })
  },
  getAddtoWishlist: (req, res, next) => {
    let user = req.session.user
    userHelpers.addToWishlist(req.params.id, user._id).then((response) => {
      res.json({ status: true, mod: response.modifiedCount })
    })
  },
  getCart: async (req, res) => {
    req.session.discount = null
    let user = req.session.user
    let userid
    let header = null
    let coupons = await userHelpers.getAllCoupons()
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
  },
  getProceedPage: async (req, res) => {
    let user = req.session.user
    let total = await userHelpers.getTotalAmount(user._id)
    let discount = await userHelpers.getTotalDiscount(req.session.user._id)
    let header = await userHelpers.getHeaderDetails(req.session.user._id)
    let products = await userHelpers.getCartProducts(req.session.user._id)
    let address = await userHelpers.getAddresses(req.session.user._id)
    let coupons = await userHelpers.getAllCoupons()
    let actual = discount + total
    if (req.session.discount) {
      discount = await discount + req.session.discount.discAmount
      total = await req.session.discount.totalPrice
    }
    res.render('user/proceed', { total, user, header, address, products, discount, actual, coupons })
  },


  postProceedPage: async (req, res) => {
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
      req.session.user.orderId = orderId
      if (req.body.paymentMethod == "COD") {
        res.json({ codSuccess: true })
      } else if (req.body.paymentMethod == "RAZOR") {
        userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          response.razor = true
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
  },

  postVerifyPayment: (req, res) => {
    userHelpers.verifyPayment(req.body).then(() => {
      userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
        res.json({ status: true })
      })
    }).catch((err) => {
      res.json({ status: false, errMsg: 'Payment Failed' })
    })
  },

  getWishlist: async (req, res) => {
    let user = req.session.user
    let products = await userHelpers.getWishlist(user._id)
    let header = await userHelpers.getHeaderDetails(req.session.user._id)
    res.render('user/wishlist', { user, products, header })
  },

  getOrderSuccessful: async (req, res) => {
    let user = req.session.user
    let header = await userHelpers.getHeaderDetails(req.session.user._id)
    let totalh = await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/order-placed', { user, totalh, header })
  },

  getOrder: async (req, res) => {
    let user = req.session.user
    let order = await userHelpers.getUserOrders(user._id)
    let count = 0
    order.forEach(order => {
      order.date = order.date.toDateString()
      count++
    });
    let pageCount = await userHelpers.paginatorCount(count)
    let orders = await userHelpers.getTenOrders(user._id, req.query.id)
    header = await userHelpers.getHeaderDetails(req.session.user._id)
    res.render('user/order-details', { user, orders, header, pageCount })
  },

  getViewDetail: async (req, res) => {
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
  },

  getContactUs: async (req, res) => {
    let header = null
    if (req.session.user) {
      header = await userHelpers.getHeaderDetails(req.session.user._id)
    }
    res.render('user/contact', { 'user': req.session.user, header })
  },

  getCategoryProducts: async (req, res) => {
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
  },

  postAddress: (req, res) => {
    userHelpers.addNewAddress(req.body).then((response) => {
      res.redirect('/proceed-page')
    })
  },

  getPaymentFailed: async (req, res) => {
    let header = await userHelpers.getHeaderDetails(req.session.user._id)
    if (req.session.user.orderId) {
      await userHelpers.deleteOrder(req.session.user.orderId)
      req.session.user.orderId = null
    }
    res.render('user/paymentfailed', { 'walletErr': req.session.walletErr, 'user': req.session.user, header })
  },

  getUserProfile: async (req, res) => {
    let address = await userHelpers.getAddresses(req.session.user._id)
    let userdata = await userHelpers.userProfile(req.session.user._id)
    let header = await userHelpers.getHeaderDetails(req.session.user._id)
    res.render('user/user-profile', { address, userdata, 'user': req.session.user, header })
  },

  postUserProfile: (req, res) => {
    res.redirect('/userProfile')
  },

  postCancelOrder: (req, res) => {
    userHelpers.cancelOrder(req.body).then(() => {
      res.json({ status: true })
    })
  },

  postReturnOrder: (req, res) => {
    userHelpers.returnOrder(req.body).then(() => {
      res.json({ status: true })
    })
  },

  getDeleteAddress: (req, res) => {
    userHelpers.deleteAddress(req.session.user._id, req.query.id).then(() => {
      res.redirect('/userProfile')
    })
  },

  getBlock: (req, res) => {
    let userID = req.query.id
    userHelpers.doBlockUser(userID).then(() => {
      req.session.user = null
      req.session.userLoggedIn = false
      res.redirect('/')
    })
  },

  postCouponDiscounts: async (req, res) => {
    let beftotal = await userHelpers.getTotalAmount(req.session.user._id)
    let coupon = await userHelpers.applyCoupon(req.session.user._id, req.body, beftotal)
    let obj = {}
    obj.totalPrice = coupon.Price
    obj.discAmount = coupon.discAmount
    req.session.discount = obj
    res.json(coupon)
  },

  postUpdateAddress: (req, res) => {
    userHelpers.updateAddress(req.body, req.session.user._id).then((data) => {
      res.json({ status: true })
    })
  },

  getProductSearch: async (req, res) => {
    let header
    let user
    if (req.session.user) {
      header = await userHelpers.getHeaderDetails(req.session.user._id)
      user = req.session.user
    }
    userHelpers.searchProducts(req.query.key).then((product) => {
      productHelpers.getAllCategories().then(async (category) => {
        res.render('user/list-products', { category, product, user, header })
      })
      console.log(product, "prosuctsss");
    })
  },
  postChangeQuantity: (req, res, next) => {
    userHelpers.changeProductQuantity(req.body).then(async (response) => {
      response.total = await userHelpers.getTotalAmount(req.body.user)
      response.discount = await userHelpers.getTotalDiscount(req.session.user._id)
      res.json(response)
    })
  },

  postRemoveProduct: (req, res) => {
    userHelpers.removeCartProduct(req.body).then((response) => {
      res.json(response)
    })
  },

  postRemoveWishlistProduct: (req, res) => {
    userHelpers.removeWishlistProduct(req.body).then((response) => {
      res.json(response)
    })
  }


}