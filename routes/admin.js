var express = require('express');
const { response } = require('../app');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var adminhelper = require('../helpers/admin-helpers');
var userHelpers = require('../helpers/user-helpers');
//end

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
  let obj = await adminhelper.getInsights()
  let pay = await adminhelper.getCodOnline()
  let onll = parseInt(pay.razor[0].sum) + parseInt(pay.paypal[0].sum)
  let cod = pay.cod[0].sum
  let totl = onll + cod
  let { ...info } = obj
  //obj.forEach(element => console.log(element));

  console.log(obj, "payyyyyyyyyyy");


  res.render('admin/home', { admin: true, layout: 'admin', totalorder, count, prof, onll, cod, totl, barData: obj });
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

router.post('/add-product', (req, res) => {
  console.log(req.body);
  productHelper.addProduct(req.body, (id) => {
    let image = req.files.Image
    let image2 = req.files.Image1
    let image3 = req.files.Image2
    picId = id.insertedId
    image.mv('./public/product-images/' + picId + '.jpg', (err, done) => {
      image2.mv('./public/product-images/' + picId + '(1).jpg')
      image3.mv('./public/product-images/' + picId + '(2).jpg')
      if (!err) {
        req.session.addprod = true;
        res.redirect('/admin/add-product')
      } else {
        console.log("error in image upload")
      }
    })
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

router.post('/add-category', (req, res) => {
  if (req.body.category) {
    productHelper.addCatogory(req.body, (data, err) => {
      if (err) {
        req.session.msg = "Category Already E xists"
      } else {
        let image = req.files.Image
        picId = data.insertedId
        image.mv('./public/category-images/' + picId + '.jpg', (err, done) => {
          if (!err) {
            req.session.msg = "Category Added Succesfully"
            res.redirect('/admin/add-category')
          } else {
            res.send("image error")
            console.log("error in image upload");
          }
        })
      }
    })
  } else {

    res.send("category name cannot be empty")
  }
});

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

router.post('/edit-category/', (req, res) => {
  console.log("dgsdgsdfghfsdhfd", req.query.id);
  productHelper.updateCategory(req.query.id, req.body).then(() => {
    res.redirect('/admin/category-management')
  })
})

router.post('/edit-product/', (req, res) => {
  productHelper.updateProduct(req.query.id, req.body).then(() => {
    picId = req.query.id
    res.redirect('/admin/product-management')
    if (req.files.Image) {
      let image = req.files.Image
      image.mv('./public/product-images/' + picId + '.jpg')
    }
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
  let orders = await userHelpers.getAllUserOrders()
  res.render('admin/order-management', { admin: true, layout: 'admin', err, orders });
  req.session.catErr = null
});

router.post('/update-status', (req, res) => {
  userHelpers.changestatus(req.body).then(() => {
    res.json()
  })
})

router.get('/reports', async (req, res) => {
  let rep = await adminhelper.getReport()
  console.log(rep, 'report');
  let total = await adminhelper.getAllorderCount()

  let totalprofit = await adminhelper.getTotalProfit()
  res.render('admin/sales-report', { layout: 'admin', admin: true })
})

router.post('/reports', async (req, res) => {

  console.log(req.body, "kukuku",);
  res.send(rep)
})

module.exports = router;
