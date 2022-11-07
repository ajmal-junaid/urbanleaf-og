var db = require('../config/connection')
const moment = require('moment');
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { get } = require('../app')
var objectId = require('mongodb').ObjectId
module.exports = {
    doAdminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email })
            if (admin) {
                bcrypt.compare(adminData.password, admin.password).then((status) => {
                    if (status) {
                        console.log("adm success");
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("adm password failed");

                        resolve({ status: false })
                    }
                }).catch()
            } else {
                console.log("admin not found");


                resolve({ status: false })
            }
        })
    },
    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },
    deleteUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).deleteOne({ _id: objectId(userId) }).then((response) => {
                resolve(response)
            })
        })
    },
    deleteCategory: (categ) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ category: categ }).then(async () => {
                console.log("dffff", categ);
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
    getAllorderCount: () => {
        return new Promise((resolve, reject) => {
            let count = db.get().collection(collection.ORDER_COLLECTION)
                .find().count()
            resolve(count)
        })
    },
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
    getTotalProfit: () => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { status: 'completed' }
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
    getInsights: () => {
        return new Promise(async (resolve, reject) => {
            let completed = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { status: "completed" }
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
                        $match: { status: "placed" }
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
                        $match: { status: "canceled" }
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
                        $match: { status: "completed" }
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
                    $match: { status: "completed" }
                },
                {
                    $group: {
                        _id: { day: { $dayOfMonth: { $toDate: "$date" } } },
                        count: { $sum: 1 },
                        date: { '$first': "$date" }

                    }
                },
                {
                    $project: {
                        count: 1,
                        year: { $year: "$date" },
                        month: { $month: "$date" },
                        day: { $dayOfMonth: "$date" },
                    }
                },
                {
                    $sort: { month: -1, day: -1 }
                },
                {
                    $limit: 7
                }
            ]).toArray()
            let monthly = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { status: "completed" }
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
                        $match: { status: 'completed' }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$totalAmount", 0] } }
                        }
                    }
                ]).toArray()
            let razor = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {

                        $match: { paymentMethod: 'RAZOR' }
                    },
                    {
                        $match: { status: 'completed' }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$totalAmount", 0] } }
                        }
                    }
                ]).toArray()
            let paypal = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { paymentMethod: 'PAYPAL' }
                    },
                    {
                        $match: { status: 'completed' }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$totalAmount", 0] } }
                        }
                    }
                ]).toArray()
            let obj = {}
            obj.razor = razor
            obj.paypal = paypal
            obj.cod = cod
            resolve(obj)
        })

    },
    getAllReports: () => {
        return new Promise(async (resolve, reject) => {
            let first = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { status: 'completed' }
                    },
                    {
                        $unwind: '$product'
                    },
                    {
                        $project: {
                            _id: 0, paymentMethod: 1, product: 1, totalAmount: 1, status: 1, date: 1
                        }
                    },
                    {
                        $group: {
                            _id: '$product.item',
                            totalquantity: { $sum: '$product.quantity' }
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: '_id',
                            foreignField: '_id',
                            as: 'prodName'
                        }
                    },
                    {
                        $project: {
                            totalquantity: 1,
                            _id: { $arrayElemAt: ['$prodName.productName', 0] },
                            // prodAmount: { $arrayElemAt: ['$prodName.OurPrice', 0] } ,
                            total: { $multiply: ['$totalquantity', { $convert: { input: { $arrayElemAt: ['$prodName.OurPrice', 0] }, to: 'int', onError: 0 } }] }
                        }
                    }
                ]).toArray()
            console.log(first);
            resolve(first)
        })
    },
    getReportWithDate: (fromDate, ToDate) => {
        console.log(fromDate, "dategott", ToDate);
        return new Promise(async (resolve, reject) => {
            let first = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { status: 'completed' }
                    },
                    {
                        $unwind: '$product'
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
                    },
                    {
                        $group: {
                            _id: '$prod',
                            totalquantity: { $sum: '$quantity' },
                            total: { $sum: { $multiply: ['$price', '$quantity'] } }
                        }
                    }
                ]).toArray()
            resolve(first)
        })
    },
    addCoupon: (coupon) => {
        coupon.date = new Date()
        console.log(coupon, "helperrrrrrrrrrrrrrrrrr");
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
    deleteCoupon: (coupon) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(coupon) }).then((response) => {
                resolve()
            })

        })
    },
    getAllCoupons: () => {
        return new Promise(async (resolve, reject) => {
            let coupons = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupons)
        })
    }
}