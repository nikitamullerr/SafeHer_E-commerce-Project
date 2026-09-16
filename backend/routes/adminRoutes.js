import { productImage } from "../../shared/productImage.js";
import { validProductImage, uploadProductImage } from '../services/imageHosting.js';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';
const router = express.Router();
router.post('/login', rateLimit({windowMs:900000,limit:10,legacyHeaders:false}), async(req,res,next)=>{
 try {const {email,password}=req.body || {};if(typeof email!=='string'||typeof password!=='string')return res.status(400).json({error:'Email and password are required.'});
 const [[user]]=await pool.query('SELECT id,name,email,password_hash,is_admin FROM users WHERE email=?',[email.trim().toLowerCase()]);
 if(!user?.is_admin || !user.password_hash || !await bcrypt.compare(password,user.password_hash))return res.status(401).json({error:'Invalid admin credentials.'});
 res.json({token:jwt.sign({id:user.id,role:'admin'},process.env.JWT_SECRET,{expiresIn:'2h'}),user:{id:user.id,name:user.name,email:user.email}});
 }catch(e){next(e)}
});
router.use(verifyToken,verifyAdmin);
router.post('/images', rateLimit({windowMs:60000,limit:10,legacyHeaders:false}), express.raw({type:['image/png','image/jpeg','image/webp'],limit:'5mb'}), uploadProductImage);
router.get('/dashboard',async(req,res,next)=>{try{
 const [[counts]]=await pool.query(`SELECT (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM orders) AS orders,(SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND payment_method NOT IN ('card','card_demo')) AS revenue,(SELECT COUNT(*) FROM orders WHERE payment_status='pending') AS pending_orders,(SELECT COUNT(*) FROM products WHERE is_active=1 AND stock<=5) AS low_stock,(SELECT COUNT(*) FROM premium_subscriptions WHERE active=1 AND expires_at>NOW()) AS active_subscriptions`);
 const [recent]=await pool.query('SELECT order_number,total,status,payment_status,created_at FROM orders ORDER BY id DESC LIMIT 10');res.json({counts,recent});}catch(e){next(e)}});
