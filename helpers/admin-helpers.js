var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectId
module.exports={
    doAdminLogin:(adminData)=>{
        
        return new Promise(async (resolve,reject)=>{
            let loginStatus=false
            let response={}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({email:adminData.email})
            if(admin){
                bcrypt.compare(adminData.password,admin.password).then((status)=>{
                    if(status){
                        console.log("adm success");
                        response.admin=admin
                        response.status=true
                        resolve(response)
                    }else{
                        console.log("adm password failed");
                       
                        resolve({status:false})
                    }
                }).catch()
            }else{
                console.log("admin not found");
                
                
                resolve({status:false})
            }
        })
    },
    getAllUsers:()=>{
        return new Promise(async(resolve,reject)=>{
            let users=await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        }) 
    },
    deleteUser:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).deleteOne({_id:objectId(userId)}).then((response)=>{
                resolve(response)
            })
        })
    },
    deleteCategory:(catId)=>{
        return new Promise(async(resolve,reject)=>{
            let count =await db.get().collection(collection.PRODUCT_COLLECTION).find({category:objectId(catId)})


            console.log("dddd",count);
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({_id:objectId(catId)}).then((response)=>{
                resolve(response)
            })
        })
    }
}