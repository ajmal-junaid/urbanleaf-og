var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('express')
let { uid } = require('uid')
const { NewKeyInstance } = require('twilio/lib/rest/api/v2010/account/newKey')
var objectId = require('mongodb').ObjectId
const paypal = require('paypal-rest-sdk');
const Razorpay = require('razorpay');
const { resolve } = require('node:path')
var instance = new Razorpay({
    key_id: 'rzp_test_RQe2RaERuutCC1',
    key_secret: 'b4wOGlQREVbeZxvsoXtT0tLo',
});
module.exports = {
    // <------------------------------------------ SIGNUP USER ------------------------------------------->
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            let mob = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userData.mobile })
            if (user) {
                resolve({ status: "email" })
            } else if (mob) {
                resolve({ status: "mobile" })
            }
            else {
                let referral = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userData.referral })
                let balance
                if (referral) {
                    balance = 50
                    await db.get().collection(collection.USER_COLLECTION).updateOne({ mobile: userData.referral }, { $inc: { wallet: 100 } })
                } else {
                    balance = 0
                    resolve({ status: "coupon" })
                }
                userData.password = await bcrypt.hash(userData.password, 10)
                userData.date = new Date().toISOString().split('T')[0]
                userData.status = true
                userData.wallet = balance
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                    resolve(userData)
                })
            }
        })
    },
    // <------------------------------------------ LOGIN USER ------------------------------------------->

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userData.mobile })
            if (user) {
                let blck = user.status
                if (blck) {
                    response.user = user
                    response.status = true
                    resolve(response)
                } else {
                    resolve({ status: 222 })
                }
            } else {
                resolve({ status: false })
            }
        }).catch()
    },
    // <------------------------------------------ BLOCK USER ------------------------------------------->
    doBlockUser: (userID) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION)
                .updateOne({ _id: objectId(userID) }, {
                    $set: {
                        status: false
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    // <------------------------------------------ UNBLOCK USER ------------------------------------------->
    doUnBlockUser: (userID) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION)
                .updateOne({ _id: objectId(userID) }, {
                    $set: {
                        status: true
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    // <------------------------------------------ ADD-TO-CART ------------------------------------------->
    addToCart: (prodId, userId) => {
        return new Promise(async (resolve, reject) => {
            let details = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(prodId) }, { projection: { stock: 1, OurPrice: 1, Image: 1, productName: 1 } })
            let proObj = {
                item: objectId(prodId),
                quantity: 1,
                Price: details.OurPrice,
                Image: details.Image,
                productName: details.productName,
                stock: details.stock,
                stepper: 25
            }
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.product.findIndex(product => product.item == prodId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'product.item': objectId(prodId) },
                            {
                                $inc: { 'product.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve({ stat: true })
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { product: proObj }

                        }).then((response) => {
                            resolve({ status: true })
                        })

                }


            } else {
                let cartObj = {
                    user: objectId(userId),
                    product: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    // <---------------------------------- OUTPUTS CART PRODUCTS OF USER ------------------------------------------->
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: 1, total: { $multiply: ['$quantity', { $convert: { input: '$product.OurPrice', to: 'int', onError: 0 } }] }
                    }
                }
            ]).toArray()
            resolve(cartItems)
        })
    },
    // <-------------------------------------LOGIN THROUGH MAIL ------------------------------------------->
    doLoginMail: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        let blck = user.status
                        if (blck) {
                            response.user = user
                            response.status = true
                            resolve(response)
                        } else {
                            resolve({ status: 222 })
                        }
                    } else {
                        resolve({ status: 333 })
                    }
                }).catch()
            } else {
                resolve({ status: false })
            }
        }).catch()
    },
    // <------------------------------------------ CART COUNT ------------------------------------------->
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.product.length
            }
            resolve(count)
        })
    },
    // <------------------------------------------ WISHLIST COUNT ------------------------------------------->
    getWishlistCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.product.length
            }
            resolve(count)
        })
    },
    // <------------------------------------------ HEADER DETAILS(CART,WISHLIST,WALLET) ------------------------------------------->
    getHeaderDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wcount = 0
            let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (wishlist) {
                wcount = wishlist.product.length
            }
            let ccount = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                ccount = cart.product.length
            }
            let wallet = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }, { wallet: 1 })
            let obj = {}
            obj.wishlist = wcount
            obj.cartCount = ccount
            obj.wallet = wallet.wallet
            resolve(obj)
        })
    },
    // <------------------------------------- CHANGE QUANTITY CART PRODUCTS------------------------------------------->
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { product: { item: objectId(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart), 'product.item': objectId(details.product) },
                        {
                            $inc: { 'product.$.quantity': details.count }
                        }
                    ).then((response) => {
                        resolve({ status: true })
                    })
            }
        })
    },
    // <-------------------------------------DELETE CART PRODUCT ------------------------------------------->
    removeCartProduct: (details) => {
        let productId = details.proId
        let cartId = details.cartId
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(cartId) },
                {
                    $pull: {
                        product: { item: objectId(productId) }
                    }
                }).then((response) => {
                    resolve({ status: true })
                })
        })
    },
    // <--------------------------------- TOTAL AMOUNT OF PRODUCTS IN CART ------------------------------------------->
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $convert: { input: '$product.OurPrice', to: 'int', onError: 0 } }] } },
                        discounts: { $sum: { $multiply: ['$quantity', { $convert: { input: '$product.discountAmount', to: 'int', onError: 0 } }] } }
                    }
                }
            ]).toArray()
            if (total < 1) {
                resolve(0)
            } else {

                resolve(total[0].total)
            }

        })
    },
    // <------------------------------------------ ORDER PLACEMENT ------------------------------------------->
    placeOrder: (order, product, total) => {
        return new Promise((resolve, reject) => {
            let status = order.paymentMethod === 'COD' || 'WALLET' ? 'placed' : 'pending'
            product.forEach(product => {
                product.status = status,
                    product.placed = true,
                    product.Price = product.Price * product.quantity
            });
            let orderObj = {
                deliveryDetails: {
                    fname: order.fname,
                    lname: order.lname,
                    mobile: order.mobile,
                    address: order.address,
                    city: order.city,
                    pincode: order.pincode,
                    state: order.state,
                    country: order.country
                },
                userId: objectId(order.userId),
                paymentMethod: order.paymentMethod,
                product: product,
                totalAmount: total,
                status: status,
                date: new Date(),
                invoiceNo: uid()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
                resolve(response.insertedId)
            })
        })
    },
    // <------------------------------------------ RAZORPAY FUNCTION ------------------------------------------->
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: orderId.toHexString()
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    res.send("error occured")
                } else {
                    resolve(order)
                }
            });
        })
    },
    // <------------------------------------------ WALLET PAYMENT ------------------------------------------->
    walletPayment: (userId, total) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
            if (user.wallet >= total) {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $inc: { wallet: -total } }).then((response) => {
                    resolve({ status: true })
                })
            } else {
                resolve({ status: false })
            }
        })
    },
    // <------------------------------------------ PAYPAL FUNCTION ------------------------------------------->
    createPay: (payment) => {
        return new Promise((resolve, reject) => {
            paypal.payment.create(payment, function (err, payment) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(payment);
                }
            });
        })
    },
    // <------------------------------------------ USER CART DETAILS ------------------------------------------->
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                resolve(cart.product)
            } else {
                resolve(0)
            }

        })
    },
    // <------------------------------------------ USER ORDERS ------------------------------------------->
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: objectId(userId) }).sort({ _id: -1 }).toArray()

            resolve(orders)
        })
    },
    // <------------------------------------------ PRODUCTS OF ORDER ------------------------------------------->
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$product'
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    // <------------------------------------------ SINGLE ORDER ------------------------------------------->
    getOneOrder: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $project: {
                        _id: 0,
                        deliveryDetails: 1,
                        status: 1,
                        invoiceNo: 1,
                        totalAmount: 1,
                        date: 1
                    }
                }
            ]).toArray()
            resolve(order[0])
        })
    },
    // <------------------------------------------ TOTAL AMOUNT OF ORDER ------------------------------------------->
    getOrderTotal: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                }
            ]).toArray()

            resolve(orderItems[0].totalAmount)
        })
    },
    // <------------------------------------------ TOTAL OF EACH ORDER ------------------------------------------->
    getTotalAmountOrder: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(userId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $convert: { input: '$product.OurPrice', to: 'int', onError: 0 } }] } },
                        discounttotal: { $sum: { $multiply: ['$quantity', { $convert: { input: '$product.discountAmount', to: 'int', onError: 0 } }] } }
                    }
                }
            ]).toArray()
            if (total < 1) {
                resolve(0)
            } else {
                resolve(total[0].total)
            }

        })
    },
    // <------------------------------------------ GET ALL ORDERS (ADMIN)------------------------------------------->
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $unwind: '$product'
                },
                {
                    $sort: { _id: -1 }
                }
            ]).toArray()
            resolve(orders)
        })
    },
    // <------------------------------------------ CHANGE STATUS OF PRODUCT OF ORDER ------------------------------------------->
    changestatus: (details) => {
        return new Promise(async (resolve, reject) => {
            if (details.status == 'return-completed' || details.status == 'canceled') {
                let amt = parseInt(details.refund)
                await db.get().collection(collection.ORDER_COLLECTION).
                    updateOne({ _id: objectId(details.cartid), product: { $elemMatch: { item: objectId(details.productId) } } },
                        {
                            $set: { 'product.$.status': details.status, "product.$.cancel": true, "product.$.ended": true, "product.$.stepper": 100 }
                        }
                    ).then(() => {
                        db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(details.user) },
                            {
                                $inc: { wallet: amt }
                            }
                        )
                        resolve("success")
                    })
            } else {
                let completed = false;
                let shipped = false;
                let val
                if (details.status == 'shipped') {
                    shipped = true
                    val = 50
                } else if (details.status == 'completed') {

                    completed = true
                    val = 100
                }
                else {
                    completed = false; val = 75

                }

                await db.get().collection(collection.ORDER_COLLECTION)
                    .updateOne({ _id: objectId(details.cartid), product: { $elemMatch: { item: objectId(details.productId) } } },
                        {
                            $set: { 'product.$.status': details.status, 'product.$.cancel': true, 'product.$.completed': completed, 'product.$.shipped': shipped, "product.$.stepper": val }
                        }
                    )
                    .then(() => {
                        resolve("success")

                    })

            }
        })
    },
    // <------------------------------------------ ADD NEW ADDRESS ------------------------------------------->
    addNewAddress: (address) => {
        let userId = address.userId
        address.no = uid()
        return new Promise(async (resolve, reject) => {
            let collectionexist = await db.get().collection(collection.ADDRESS_COLLECTION).findOne({ user: objectId(userId) })
            if (collectionexist) {
                db.get().collection(collection.ADDRESS_COLLECTION).updateOne({ user: objectId(userId) },
                    {
                        $push: { address: address }

                    }).then((response) => {
                        resolve()
                    })
            } else {
                let addrObj = {
                    user: objectId(userId),
                    address: [address]
                }
                db.get().collection(collection.ADDRESS_COLLECTION).insertOne(addrObj).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    // <------------------------------------------ GET USER ADDRESS ------------------------------------------->
    getAddresses: (userId) => {
        return new Promise(async (resolve, reject) => {
            let adrs = await db.get().collection(collection.ADDRESS_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$address'
                },
                {
                    $project: {
                        _id: 0,
                        address: '$address'
                    }
                }
            ]).toArray()
            resolve(adrs)
        })
    },
    // <------------------------------------------ TOTAL DISCOUNT OF USER ORDER ------------------------------------------->
    getTotalDiscount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        discounts: { $sum: { $multiply: ['$quantity', { $convert: { input: '$product.discountAmount', to: 'int', onError: 0 } }] } }
                    }
                }
            ]).toArray()
            if (total < 1) {
                resolve(0)
            } else {
                resolve(total[0].discounts)
            }

        })
    },
    // <------------------------------------------ SINGLE ADDRESS ------------------------------------------->
    getAddressDetails: (adressId, uId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ADDRESS_COLLECTION).aggregate([
                {
                    $match: { user: objectId(uId) }
                },
                {
                    $unwind: '$address'
                },
                {
                    $project: {
                        _id: 0,
                        fname: '$address.fname',
                        country: '$address.country',
                        address: '$address.address',
                        city: '$address.city',
                        state: '$address.pincode',
                        mobile: '$address.mobile',
                        email: '$address.email',
                        pincode: '$address.pincode',
                        no: '$address.no',
                        userId: '$address.userId',
                        paymentMethod: null
                    }
                },
                {
                    $match: { no: adressId }
                }
            ]).toArray()

            resolve(orderItems)
        })
    },
    // <------------------------------------------ RAZORPAY FUNCTION ------------------------------------------->
    verifyPayment: (details) => {
        return new Promise(async (resolve, reject) => {
            const { createHmac } = await import('node:crypto');
            let hmac = createHmac('sha256', 'b4wOGlQREVbeZxvsoXtT0tLo');
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    // <------------------------------------------ CHANGE PAYMENT STATUS ------------------------------------------->
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateMany({ $and: [{ _id: objectId(orderId) }, { 'product.status': 'pending' }] },
                    {

                        $set: { 'product.$.status': 'placed' }
                    },
                    {
                        "multi": true
                    }
                ).then((tt) => {
                    resolve()
                })
        })
    },
    // <------------------------------------------ CANCEL ORDER FOR USER ------------------------------------------->
    cancelOrder: (data) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(data.orderId), product: { $elemMatch: { item: objectId(data.productId) } } },
                    {
                        $set: { 'product.$.status': "canceled", "product.$.cancel": true, "product.$.completed": false, "product.$.ended": true, "product.$.stepper": 100 }
                    }
                ).then((response) => {
                    resolve({ status: true })

                })
        })
    },
    // <------------------------------------ RETURN OPTION FOR EACH PRODUCT ------------------------------------------->
    returnOrder: (data) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(data.orderId), product: { $elemMatch: { item: objectId(data.productId) } } },
                    {
                        $set: { 'product.$.status': "return", "product.$.cancel": false, "product.$.return": true, "product.$.ended": false, "product.$.stepper": 75 }
                    }

                ).then((response) => {
                    resolve({ status: true })

                })
        })
    },
    // <---------------------------------------USER PROFILE-------------------------------------->
    userProfile: (id) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(id) })
            resolve(user)
        })
    },
    // <----------------------------------------DELETE ADDRESS------------------------------------------>
    deleteAddress: (uId, aId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION)
                .updateOne({ user: objectId(uId) },
                    {
                        $pull: { address: { no: aId } }
                    }
                ).then((response) => {
                    resolve({ status: true })
                })
        })
    },
    // <---------------------------------ADD PRODUCT TO WISHLIST--------------------------------------->
    addToWishlist: (prodId, userId) => {
        return new Promise(async (resolve, reject) => {
            let details = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(prodId) }, { projection: { stock: 1, OurPrice: 1, Image: 1, productName: 1 } })

            let proObj = {
                item: objectId(prodId),
                quantity: 1,
                Price: details.OurPrice,
                Image: details.Image,
                productName: details.productName,
                stock: details.stock
            }
            let userwishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (userwishlist) {
                db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ user: objectId(userId) },
                    {
                        $addToSet: { product: proObj }

                    }).then((response) => {
                        resolve(response)
                    })
            } else {
                let cartObj = {
                    user: objectId(userId),
                    product: [proObj]
                }
                db.get().collection(collection.WISHLIST_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    getWishlist: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        item: 1, product: 1
                    }
                }
            ]).toArray()
            resolve(wishlist)
        })
    },
    addToCartt: (prodId, userId) => {
        return new Promise(async (resolve, reject) => {
            let details = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(prodId) }, { projection: { stock: 1, OurPrice: 1, Image: 1, productName: 1 } })

            let proObj = {
                item: objectId(prodId),
                quantity: 1,
                Price: details.OurPrice,
                Image: details.Image,
                productName: details.productName,
                stock: details.stock
            }
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.product.findIndex(product => product.item == prodId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'product.item': objectId(prodId) },
                            {
                                $inc: { 'product.$.quantity': 1 }
                            }
                        ).then(() => {
                            db.get().collection(collection.WISHLIST_COLLECTION)
                                .updateOne({ user: objectId(userId) },
                                    {
                                        $pull: { product: { item: objectId(prodId) } }
                                    }).then(() => {
                                        resolve()
                                    })
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { product: proObj }

                        }).then(() => {
                            db.get().collection(collection.WISHLIST_COLLECTION)
                                .updateOne({ user: objectId(userId) },
                                    {
                                        $pull: { product: { item: objectId(prodId) } }
                                    }).then(() => {
                                        resolve()
                                    })
                        })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    product: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    db.get().collection(collection.WISHLIST_COLLECTION)
                        .updateOne({ _id: objectId(userId) },
                            {
                                $pull: { product: { item: objectId(prodId) } }
                            }).then((response) => {
                                resolve(response)
                            })

                })
            }
        })
    },
    // <----------------------------------------REMOVE WISHLIST PRODUCT ------------------------------------------->
    removeWishlistProduct: (details) => {
        let productId = details.proId
        let cartId = details.wishId
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ _id: objectId(cartId) },
                {
                    $pull: {
                        product: { item: objectId(productId) }
                    }
                }).then((response) => {
                    resolve({ status: true })
                })
        })
    },
    // <----------------------------------------PAYMENT FAILED CASES----------------------------------------->
    deleteOrder: (ordId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({ _id: objectId(ordId) })
            resolve({ status: true })
        })
    },
    // <---------------------------------------APPLY COUPON--------------------------------------->
    applyCoupon: (userId, data, total) => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ code: data.code })
            if (coupon) {
                let discAmount = total * (parseInt(coupon.percentage) / 100)
                if (total < coupon.minPurchase) {
                    resolve({ statu: true })
                }
                if (discAmount > parseInt(coupon.maxDiscount)) {
                    coupon.Price = total - parseInt(coupon.maxDiscount)
                    coupon.discAmount = parseInt(coupon.maxDiscount)
                } else {
                    coupon.Price = total - discAmount
                    coupon.discAmount = discAmount
                }
                resolve(coupon)
            } else {
                resolve({ status: false })
            }

        })
    },
    // <-------------------------------------ALL COUPONS ------------------------------------------->
    getAllCoupons: () => {
        return new Promise(async (resolve, reject) => {
            let coupons = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupons)
        })
    },
    // <-----------------------------PAGINATION PAGE COUNT ------------------------------------------->
    paginatorCount: (count) => {
        return new Promise((resolve, reject) => {
            pages = Math.ceil(count / 10)
            let arr = []
            for (let i = 1; i <= pages; i++) {
                arr.push(i)
            }
            resolve(arr)
        })
    },
    // <------------------------------GET TEN ORDERS SORT--------------------------------->
    getTenOrders: (userId, Pageno) => {
        return new Promise(async (resolve, reject) => {
            let val = (Pageno - 1) * 10
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: objectId(userId) }).sort({ _id: -1 }).skip(val).limit(10).toArray()

            resolve(orders)
        })
    },
    // <------------------------------------TEN PRODUCTS SORT------------------------------------->
    getTenProducts: (Pageno) => {
        return new Promise(async (resolve, reject) => {
            let val = (Pageno - 1) * 9
            let products = await db.get().collection(collection.PRODUCT_COLLECTION)
                .find().sort({ _id: -1 }).skip(val).limit(9).toArray()

            resolve(products)
        })
    },
    // <-------------------------------------SEARCH PRODUCTS-------------------------------------->
    searchProducts: (key) => {
        return new Promise(async (resolve, reject) => {
            var re = new RegExp(key, 'i');
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ productName: re }).toArray()
            resolve(products)
        })
    },
    // <-----------------------------------UPDATE ADDRESS USER------------------------------------->
    updateAddress: (data, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).updateOne({ $and: [{ user: objectId(userId) }, { 'address.no': data.no }] },
                {
                    $set: {
                        'address.$.fname': data.fname,
                        'address.$.country': data.country,
                        'address.$.address': data.address,
                        'address.$.city': data.city,
                        'address.$.state': data.state,
                        'address.$.email': data.email,
                        'address.$.mobile': data.mobile,
                        'address.$.pincode': data.pincode
                    }
                }).then((data) => {
                    resolve(data)
                })
        })
    }
}


