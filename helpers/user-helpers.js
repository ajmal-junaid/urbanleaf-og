var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('express')
const { NewKeyInstance } = require('twilio/lib/rest/api/v2010/account/newKey')
var objectId = require('mongodb').ObjectId
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
                userData.password = await bcrypt.hash(userData.password, 10)
                userData.date = new Date().toISOString().split('T')[0]
                userData.status = true
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
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
                    console.log("success");
                    response.user = user
                    response.status = true
                    resolve(response)
                } else {
                    console.log("user blocked contact admn");
                    resolve({ status: 222 })
                }
            } else {
                console.log("user not found regi");
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
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            console.log("dgdgdgd", userCart);
            if (userCart) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                    {
                        $push: { product: objectId(prodId) }

                    }).then((response) => {
                        resolve()
                    })

            } else {
                let cartObj = {
                    user: objectId(userId),
                    product: [objectId(prodId)]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        let: { prodList: '$product' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ['$_id', "$$prodList"]
                                    }
                                }
                            }
                        ],
                        as: 'cartItems'
                    }
                }
            ]).toArray()
            resolve(cartItems[0].cartItems)
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
                            console.log("success");
                            response.user = user
                            response.status = true
                            resolve(response)
                        } else {
                            console.log("user blocked contact admn");
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
    }
}