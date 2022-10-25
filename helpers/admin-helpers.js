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
            resolve(total[0].sum)
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
                    }
                ]).toArray()
            let placed = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { status: "placed" }
                    },
                    {
                        $group: { _id: { month: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                    }
                ]).toArray()
            let canceled = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $match: { status: "canceled" }
                    },
                    {
                        $group: { _id: { month: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                    }
                ]).toArray()
            let obj = {}
            obj.completed = completed
            obj.canceled = canceled
            obj.placed = placed
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
                        $match:{status:'completed'}
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
                        $match:{status:'completed'}
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
                        $match:{status:'completed'}
                    },
                    {
                        $group: {
                            _id: null,
                            sum: { $sum: { $ifNull: ["$totalAmount", 0] } }
                        }
                    }
                    
                ]).toArray()
                let obj={}
                obj.razor=razor
                obj.paypal=paypal
                obj.cod=cod
            resolve(obj)
        })

    }

}
