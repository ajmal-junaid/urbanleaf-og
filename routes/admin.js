var express = require('express');
const { response } = require('../app');
const multer = require('multer')
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var adminhelper = require('../helpers/admin-helpers');
var userHelpers = require('../helpers/user-helpers');
//end

/**********multer  */
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

/********** */


/**********multer  */
const multerStorageProduct = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/product-images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const uploadMul = multer({ storage: multerStorageProduct });
//const uploadMultiFile = uploadMul.fields([{ name: 'Image', maxCount: 1 }])

/********** */

const verifyAdmin = (req, res, next) => {
  res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  if (req.session.adminLoggedIn) {
    console.log(req.session.adminLoggedIn);
    next()
  } else {
    //res.redirect('/admin')
    next()
  }
}
/* GET users listing. */
router.get('/', (req, res, next) => {

  res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");

  if (req.session.admin) {
    res.redirect('/admin/home')
  } else {
    res.render('admin/login', { admin: false, layout: 'admin' });
    req.session.adminLoginErr = false
  }


});

router.post('/login', (req, res) => {
  console.log(req.body);
  adminhelper.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin
      req.session.adminLoggedIn = true
      res.redirect('/admin/home')
    } else {
      res.redirect('/admin')
    }
  })
});

router.get('/home', verifyAdmin, async (req, res, next) => {
  let totalorder = await adminhelper.getAllorderCount()
  let count = await adminhelper.getCountAll()
  let prof = await adminhelper.getTotalProfit()
  let barData = await adminhelper.getInsights()
  let pay = await adminhelper.getCodOnline()
  let onll = 0
  let cod = 0
  let totl = 0
  console.log(barData.yearly, "yearly");
  console.log(barData.monthly, "monthly");
  console.log(barData.daily, "daily");
  console.log("------------------------------------------------------");
  console.log(barData);
  if (pay.razor[0] && pay.paypal[0]) {
    onll = parseInt(pay.razor[0].sum) + parseInt(pay.paypal[0].sum)
  } else if (pay.paypal[0]) {
    onll = parseInt(pay.paypal[0].sum)
  } else if (pay.razor[0]) {
    onll = parseInt(pay.razor[0].sum)
  }
  if (pay.cod[0]) {
    cod = pay.cod[0].sum
  }

  totl = onll + cod
  res.render('admin/home', { admin: true, layout: 'admin', totalorder, count, prof, onll, cod, totl, barData });
});


router.get('/user-management', verifyAdmin, (req, res, next) => {
  adminhelper.getAllUsers().then((userData) => {
    res.render('admin/user-management', { admin: true, layout: 'admin', userData });
  })
});

router.get('/product-management', verifyAdmin, (req, res, next) => {
  productHelper.getAllProducts().then((products) => {
    let err = req.session.proErr
    res.render('admin/product-management', { admin: true, layout: 'admin', products, err });
    req.session.proErr = null
  })
});

router.get('/category-management', verifyAdmin, (req, res, next) => {
  productHelper.getAllCategories().then((category) => {
    let err = req.session.catErr
    res.render('admin/category-management', { admin: true, layout: 'admin', category, err });
    req.session.catErr = null
  })
});

router.get('/add-product', verifyAdmin, (req, res, next) => {
  productHelper.getAllCategories().then((category) => {
    let add = req.session.addprod
    res.render('admin/add-product', { admin: true, layout: 'admin', category, add });
    req.session.addprod = null
  })
});

router.post('/add-product', uploadMul.array('Image'), (req, res) => {
  console.log(req.files, "addprodddddddddddddd");
  let image = []
  req.files.forEach(function (value, index) {
    image.push(value.filename)
  })
  req.body.Image = image
  //req.body.ImageH = req.files.Image[0].filename
  productHelper.addProduct(req.body, (id) => {
    req.session.addprod = true;
    res.redirect('/admin/add-product')
  })
});

router.get('/logout', (req, res) => {
  req.session.admin = null
  req.session.adminLoggedIn = false
  res.redirect('/admin')
})

router.get('/add-category', verifyAdmin, (req, res, next) => {
  let msg = req.session.msg
  res.render('admin/add-category', { admin: true, layout: 'admin', msg });
  req.session.msg = null
});

router.post('/add-category', uploadSingleFile, (req, res) => {
  if (req.body.category) {
    req.body.Image = req.files.Image[0].filename
    productHelper.addCatogory(req.body).then((response) => {
      console.log(response, "resppppp");
      if (response.acknowledged) {
        req.session.msg = "Category Added Succesfully"
        res.redirect('/admin/add-category')
      } else {
        req.session.msg = "Category Already Exists"
        res.redirect('/admin/add-category')

      }
    })
  }
})


