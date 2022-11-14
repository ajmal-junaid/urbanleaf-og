var express = require('express');
const { response } = require('../app');
const multer = require('multer')
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var adminhelper = require('../helpers/admin-helpers');
var userHelpers = require('../helpers/user-helpers');
let {getAdminLogin,postAdminLogin,getHome,getLogout,postAddProduct,getUserManagement,getProductManagement,getCategoryManagement,
  getAddProduct,getAddCategory,postAddCategory,getDeleteUser,getDeleteProduct,getDeleteCategory,postEditProduct,getEditProduct,
  getEditCategory,postEditCategory, getBlock,getUnBlock,postAddbanner,getBanner,postReport,getReport,deleteCoupon,postAddCoupon,
  getCouponManagement,postUpdateStatus,getOrderManagement}=require('../controller/admin-controller')

// <------------------------------------------ MULTER CONFIGURATION ------------------------------------------->

const multerStorageCategory = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/category-images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const uploadOne = multer({ storage: multerStorageCategory });
const uploadSingleFile = uploadOne.fields([{ name: 'Image', maxCount: 1 }])

// <------ MULTER FOR MULTIPLE IMAGES -------->

const multerStorageProduct = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/product-images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const uploadMul = multer({ storage: multerStorageProduct });

// <------- MULTER FOR BANNER ---------->

const multerStorageBanner = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/banner-images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const uploadBanner = multer({ storage: multerStorageBanner });

// <------------------------------------------ VERIFY ADMIN FUNCTION ------------------------------------------->

const verifyAdmin = (req, res, next) => {
  res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  if (req.session.adminLoggedIn) {
    next()
  } else {
    res.redirect('/admin')
  }
}

// <------------------------------------------ GET ADMIN LOGIN ------------------------------------------->

router.get('/', getAdminLogin);

// <------------------------------------------ POST ------------------------------------------->

router.post('/login', postAdminLogin);

// <------------------------------------------ GET ADMIN HOME ------------------------------------------->

router.get('/home', verifyAdmin, getHome);

// <------------------------------------------ GET USER MANAGEMENT ------------------------------------------->

router.get('/user-management', verifyAdmin, getUserManagement);

// <------------------------------------------ GET PRODUCT MANAGEMENT ------------------------------------------->

router.get('/product-management', verifyAdmin, getProductManagement);

// <------------------------------------------ GET CATEGORY MANAGEMENT ------------------------------------------->

router.get('/category-management', verifyAdmin, getCategoryManagement);

// <------------------------------------------ GET ADD PRODUCT PAGE ------------------------------------------->

router.get('/add-product', verifyAdmin, getAddProduct);

// <------------------------------------------ POST ADD PRODUCT ------------------------------------------->

router.post('/add-product', uploadMul.array('Image'), postAddProduct);

// <------------------------------------------ GET ADMIN LOGOUT ------------------------------------------->

router.get('/logout', getLogout)

// <------------------------------------------ GET ADD CATEGORY ------------------------------------------->

router.get('/add-category', verifyAdmin, getAddCategory);

// <------------------------------------------ POST ADD CATEGORY ------------------------------------------->

router.post('/add-category', uploadSingleFile, postAddCategory)

// <------------------------------------------ GET DELETE PRODUCT ------------------------------------------->

router.get('/delete-product/:id', verifyAdmin, getDeleteProduct)

// <------------------------------------------ GET DELETE USER ------------------------------------------->

router.get('/delete-user/:id', verifyAdmin, getDeleteUser)

// <------------------------- GET DELETE CATEGORY(IF NO PRODUCTS UNDER THIS CATEGORY)---------------------->

router.get('/delete-category/:id', verifyAdmin, getDeleteCategory)

// <------------------------------------------ GET EDIT PRODUCT------------------------------------------->

router.get('/edit-product/', verifyAdmin,getEditProduct)

// <------------------------------------------ GET EDIT CATEGORY ------------------------------------------->

router.get('/edit-category/', verifyAdmin,getEditCategory)

// <------------------------------------------ POST EDIT CATEGORY ------------------------------------------->

router.post('/edit-category/', uploadSingleFile, postEditCategory)

// <------------------------------------------ POST EDIT PRODUCT ------------------------------------------->

router.post('/edit-product/', uploadMul.array('Image'), postEditProduct)

// <------------------------------------------ GET BLOCK USER ------------------------------------------->

router.get('/block/', getBlock)

// <------------------------------------------ UNBLOCK USER ------------------------------------------->

router.get('/unblock/', verifyAdmin, getUnBlock)

// <------------------------------------------ GET ORDER MANAGEMENT------------------------------------------->

router.get('/order-management', verifyAdmin, getOrderManagement);

// <------------------------------ POST UPDATE STATUS OF EACH PRODUCT OF ORDER -------------------------------------->

router.post('/update-status', postUpdateStatus)

// <------------------------------------------ GET COUPON MANAGEMENT ------------------------------------------->

router.get('/coupon-management', verifyAdmin, getCouponManagement);

// <------------------------------------------ POST ADD COUPON ------------------------------------------->

router.post('/add-coupon', postAddCoupon);

// <------------------------------------------ GET DELETE COUPON ------------------------------------------->

router.get('/delete-coupon/:id', verifyAdmin, deleteCoupon)

// <------------------------------------------ GET SALES REPORT(WHOLE REPORT) ------------------------------------------->

router.get('/reports', getReport)

// <------------------------------- POST SALES REPORT ACCORDING TO DATE ------------------------------------------->

router.post('/reports', postReport)

// <------------------------------------------ GET BANNER MANAGEMENT ------------------------------------------->

router.get('/banner-management', verifyAdmin, getBanner);

// <------------------------------------------ POST ADD BANNER ------------------------------------------->

router.post('/add-banner', uploadBanner.array('Image'),postAddbanner)

module.exports = router;