const lists={orders:'SELECT id,order_number,customer_name,customer_email,total,status,delivery_method,payment_method,payment_status,created_at FROM orders ORDER BY id DESC',products:'SELECT * FROM products ORDER BY id',categories:'SELECT id,name FROM categories ORDER BY name',users:'SELECT id,name,email,phone,is_admin,created_at FROM users ORDER BY id DESC',premium:'SELECT s.id,u.name AS customer,s.plan,s.amount,s.method,s.started_at,s.expires_at,(s.active=1 AND s.expires_at>NOW()) AS active FROM premium_subscriptions s JOIN users u ON u.id=s.user_id ORDER BY s.id DESC',lessons:'SELECT * FROM lessons ORDER BY order_number,id'};
for(const [name,sql] of Object.entries(lists))router.get('/'+name,async(req,res,next)=>{try{const [rows]=await pool.query(sql);res.json({rows:name==='products'?rows.map(row=>({...row,image_url:productImage(row.image_url)})):rows});}catch(e){next(e)}});
router.get('/reviews',async(req,res,next)=>{try{const [rows]=await pool.query(`SELECT id,'product' AS type,name,stars,text AS content,is_approved FROM product_reviews UNION ALL SELECT id,'testimonial',name,stars,quote,is_approved FROM testimonials`);res.json({rows});}catch(e){next(e)}});
router.patch('/reviews/:type/:id',async(req,res,next)=>{try{const table={product:'product_reviews',testimonial:'testimonials'}[req.params.type];if(!table||typeof req.body.is_approved!=='boolean')return res.status(400).json({error:'Invalid moderation request.'});const [r]=await pool.query(`UPDATE ${table} SET is_approved=? WHERE id=?`,[req.body.is_approved,req.params.id]);res.status(r.affectedRows?200:404).json({success:!!r.affectedRows});}catch(e){next(e)}});
router.get('/orders/:id',async(req,res,next)=>{try{const [[order]]=await pool.query('SELECT * FROM orders WHERE id=?',[req.params.id]);if(!order)return res.status(404).json({error:'Order not found.'});const [items]=await pool.query('SELECT product_name,quantity,price_at_purchase FROM order_items WHERE order_id=?',[req.params.id]);res.json({order,items});}catch(e){next(e)}});
router.patch('/orders/:id',async(req,res,next)=>{try{const steps=['Confirmed','Packed','Out for delivery','Delivered'];const index=steps.indexOf(req.body.status);if(index<1)return res.status(400).json({error:'Choose the next delivery status.'});const [r]=await pool.query("UPDATE orders SET status=? WHERE id=? AND status=? AND payment_status='paid'",[steps[index],req.params.id,steps[index-1]]);if(!r.affectedRows)return res.status(409).json({error:'Only paid orders can move to the next delivery stage. Refresh this order.'});res.json({success:true});}catch(e){next(e)}});
router.get('/safety',async(req,res,next)=>{try{const [checkins]=await pool.query('SELECT status,COUNT(*) AS count FROM checkins GROUP BY status');const [[contacts]]=await pool.query('SELECT COUNT(*) AS count FROM emergency_contacts');const [[events]]=await pool.query('SELECT COUNT(*) AS count FROM safety_events');res.json({rows:[...checkins.map(r=>({metric:r.status,count:r.count})),{metric:'Saved contacts',count:contacts.count},{metric:'Safety events',count:events.count}]});}catch(e){next(e)}});
const fields={products:['name','slug','description','detail','price','image_url','category_id','stock','is_featured','is_active'],lessons:['title','slug','description','detail','duration','youtube_id','order_number','is_premium']};
for(const table of Object.keys(fields))for(const method of ['post','put'])router[method]('/'+table+(method==='put'?'/:id':''),async(req,res,next)=>{try{
 const data=Object.fromEntries(fields[table].map(k=>[k,req.body[k]]));
 const title=data.name??data.title;if(typeof title!=='string'||!title.trim()||title.length>150||typeof data.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)||data.slug.length>150)return res.status(400).json({error:'Enter a name/title and a unique lowercase slug (letters, numbers, hyphens).'});
 if(table==='products'&&(!Number.isFinite(Number(data.price))||Number(data.price)<0||!Number.isInteger(data.stock)||data.stock<0||!Number.isInteger(data.category_id)||!validProductImage(data.image_url)))return res.status(400).json({error:'Check price, stock, category and image path. Use an HTTPS i.ibb.co direct image URL.'});
 if(table==='lessons'&&(!Number.isInteger(data.order_number)||data.order_number<0||typeof data.youtube_id!=='string'||(data.youtube_id&&!/^[a-zA-Z0-9_-]{11}$/.test(data.youtube_id))))return res.status(400).json({error:'Enter a valid order number and YouTube video ID.'});
 for(const key of ['is_featured','is_active','is_premium'])if(key in data&&typeof data[key]!=='boolean')return res.status(400).json({error:'Invalid checkbox value.'});
 const keys=fields[table],values=keys.map(k=>data[k]??'');
 const [r]=method==='post'?await pool.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,values):await pool.query(`UPDATE ${table} SET ${keys.map(k=>k+'=?').join(',')} WHERE id=?`,[...values,req.params.id]);res.status(method==='post'?201:r.affectedRows?200:404).json({success:!!r.affectedRows,id:r.insertId});
 }catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'That slug already exists.'});next(e)}});
router.patch('/products/:id/visibility',async(req,res,next)=>{try{
 if(typeof req.body.is_active!=='boolean')return res.status(400).json({error:'Choose a valid visibility status.'});
 const [result]=await pool.query('UPDATE products SET is_active=? WHERE id=?',[req.body.is_active,req.params.id]);
 if(!result.affectedRows)return res.status(404).json({error:'Product not found.'});
 res.json({success:true});
}catch(error){next(error)}});
export default router;
