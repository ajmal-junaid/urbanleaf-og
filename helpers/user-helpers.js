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
        let proObj = {
            item :objectId(prodId),
            quantity:1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            console.log("dgdgdgd", userCart);
            if (userCart) {
                let proExist = userCart.product.findIndex(product => product.item == prodId)
                console.log("prodexist",proExist);
                if(proExist != -1){
                    console.log("not e -1");
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),'product.item':objectId(prodId) },
                    {
                        $inc: {'product.$.quantity':1 }
                    } 
                    ).then(()=>{
                        resolve()
                    })
                }else{
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                    {
                        $push: { product: proObj }

                    }).then((response) => {
                        resolve()
                    })

                }
                

            } else {
                console.log("new cart created");
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
                    $project:{
                        item:'$product.item',
                        quantity:'$product.quantity'
                    }
                },
                {
                    $lookup: {
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $project:{
                        item:1 ,quantity:1,product:1,total:{$multiply:['$quantity',{$convert:{input:'$product.OurPrice',to:'int',onError:0}}]}
                    }
                }
            ]).toArray()
            console.log("frm us hlp",cartItems);
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
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart =await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.product.length
            }
            resolve(count)
        })
    }
}





