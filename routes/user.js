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
const adminHelpers = require('../helpers/admin-helpers');
let { getHome, getLogin, postLogin, postVerifyOtp, getLoginMail, postLoginMail, getSignup,getLogout, postSignup,
   getForgot, getProducts, maintainance, getProductDetails, getAddtoCart, getaddToCartt, getAddtoWishlist, getCart,
   postChangeQuantity,postRemoveProduct,postRemoveWishlistProduct,getProceedPage, postProceedPage,postVerifyPayment,
  getWishlist, getOrderSuccessful,getOrder, getViewDetail, getContactUs, getCategoryProducts,postAddress, getPaymentFailed,
  getUserProfile, postUserProfile, postCancelOrder,postReturnOrder, getDeleteAddress, getBlock, postCouponDiscounts,
  postUpdateAddress, getProductSearch } = require('../controller/user-controller')


// <------------------------------------------VERIFY LOGIN------------------------------------------->

const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn == true) {
    next()
  } else {
    res.redirect('/loginmail')
  }
}

// <------------------------------------------HOME-PAGE ------------------------------------------->

router.get('/', getHome);

// <------------------------------------------GET LOGIN------------------------------------------->

router.get('/login', getLogin)

// <------------------------------------------POST LOGIN------------------------------------------->

router.post('/login', postLogin)

// <------------------------------------------OTP VERIFICATION TWILLIO------------------------------------------->

router.post('/verifyotp', postVerifyOtp)

// <------------------------------------------GET LOGIN-THROUGH E-MAIL ------------------------------------------->

router.get('/loginmail', getLoginMail)

// <------------------------------------------ POST-LOGIN-WITH E-MAIL ------------------------------------------->

router.post('/loginmail', postLoginMail)

// <------------------------------------------ GET-LOGOUT ------------------------------------------->

router.get('/logout', getLogout)

// <------------------------------------------ GET SIGN-UP ------------------------------------------->

router.get('/signup', getSignup)

// <------------------------------------------ POST SIGNUP ------------------------------------------->

router.post('/signup', postSignup)

// <------------------------------------------ GET FORGOT PASSWORD ------------------------------------------->

router.get('/forgot', getForgot)

// <------------------------------------------ GET GET-PRODUCTS ------------------------------------------->

router.get('/get-products', getProducts)

// <------------------------------------------ GET PRODUCT DETAILS ------------------------------------------->

router.get('/product-details', getProductDetails)

// <------------------------------------------ GET PAGE-UNDER MAINTAINANCE ------------------------------------------->

router.get('/mantain', maintainance)

// <------------------------------------------ GET ADDTOCART ------------------------------------------->

router.get('/add-to-cart/:id', verifyLogin, getAddtoCart)

// <------------------------------------------ POST ADDTOCART FROM WISHLIST------------------------------------------->

router.get('/add-to-cartt/:id', verifyLogin, getaddToCartt)

// <------------------------------------------ GET ADDTOWISHLIST ------------------------------------------->

router.get('/add-to-wishlist/:id', verifyLogin, getAddtoWishlist)

// <------------------------------------------ GET VIEW CART ------------------------------------------->

router.get('/cart', getCart)

// <------------------------------------------ POST INCREMENT OR DECREMENT QUANTITY (CART) ------------------------------------------->

router.post('/change-product-quantity',postChangeQuantity )

// <------------------------------------------ POST REMOVE PRODUCT FROM CART------------------------------------------->

router.post('/remove-product-cart',postRemoveProduct )

// <------------------------------------------ POST REMOVE PRODUCT FROM WISHLIST------------------------------------------->

router.post('/remove-wishlist-cart', postRemoveWishlistProduct)

// <------------------------------------------ GET PROCEED TO CHECKOUT PAGE ------------------------------------------->

router.get('/proceed-page', verifyLogin,getProceedPage)

// <------------------------------------------ POST PROCEED TO CHECKOUT(PAYMENT METHODS,ADDRESS SELECTION)------------------------------------------->

router.post('/proceed-page', postProceedPage)

// <------------------------------------------ POST VERIFY PAYMENT(RAZORPAY) ------------------------------------------->

router.post('/verify-payment',postVerifyPayment )

// <------------------------------------------ GET WISHLIST ------------------------------------------->

router.get('/wishlist',verifyLogin, getWishlist)

// <------------------------------------------ GET ORDER SUCCESSFULL PAGE ------------------------------------------->

router.get('/order-succesfull', verifyLogin, getOrderSuccessful)

// <------------------------------------------ GET ALL ORDERS OF USER ------------------------------------------->

router.get('/get-order', verifyLogin,getOrder)

// <------------------------------------------ GET VIEW ORDER IN DETAIL ------------------------------------------->

router.get('/view-detail/', verifyLogin, getViewDetail)

// <------------------------------------------ GET CONTACT US PAGE ------------------------------------------->

router.get('/contact-us', getContactUs)

// <------------------------------------------ GET CATEGORY WISE PRODUCTS ------------------------------------------->

router.get('/get-category-products', getCategoryProducts)

// <------------------------------------------ POST ADD NEW ADDRESS------------------------------------------->

router.post('/address',postAddress )

// router.post('/addressP', (req, res) => {
//   userHelpers.addNewAddress(req.body).then((response) => {
//     res.redirect('/proceed-page')
//   })
// })

// <------------------------------------------ GET PAYMENT FAILED PAGE ------------------------------------------->
router.get('/payment-failed', getPaymentFailed)

// <------------------------------------------ GET USER PROFILE PAGE ------------------------------------------->

router.get('/userProfile', verifyLogin, getUserProfile)

// <------------------------------------------ POST USER PROFILE UPDATIONS------------------------------------------->

router.post('/user-profile', postUserProfile)

// <------------------------------------------ POST CANCEL SINGLE PRODUCT BY USER ------------------------------------------->

router.post('/cancel-order', postCancelOrder)

// <------------------------------------------ RETURN ORDER ------------------------------------------->

router.post('/return-order',postReturnOrder)

// <------------------------------------------ GET DELETE ADDRESS ------------------------------------------->

router.get('/delete-address/', verifyLogin, getDeleteAddress)

// <------------------------------------------ GET DEACTIVATE USER ACCOUNT ------------------------------------------->

router.get('/block/', verifyLogin, getBlock)

// <------------------------------------------ POST COUPON DISCOUNT APPLY ------------------------------------------->

router.post('/coupon-discounts', postCouponDiscounts)

// <------------------------------------------ POST UPDATE USER ADDRESS ------------------------------------------->

router.post('/updateaddress',postUpdateAddress )

// <------------------------------------------ GET PRODUCT SEARCH ------------------------------------------->

router.get('/productsearch', getProductSearch)
module.exports = router;
