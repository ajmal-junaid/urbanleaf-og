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
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            let mob = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userData.mobile })
            if (user) {
                resolve({ status: "email" })
                console.log("user already exists");
            } else if (mob) {
                resolve({ status: "mobile" })
                console.log("mobile number already exists");
            }
            else {
                let referral = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userData.referral })
                console.log(referral, "refferal");
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
                db.get().collection("testtttt").insertOne(userData).then((data) => {
                    resolve(userData)
                })
            }
        })
    },

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
                    // console.log("user blocked contact admn");
                    resolve({ status: 222 })
                }
            } else {
                // console.log("user not found regi");
                resolve({ status: false })
            }
        }).catch()
    },
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
    addToCart: (prodId, userId) => {
        let proObj = {
            item: objectId(prodId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
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
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { product: proObj }

                        }).then((response) => {
                            resolve()
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
                            //console.log("success");
                            response.user = user
                            response.status = true
                            resolve(response)
                        } else {
                            //console.log("user blocked contact admn");
                            resolve({ status: 222 })
                        }

                    } else {
                        console.log("wrong password");

                        resolve({ status: 333 })
                    }
                }).catch()
            } else {
                console.log("user not found regi");


                resolve({ status: false })
            }
        }).catch()
    },
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
    getWishlistCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.product.length
            }
            resolve(count)
        })
    }
    ,
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
    placeOrder: (order, product, total) => {
        return new Promise((resolve, reject) => {
            let status = order.paymentMethod === 'COD' ? 'placed' : 'pending'
            // var date = new Date();
            // var current_time = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate()
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
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
                resolve(response.insertedId)
            })
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: orderId.toHexString()
            };
            instance.orders.create(options, function (err, order) {
                console.log(order, "otderrrrr");
                if (err) {
                    console.log(err, "error occured");
                } else {
                    resolve(order)
                }

            });
        })

    },
    walletPayment: (userId, total) => {
        return new Promise(async(resolve,reject)=>{
            let user =await db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId(userId)})
            if(user.wallet>=total){
                db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{$inc:{wallet:-total}}).then((response)=>{
                    resolve({status:true})
                })
            }else{
                resolve({status:false})
            }
            
        })
        
        

    },
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
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {

            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })

            resolve(cart.product)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: objectId(userId) }).sort({ date: -1 }).toArray()

            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity',
                        total: '$product.totalAmount',
                        totalAmount: '$totalAmount'
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
                        totalAmount: 1, total: 1, item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()

            resolve(orderItems)
        })
    },
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
    getAllUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find().sort({ date: -1 }).toArray()

            resolve(orders)
        })
    },
    changestatus: (details) => {
        return new Promise(async (resolve, reject) => {
            if (details.status == 'return-completed') {
                console.log(details, "details");
                let amt = parseInt(details.refund)
                await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(details.cartid) }, { $set: { status: (details.status), cancel: true, completed: true, return: true } }).then(() => {
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(details.user) },
                        {
                            $inc: { wallet: amt }
                        }
                    )
                    resolve("success")
                    console.log(details.refund, details.user, "refund amount");
                })
            } else {
                let val;
                let val2;
                if (details.status == 'completed' || details.status == 'canceled') {
                    if (details.status == 'completed') {
                        val2 = true
                    }
                    val = true;
                } else {
                    val = false;
                }
                console.log(details, val);
                await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(details.cartid) }, { $set: { status: (details.status), cancel: val, completed: val2 } }).then(() => {
                    resolve("success")

                })

            }
        })
    },
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
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: {
                            status: 'placed'
                        }
                    }
                ).then(() => {
                    resolve()
                })
        })
    },
    cancelOrder: (oId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(oId) }, { $set: { status: "canceled", cancel: true } }).then((response) => {
                resolve({ status: true })

            })
        })
    },
    returnOrder: (oId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(oId) }, { $set: { status: "return", return: true } }).then((response) => {
                resolve({ status: true })

            })
        })
    }
    ,
    userProfile: (id) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(id) })
            resolve(user)
        })
    },
    deleteAddress: (uId, aId) => {
        console.log(uId, aId);
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
    addToWishlist: (prodId, userId) => {
        let proObj = {
            item: objectId(prodId)
        }
        return new Promise(async (resolve, reject) => {
            let userwishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            console.log("dgdgdgd", userwishlist);
            if (userwishlist) {
                db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ user: objectId(userId) },
                    {
                        $addToSet: { product: proObj }

                    }).then((response) => {
                        resolve()
                    })


            } else {
                console.log("new wishlist created");
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
        let proObj = {
            item: objectId(prodId),
            quantity: 1
        }
        console.log("rockiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            //console.log("dgdgdgd", userCart);
            if (userCart) {
                let proExist = userCart.product.findIndex(product => product.item == prodId)
                if (proExist != -1) {
                    console.log("not e -1");
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

                        }).then((response) => {
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
                console.log("new cart created");
                let cartObj = {
                    user: objectId(userId),
                    product: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    db.get().collection(collection.WISHLIST_COLLECTION)
                        .updateOne({ _id: objectId(userId) },
                            {
                                $pull: { product: { item: objectId(prodId) } }
                            })
                    resolve(response)
                })
            }
        })
    },
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
    applyCoupon: (userId, data, total) => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ code: data.code })
            if (coupon) {
                let discAmount = total - (total * (parseInt(coupon.percentage) / 100))
                if (discAmount >= parseInt(coupon.maxDiscount)) {
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
    }


}


