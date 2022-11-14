var express = require('express');
const { response } = require('../app');
const multer = require('multer')
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var adminhelper = require('../helpers/admin-helpers');
var userHelpers = require('../helpers/user-helpers');

module.exports={
    getAdminLogin : (req, res, next) => {
        res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
        res.header("Expires", "-1");
        res.header("Pragma", "no-cache");
        if (req.session.admin) {
          res.redirect('/admin/home')
        } else {
          res.render('admin/login', { admin: false, layout: 'admin', "adminErr": req.session.adminErr });
          req.session.adminErr = false
        }
      },
      postAdminLogin:(req, res) => {
        adminhelper.doAdminLogin(req.body).then((response) => {
          if (response.status) {
            req.session.admin = response.admin
            req.session.adminLoggedIn = true
            res.redirect('/admin/home')
          } else {
            req.session.adminErr = "Wrong Credentials"
            res.redirect('/admin')
          }
        })
      },
      getHome:async (req, res, next) => {
        let totalorder = await adminhelper.getAllorderCount()
        let count = await adminhelper.getCountAll()
        let barData = await adminhelper.getInsights()
        let pay = await adminhelper.getCodOnline()
        let rep = await adminhelper.getAllReports()
        let onll = 0
        let cod = 0
        let totl = 0
        let wallet = 0
        let paypal
        let razor
        if (pay.razor[0] && pay.paypal[0]) {
          onll = parseInt(pay.razor[0].sum) + parseInt(pay.paypal[0].sum)
        } else if (pay.paypal[0]) {
          onll = parseInt(pay.paypal[0].sum)
          paypal = parseInt(pay.paypal[0].sum)
        } else if (pay.razor[0]) {
          onll = parseInt(pay.razor[0].sum)
          razor = parseInt(pay.razor[0].sum)
        }
        if (pay.cod[0]) {
          cod = pay.cod[0].sum
        }
        if (pay.wallet[0].sum) {
          wallet = pay.wallet[0].sum
        }
        totl = onll + cod
        res.render('admin/home', { admin: true, layout: 'admin', totalorder, count, onll, cod, totl, barData, rep, wallet, paypal, razor });
      },
      getUserManagement:(req, res, next) => {
        adminhelper.getAllUsers().then((userData) => {
          res.render('admin/user-management', { admin: true, layout: 'admin', userData });
        })
      },
      getProductManagement:(req, res, next) => {
        productHelper.getAllProducts().then((products) => {
          let err = req.session.proErr
          res.render('admin/product-management', { admin: true, layout: 'admin', products, err });
          req.session.proErr = null
        })
      },
      getCategoryManagement:(req, res, next) => {
        productHelper.getAllCategories().then((category) => {
          let err = req.session.catErr
          res.render('admin/category-management', { admin: true, layout: 'admin', category, err });
          req.session.catErr = null
        })
      },
      getAddProduct:(req, res, next) => {
        productHelper.getAllCategories().then((category) => {
          let add = req.session.addprod
          res.render('admin/add-product', { admin: true, layout: 'admin', category, add });
          req.session.addprod = null
        })
      },
      postAddProduct:(req, res) => {
        let image = []
        req.files.forEach(function (value, index) {
          image.push(value.filename)
        })
        req.body.Image = image
        productHelper.addProduct(req.body, (id) => {
          req.session.addprod = true;
          res.redirect('/admin/add-product')
        })
      },
      getLogout:(req, res) => {
        req.session.admin = null
        req.session.adminLoggedIn = false
        res.redirect('/admin')
      },
      getAddCategory:(req, res, next) => {
        let msg = req.session.msg
        res.render('admin/add-category', { admin: true, layout: 'admin', msg });
        req.session.msg = null
      },
      postAddCategory:(req, res) => {
        if (req.body.category) {
          req.body.Image = req.files.Image[0].filename
          productHelper.addCatogory(req.body).then((response) => {
            if (response.acknowledged) {
              req.session.msg = "Category Added Succesfully"
              res.redirect('/admin/add-category')
            } else {
              req.session.msg = "Category Already Exists"
              res.redirect('/admin/add-category')
      
            }
          })
        }
      },
      getDeleteProduct:(req, res) => {
        let proId = req.params.id
        productHelper.deleteProduct(proId).then((response) => {
          req.session.proErr = "Product deleted sucessfully"
          res.redirect('/admin/product-management')
          req.session.proErr = null
        })
      },
      getDeleteUser:(req, res) => {
        let userId = req.params.id
        adminhelper.deleteUser(userId).then((response) => {
          res.redirect('/admin/user-management')
        })
      },
      getDeleteCategory:(req, res) => {
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
      },
      postEditProduct:async (req, res) => {
        if (req.files.Image == null) {
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
      },
      getEditProduct:async (req, res) => {
        let product = await productHelper.getProductDetails(req.query.id)
        productHelper.getAllCategories().then((category) => {
          res.render('admin/edit-product', { admin: true, layout: 'admin', product, category })
        })
      },
      getEditCategory:async (req, res) => {
        let category = await productHelper.getCategoryDetails(req.query.id)
        res.render('admin/edit-category', { admin: true, layout: 'admin', category })
      },
      postEditProduct:async (req, res) => {
        if (req.files.Image == null) {
          Image1 = await productHelper.fetchImage(req.query.id)
        } else {
          Image1 = req.files.Image[0].filename
        }
        req.body.Image = Image1
        productHelper.updateCategory(req.query.id, req.body).then(() => {
          res.redirect('/admin/category-management')
        })
      },
      postEditCategory:async (req, res) => {
        if (req.files.Image == null) {
          Image1 = await productHelper.fetchImage(req.query.id)
        } else {
          Image1 = req.files.Image[0].filename
        }
        req.body.Image = Image1
        productHelper.updateCategory(req.query.id, req.body).then(() => {
          res.redirect('/admin/category-management')
        })
      },
      getBlock: (req, res) => {
        let userID = req.query.id
        userHelpers.doBlockUser(userID).then(() => {
          res.redirect('/admin/user-management')
        })
      },
      getUnBlock:(req, res) => {
        let userID = req.query.id
        userHelpers.doUnBlockUser(userID).then(() => {
          res.redirect('/admin/user-management')
        })
      },
      getOrderManagement:async (req, res, next) => {
        let err = null
        let orders = await userHelpers.getAllOrders()
        orders.forEach(orders => {
          orders.date = orders.date.toDateString()  
        });
        res.render('admin/order-management', { admin: true, layout: 'admin', err, orders });
        req.session.catErr = null
      },
      postUpdateStatus:(req, res) => {
        userHelpers.changestatus(req.body).then(() => {
          res.json()
        })
      },
      getCouponManagement:async (req, res, next) => {
        couponErr = req.session.couponErr
        productHelper.getAllCategories().then((category) => {
          adminhelper.getAllCoupons().then((coupons) => {
            res.render('admin/coupon-management', { admin: true, layout: 'admin', category, coupons });
          })
        })
      },
      postAddCoupon:(req, res) => {
        adminhelper.addCoupon(req.body).then((response) => {
          if (response.status) {
            req.session.coupon = "added Succesfully"
            res.redirect('/admin/coupon-management')
          } else {
            req.session.coupon = "Coupon Already Exists...!"
            res.redirect('/admin/coupon-management')
          }
        })
      },
      deleteCoupon:(req, res) => {
        let cId = req.params.id
        adminhelper.deleteCoupon(cId).then(() => {
          req.session.couponErr = "coupon deleted sucessfully"
          res.redirect('/admin/coupon-management')
          req.session.couponErr = null
        })
      },
      getReport:async (req, res) => {
        let rep = await adminhelper.getAllReports()
        let total = await adminhelper.getAllorderCount()
        let totalprofit = await adminhelper.getTotalProfit()
        res.render('admin/sales-report', { layout: 'admin', admin: true, rep, totalprofit })
      },
      postReport:async (req, res) => {
        let rep = await adminhelper.getReportWithDate(req.body.from, req.body.to)
        res.render('admin/sales-report', { layout: 'admin', admin: true, rep, 'date': req.body })
      },
      getBanner:async (req, res, next) => {
        //couponErr = req.session.couponErr
        productHelper.getAllCategories().then((category) => {
          adminhelper.getAllCoupons().then((coupons) => {
            res.render('admin/banner-management', { admin: true, layout: 'admin', category, coupons });
          })
        })
      },
      postAddbanner:(req, res) => {
        let image = []
        req.files.forEach(function (value, index) {
          image.push(value.filename)
        })
        req.body.Image = image
        req.body.name="banner"
        adminhelper.addBanner(req.body).then(() => {
          res.redirect("/admin/banner-management")
        })
      }


}