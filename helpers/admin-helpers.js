var db = require('../config/connection')
const moment = require('moment');
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { get, response } = require('../app')
var objectId = require('mongodb').ObjectId
module.exports = {

    //<--------------------------------ADMIN LOGIN------------------------------------------>

    doAdminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email })
            if (admin) {
                bcrypt.compare(adminData.password, admin.password).then((status) => {
                    if (status) {
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    } else {
                        resolve({ status: false })
                    }
                }).catch()
            } else {
                resolve({ status: false })
            }
        })
    },
     //<--------------------------------ALL USER DETAILS------------------------------------------>

    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },
     //<--------------------------------DELETE USER------------------------------------------>

    deleteUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).deleteOne({ _id: objectId(userId) }).then((response) => {
                resolve(response)
            })
        })
    },
     //<--------------------------------DELETE CATEGORY------------------------------------------>

    deleteCategory: (categ) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ category: categ }).then(async () => {
                let elements = await db.get().collection(collection.PRODUCT_COLLECTION).find({ category: categ }).toArray()
                let obj = { category: categ }
                if (elements.length > 0) {
                    obj.status = false
                    resolve(obj)
                } else {
                    db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ category: categ }).then((response) => {
                        obj.status = true
                        resolve(obj)
                    })
                }
            })
        })
    },
     //<--------------------------------TOTAL ORDER COUNT------------------------------------------>

    getAllorderCount: () => {
        return new Promise((resolve, reject) => {
            let count = db.get().collection(collection.ORDER_COLLECTION)
                .find().count()
            resolve(count)
        })
    },
     //<--------------------------------COUNT ACCORDING TO PAYMENT METHOD------------------------------------------>
    getCountAll: () => {
        return new Promise(async (resolve, reject) => {
            let completed = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ status: 'completed' }).count()
            let placed = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ status: 'placed' }).count()
            let accepted = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ status: 'accepted' }).count()
            let pending = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ status: 'pending' }).count()
            let shipped = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ status: 'shipped' }).count()
            let canceled = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ status: 'canceled' }).count()
            let count = {}
            count.completed = completed
            count.placed = placed
            count.accepted = accepted
            count.pending = pending
            count.shipped = shipped
            count.canceled = canceled
            resolve(count)
        })
    },

     //<--------------------------------PROFIT COMPLETED ORDERS------------------------------------------>

    getTotalProfit: () => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: '$product'
                    },
                    {
                        $match: { 'product.status': 'completed' }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$totalAmount", 0] } }
                        }
                    }
                ]).toArray()
            if (total[0]) {
                resolve(total[0].sum)
            } else {
                resolve(total[0] = 0)
            }

        })
    },
    getTotalCod: () => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { paymentMethod: 'COD' }
                    }
                    ,
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$totalAmount", 0] } }
                        }
                    }
                ]).toArray()

            resolve(total[0].sum)
        })

    },

     //<--------------------------------LAST MONTH,WEEK,YEAR ORDERS COUNT------------------------------------------>

    getInsights: () => {
        return new Promise(async (resolve, reject) => {
            let completed = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: "$product"
                    },
                    {
                        $match: { 'product.status': "completed" }
                    },
                    {
                        $group: { _id: { month: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                    },
                    {
                        $sort: { '_id.month': -1 }
                    }
                ]).toArray()

            let placed = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: "$product"
                    },
                    {
                        $match: { 'product.status': "placed" }
                    },
                    {
                        $group: { _id: { month: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                    },
                    {
                        $sort: { '_id.month': -1 }
                    }
                ]).toArray()

            let canceled = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: "$product"
                    },
                    {
                        $match: { 'product.status': "canceled" }
                    },
                    {
                        $group: { _id: { month: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                    },
                    {
                        $sort: { '_id.month': -1 }
                    }
                ]).toArray()
            let yearly = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: "$product"
                    },
                    {
                        $match: { 'product.status': "completed" }
                    },
                    {
                        $group: {
                            _id: { year: { $year: { $toDate: "$date" } } },
                            count: { $sum: 1 }

                        }
                    },
                    {
                        $sort: { '_id.year': -1 }
                    },
                    {
                        $limit: 5
                    }
                ]).toArray()

            let daily = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $unwind: "$product"
                },
                {
                    $match: { 'product.status': "completed" }
                },
                {
                    $group: {
                        _id: { day: { $dayOfYear: { $toDate: "$date" } } },
                        count: { $sum: 1 },
                        date: { '$first': "$date" }

                    }
                },
                {
                    $project: {
                        count: 1,
                        year: { $dayOfYear: "$date" },
                        month: { $month: "$date" },
                        yy: { $year: "$date" },
                        day: { $dayOfMonth: "$date" },
                    }
                },
                {
                    $sort: { year: 1 }
                },
                {
                    $limit: 7
                }
            ]).toArray()
            console.log(daily, "daillllll");
            let monthly = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $unwind: "$product"
                },
                {
                    $match: { 'product.status': "completed" }
                },
                {
                    $group: {
                        _id: { month: { $month: { $toDate: "$date" } } },
                        count: { $sum: 1 },
                        date: { '$first': "$date" }

                    }
                },
                {
                    $project: {
                        count: 1,
                        year: { $year: "$date" },
                        month: { $month: "$date" },
                    }
                },
                {
                    $sort: { year: -1, month: -1 }
                },
                {
                    $limit: 12
                }
            ]).toArray()
            let obj = {}
            obj.completed = completed[0]
            obj.canceled = canceled[0]
            obj.placed = placed[0]
            obj.daily = daily
            obj.monthly = monthly
            obj.yearly = yearly
            resolve(obj)
        })
    },
    getCodOnline: () => {
        return new Promise(async (resolve, reject) => {
            let cod = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { paymentMethod: 'COD' }
                    },
                    {
                        $unwind: "$product"
                    },
                    {
                        $match: { 'product.status': 'completed' }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$product.Price", 0] } }
                        }
                    }
                ]).toArray()
            let razor = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: "$product"
                    },
                    {
                        $match: { paymentMethod: 'RAZOR' }
                    },
                    {
                        $match: { 'product.status': 'completed' }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$product.Price", 0] } }
                        }
                    }
                ]).toArray()
            let paypal = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: "$product"
                    },
                    {
                        $match: { paymentMethod: 'PAYPAL' }
                    },
                    {
                        $match: { 'product.status': 'completed' }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$product.Price", 0] } }
                        }
                    }
                ]).toArray()
            let wallet = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: "$product"
                    },
                    {
                        $match: { paymentMethod: 'WALLET' }
                    },
                    {
                        $match: { status: 'completed' }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$product.Price", 0] } }
                        }
                    }
                ]).toArray()
            let obj = {}
            obj.razor = razor
            obj.paypal = paypal
            obj.cod = cod
            obj.wallet = wallet
            resolve(obj)
        })

    },

     //<--------------------------------PRODUCT WISE REPORT------------------------------------------>
    getAllReports: () => {
        return new Promise(async (resolve, reject) => {
            let first = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: '$product'
                    },
                    {
                        $match: { 'product.status': 'completed' }
                    },
                    {
                        $group: {
                            _id: '$product.productName',
                            total: { $sum: '$product.Price' },
                            totalquantity: { $sum: '$product.quantity' }
                        }
                    }
                ]).toArray()
            let total = 0
            let quantity = 0
            first.forEach(first => {
                total = total + first.total
                quantity = quantity + first.totalquantity
            });
            let obj = {}
            obj.data = first
            obj.total = total
            obj.quantity = quantity
            resolve(obj)
        })
    },

     //<--------------------------------PRODUCT WISE REPORT ACCORDING TO DATE------------------------------------->

    getReportWithDate: (fromDate, ToDate) => {
        return new Promise(async (resolve, reject) => {
            let first = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $unwind: '$product'
                    },
                    {
                        $match: { 'product.status': 'completed' }
                    },
                    {
                        $project: {
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                            prod: '$product.productName',
                            price: '$product.Price',
                            quantity: '$product.quantity'
                        }
                    },
                    {
                        $match: { $and: [{ date: { $gte: fromDate } }, { date: { $lte: ToDate } }] }
                    }
                    ,
                    {
                        $group: {
                            _id: '$prod',
                            totalquantity: { $sum: '$quantity' },
                            total: { $sum: '$price' }
                        }
                    }
                ]).toArray()
            let total = 0
            let totalquantity = 0
            first.forEach(first => {
                total = total + first.total
                totalquantity = totalquantity + first.totalquantity
            });
            let obj = {}
            obj.data = first
            obj.total = total
            obj.quantity = totalquantity

            resolve(obj)
        })
    },
     //<--------------------------------ADD COUPON------------------------------------------>

    addCoupon: (coupon) => {
        coupon.date = new Date()
        return new Promise(async (resolve, reject) => {
            let coupo = await db.get().collection(collection.COUPON_COLLECTION).findOne({ code: coupon.code })
            if (coupo) {
                resolve({ status: false })
            } else {
                db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon).then((response) => {
                    resolve({ status: true })
                })
            }
        })
    },
     //<--------------------------------DELETE COUPON------------------------------------------>

    deleteCoupon: (coupon) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(coupon) }).then((response) => {
                resolve()
            })

        })
    },
     //<--------------------------------VIEW ALL COUPONS------------------------------------------>

    getAllCoupons: () => {
        return new Promise(async (resolve, reject) => {
            let coupons = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupons)
        })
    },
     //<--------------------------------ADD BANNER------------------------------------------>
     
    addBanner: (data) => {
        console.log(data, "data");
        return new Promise(async (resolve, reject) => {
            let check = await db.get().collection(collection.BANNER_COLLECTION).findOne()
            if (check) {
                console.log("existssss");
                await db.get().collection(collection.BANNER_COLLECTION).deleteOne({ name: "banner" })
                await db.get().collection(collection.BANNER_COLLECTION).insertOne(data)
                resolve({ status: true })
            } else {
                console.log("newwwwwwwwwwwwww");
                await db.get().collection(collection.BANNER_COLLECTION).insertOne(data).then((response) => {
                    resolve(response)
                })
            }
        })
    },
     //<--------------------------------GET BANNER DETAILS------------------------------------------>

    getBanner: () => {
        return new Promise(async (resolve, reject) => {
            let banner = await db.get().collection(collection.BANNER_COLLECTION).find().toArray()
            resolve(banner[0])
        })
    }
}