router.get('/delete-product/:id', verifyAdmin, (req, res) => {
  let proId = req.params.id
  console.log(proId);
  productHelper.deleteProduct(proId).then((response) => {
    req.session.proErr = "Product deleted sucessfully"
    res.redirect('/admin/product-management')
    req.session.proErr = null
  })
})

router.get('/delete-user/:id', verifyAdmin, (req, res) => {
  let userId = req.params.id
  adminhelper.deleteUser(userId).then((response) => {
    res.redirect('/admin/user-management')
  })
})

router.get('/delete-category/:id', verifyAdmin, (req, res) => {
  let catId = req.params.id
  adminhelper.deleteCategory(catId).then((response) => {
    if (response.status) {
      req.session.catErr = "Category deleted sucessfully"
      res.redirect('/admin/category-management')
    } else {
      req.session.catErr = "Delete the products in this category to continue"
      res.redirect('/admin/category-management')
    }
    req.session.catErr = null
  })
})

router.get('/edit-product/', verifyAdmin, async (req, res) => {
  let product = await productHelper.getProductDetails(req.query.id)
  productHelper.getAllCategories().then((category) => {
    res.render('admin/edit-product', { admin: true, layout: 'admin', product, category })
  })
})

router.get('/edit-category/', verifyAdmin, async (req, res) => {
  let category = await productHelper.getCategoryDetails(req.query.id)
  res.render('admin/edit-category', { admin: true, layout: 'admin', category })
})

router.post('/edit-category/', uploadSingleFile, async (req, res) => {
  if (req.files.Image == null) {
    Image1 = await productHelper.fetchImage(req.query.id)
  } else {
    Image1 = req.files.Image[0].filename
  }
  req.body.Image = Image1
  productHelper.updateCategory(req.query.id, req.body).then(() => {
    res.redirect('/admin/category-management')
  })
})

router.post('/edit-product/', uploadMul.array('Image'), async (req, res) => {
  if (req.files.Image == null) {
    console.log(req.query.id, "idd");
    Images = await productHelper.fetchImages(req.query.id)
  } else {
    let Images = []
    req.files.forEach(function (value, index) {
      Images.push(index + value.filename)
    })
  }
  req.body.Image = Images
  productHelper.updateProduct(req.query.id, req.body).then(() => {
    res.redirect('/admin/product-management')
  })
})

router.get('/block/', verifyAdmin, (req, res) => {
  let userID = req.query.id
  userHelpers.doBlockUser(userID).then(() => {
    res.redirect('/admin/user-management')
  })
})

router.get('/unblock/', verifyAdmin, (req, res) => {
  let userID = req.query.id
  userHelpers.doUnBlockUser(userID).then(() => {
    res.redirect('/admin/user-management')
  })
})

router.get('/order-management', verifyAdmin, async (req, res, next) => {
  let err = null
  let orders = await userHelpers.getAllOrders()
  orders.forEach(orders => {
    orders.date = orders.date.toDateString()
  });
  console.log(orders, "0000000000000000000000000");
  res.render('admin/order-management', { admin: true, layout: 'admin', err, orders });
  req.session.catErr = null
});

router.post('/update-status', (req, res) => {
  userHelpers.changestatus(req.body).then(() => {
    res.json()
  })
})


router.get('/coupon-management', verifyAdmin, async (req, res, next) => {
  // let err = null
  // let orders = await userHelpers.getAllUserOrders()
  couponErr = req.session.couponErr
  productHelper.getAllCategories().then((category) => {
    adminhelper.getAllCoupons().then((coupons) => {
      console.log(coupons, "coupponnnn");
      res.render('admin/coupon-management', { admin: true, layout: 'admin', category, coupons });
    })
  })
});


router.post('/add-coupon', (req, res) => {
  adminhelper.addCoupon(req.body).then((response) => {
    if (response.status) {
      req.session.coupon = "added Succesfully"
      res.redirect('/admin/coupon-management')
    } else {
      req.session.coupon = "Coupon Already Exists...!"
      res.redirect('/admin/coupon-management')
    }
  })
});


router.get('/delete-coupon/:id', verifyAdmin, (req, res) => {
  let cId = req.params.id
  console.log(cId, "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
  adminhelper.deleteCoupon(cId).then(() => {
    req.session.couponErr = "coupon deleted sucessfully"
    res.redirect('/admin/coupon-management')
    req.session.couponErr = null
  })
})

router.get('/reports', async (req, res) => {
  let rep = await adminhelper.getAllReports()
  console.log(rep, 'report');

  let total = await adminhelper.getAllorderCount()
  let totalprofit = await adminhelper.getTotalProfit()

  res.render('admin/sales-report', { layout: 'admin', admin: true, rep, totalprofit })

})

router.post('/reports', async (req, res) => {

  let rep = await adminhelper.getReportWithDate(req.body.from, req.body.to)
  res.render('admin/sales-report', { layout: 'admin', admin: true, rep, 'date': req.body })
})


module.exports = router;
