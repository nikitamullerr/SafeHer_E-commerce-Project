-- SAFEHER DATABASE SCHEMA

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS safeher_db;
USE safeher_db;

-- Set character set and collation
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS TABLE
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. CATEGORIES TABLE
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCTS TABLE
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    detail VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    icon VARCHAR(50),
    tone VARCHAR(50),
    category_id INT,
    stock INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 4. PRODUCT REVIEWS TABLE
CREATE TABLE product_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
    text TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. ORDERS TABLE
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('Confirmed','Packed','Out for delivery','Delivered') DEFAULT 'Confirmed',
    delivery_address TEXT NOT NULL,
    delivery_method VARCHAR(50),
    payment_method VARCHAR(50),
    payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 7. EMERGENCY CONTACTS TABLE
CREATE TABLE emergency_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. SOS ALERTS TABLE
CREATE TABLE sos_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(10,2),
    status ENUM('active','resolved','cancelled') DEFAULT 'active',
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. CHECK-INS TABLE
CREATE TABLE checkins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    duration_minutes INT NOT NULL,
    status ENUM('active','completed','missed') DEFAULT 'active',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. LESSONS TABLE (Premium Content)
CREATE TABLE lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    detail TEXT,
    duration VARCHAR(20),
    icon VARCHAR(50),
    youtube_id VARCHAR(50),
    order_number INT DEFAULT 0,
    is_premium BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. LESSON PROGRESS TABLE
CREATE TABLE lesson_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_lesson (user_id, lesson_id)
);

-- 12. PREMIUM SUBSCRIPTIONS TABLE
CREATE TABLE premium_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    plan ENUM('Essential','Circle','Annual') DEFAULT 'Essential',
    name VARCHAR(50),
    amount DECIMAL(10,2),
    method VARCHAR(50),
    receipt_email VARCHAR(150),
    reference VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. ADDRESSES TABLE (Saved Delivery Addresses)
CREATE TABLE addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    label VARCHAR(100),
    address TEXT NOT NULL,
    city VARCHAR(100),
    province VARCHAR(50),
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('sos','order','checkin','system') NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. REVIEWS TABLE (Site-wide testimonials)
CREATE TABLE testimonials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    title VARCHAR(200),
    quote TEXT NOT NULL,
    stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
    date DATE,
    helpful INT DEFAULT 0,
    initials VARCHAR(5),
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- CREATE INDEXES (For Performance)

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Products indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Orders indexes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Order items indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Emergency contacts indexes
CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX idx_emergency_contacts_is_primary ON emergency_contacts(is_primary);

-- SOS alerts indexes
CREATE INDEX idx_sos_alerts_user ON sos_alerts(user_id);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX idx_sos_alerts_created_at ON sos_alerts(created_at);
CREATE INDEX idx_sos_alerts_location ON sos_alerts(lat, lng);

-- Check-ins indexes
CREATE INDEX idx_checkins_user ON checkins(user_id);
CREATE INDEX idx_checkins_status ON checkins(status);
CREATE INDEX idx_checkins_created_at ON checkins(created_at);

-- Lessons indexes
CREATE INDEX idx_lessons_order ON lessons(order_number);
CREATE INDEX idx_lessons_is_premium ON lessons(is_premium);

-- Lesson progress indexes
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_completed ON lesson_progress(completed);

-- Premium subscriptions indexes
CREATE INDEX idx_premium_subscriptions_active ON premium_subscriptions(active);
CREATE INDEX idx_premium_subscriptions_expires_at ON premium_subscriptions(expires_at);

-- Addresses indexes
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(is_default);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Product reviews indexes
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_rating ON product_reviews(stars);

-- SEED DATA (Initial Data)
-- Insert categories
INSERT INTO categories (name, slug, description) VALUES
('Personal Safety', 'personal-safety', 'Personal safety and self-defense products'),
('Home Security', 'home-security', 'Products to secure your home and family'),
('Travel Safety', 'travel-safety', 'Safety essentials for travel and on-the-go'),
('Emergency Preparedness', 'emergency-preparedness', 'Emergency kits and preparedness tools');

-- Insert products
INSERT INTO products (name, slug, description, detail, price, image_url, icon, tone, category_id, stock, is_featured, is_active) VALUES
('Smart Panic Button', 'smart-panic-button', 'Wearable GPS alert with emergency SOS', 'Wearable GPS alert', 899.00, '/images/products/smart-panic-button.webp', 'bi-broadcast-pin', 'rose', 1, 50, TRUE, TRUE),
('Defender Spray', 'defender-spray', 'Compact & discreet personal safety spray', 'Compact & discreet', 149.00, '/images/products/defender-spray.webp', 'bi-shield-shaded', 'plum', 1, 100, TRUE, TRUE),
('Safety Whistle', 'safety-whistle', 'High-decibel emergency alarm', 'High-decibel alarm', 79.00, '/images/products/safety-whistle.webp', 'bi-megaphone', 'gold', 1, 200, FALSE, TRUE),
('Emergency Contact Card', 'emergency-contact-card', 'Quick-access ID and medical info', 'Quick-access ID and medical info', 99.00, '/images/products/emergency-contact-card.webp', 'bi-person-vcard', 'cream', 3, 150, FALSE, TRUE),
('Door Alarm Sensor', 'door-alarm-sensor', 'Smart entry alert for your home', 'Smart entry alert for your home', 399.00, '/images/products/door-alarm-sensor.webp', 'bi-door-open', 'rose', 2, 75, TRUE, TRUE),
('Travel Safety Kit', 'travel-safety-kit', 'Compact essentials for on-the-go trips', 'Compact essentials for on-the-go trips', 279.00, '/images/products/travel-safety-kit.webp', 'bi-bag-check', 'plum', 3, 60, TRUE, TRUE),
('Keychain SOS Beacon', 'keychain-sos-beacon', 'Small, bright and always within reach', 'Small, bright and always within reach', 199.00, '/images/products/keychain-sos-beacon.webp', 'bi-key', 'gold', 1, 120, FALSE, TRUE),
('Window Safety Lock', 'window-safety-lock', 'Extra deterrent for secure homes', 'Extra deterrent for secure homes', 149.00, '/images/products/window-safety-lock.webp', 'bi-window', 'cream', 2, 90, FALSE, TRUE),
('Portable Phone Charger', 'portable-phone-charger', 'Emergency backup for daily travel', 'Emergency backup for daily travel', 179.00, '/images/products/portable-phone-charger.webp', 'bi-phone', 'rose', 3, 200, FALSE, TRUE),
('Personal Alarm Clip', 'personal-alarm-clip', 'Attachable alarm for busy commutes', 'Attachable alarm for busy commutes', 249.00, '/images/products/personal-alarm-clip.webp', 'bi-person-raised-hand', 'plum', 1, 85, FALSE, TRUE),
('Flashlight Keyring', 'flashlight-keyring', 'Metal clip with emergency backup', 'Metal clip with emergency backup', 449.00, '/images/products/flashlight-keyring.webp', 'bi-lamp', 'gold', 1, 40, FALSE, TRUE),
('Home Entry Alarm', 'home-entry-alarm', 'Alerts you to the moment the door opens', 'Alerts you to the moment the door opens', 499.00, '/images/products/home-entry-alarm.webp', 'bi-house-door', 'rose', 2, 55, FALSE, TRUE),
('Passport Safety Sleeve', 'passport-safety-sleeve', 'Hidden document protection for travel', 'Hidden document protection for travel', 199.00, '/images/products/passport-safety-sleeve.webp', 'bi-passport', 'cream', 3, 100, FALSE, TRUE),
('Pepper Spray Holder', 'pepper-spray-holder', 'Easy grip case with quick access design', 'Easy grip case with quick access design', 89.00, '/images/products/pepper-spray-holder.webp', 'bi-shield', 'plum', 1, 150, FALSE, TRUE),
('Smart Window Sensor', 'smart-window-sensor', 'Notifies you of movement or tampering', 'Notifies you of movement or tampering', 499.00, '/images/products/smart-window-sensor.webp', 'bi-window', 'gold', 2, 45, FALSE, TRUE),
('Road Trip Essentials Kit', 'road-trip-essentials-kit', 'Safety basics for long-distance travel', 'Safety basics for long-distance travel', 399.00, '/images/products/road-trip-essentials-kit.webp', 'bi-car-front', 'rose', 3, 30, FALSE, TRUE),
('Digital Safety Sticker', 'digital-safety-sticker', 'Visible by all emergency escape route', 'Visible by all emergency escape route', 139.00, '/images/products/digital-safety-sticker.webp', 'bi-sticker', 'cream', 4, 200, FALSE, TRUE),
('Fire Escape Plan Set', 'fire-escape-plan-set', 'Preppers need this for their home', 'Preppers need this for their home', 89.00, '/images/products/fire-escape-plan-set.webp', 'bi-fire', 'plum', 4, 180, FALSE, TRUE),
('Nightlight Safety Lamp', 'nightlight-safety-lamp', 'Soft light for everyday use', 'Soft light for everyday use', 219.00, '/images/products/nightlight-safety-lamp.webp', 'bi-lightbulb', 'gold', 2, 70, FALSE, TRUE),
('Reflective Safety Band', 'reflective-safety-band', 'High-visibility adjustable reflective strap', 'High-visibility adjustable reflective strap', 149.00, '/images/products/reflective-safety-band.webp', 'bi-person-walking', 'rose', 1, 130, FALSE, TRUE);

-- Insert product reviews
INSERT INTO product_reviews (product_id, name, stars, text) VALUES
(1, 'Sarah M.', 5, 'Absolutely reliable. Gave me peace of mind immediately.'),
(1, 'James K.', 5, 'Fast delivery and excellent build quality. Highly recommended.'),
(1, 'Amara N.', 4, 'Works great, though the battery life could be longer.'),
(2, 'Thandi L.', 5, 'Powerful and discreet. Exactly what I needed.'),
(2, 'Maria G.', 5, 'Very easy to carry and deploy. Great safety tool.'),
(2, 'Sophie T.', 4, 'Good product, took a bit to get used to it.'),
(3, 'Zoe P.', 5, 'Incredibly loud and attention-grabbing. Perfect for emergencies.'),
(3, 'Leah B.', 5, 'Lightweight and portable. Every woman should have one.'),
(4, 'Nina H.', 5, 'Medical info is always with me now.'),
(4, 'Alex R.', 4, 'Nice design, good quality card stock.'),
(5, 'Elena K.', 5, 'Smart installation and brilliant app integration.'),
(5, 'Lisa M.', 5, 'Feels secure knowing doors are monitored.'),
(6, 'Jade S.', 5, 'Everything essential in one compact bag.'),
(6, 'Carmen L.', 5, 'Perfect for business trips and vacations.'),
(7, 'Ruby T.', 5, 'Bright LED and emergency whistle—great combo.'),
(7, 'Iris D.', 5, 'Durable and always ready to grab.'),
(8, 'Nora C.', 5, 'Highly secure and difficult to tamper with.'),
(8, 'Sophia W.', 4, 'Installation took 30 minutes, very satisfied.'),
(9, 'Vera L.', 5, 'Fast charging and reliable backup power.'),
(9, 'Diana M.', 5, 'Essential emergency backup on every trip.');

-- Insert lessons (Premium content)
INSERT INTO lessons (title, slug, description, detail, duration, icon, youtube_id, order_number, is_premium) VALUES
('Self-Defense Myths You Need to Know', 'self-defense-myths', 'A must-watch for every woman — separate fact from fiction and learn what really keeps you safe.', 'Separate fact from fiction and learn what really keeps you safe.', '05:59', 'bi-journal-check', 'q7YpyV3UBss', 1, TRUE),
('Personal Safety Tips for Women', 'personal-safety-tips', 'Practical, everyday safety habits to help you move through the world with confidence.', 'Everyday safety habits to help you move through the world with confidence.', '07:16', 'bi-person-walking', 'N4hWOp9Hvg4', 2, TRUE),
('Safety Tips for Women Part 1', 'safety-tips-part1', 'Foundational safety guidance and awareness techniques every woman should know.', 'Foundational safety guidance and awareness techniques every woman should know.', '08:59', 'bi-shield-check', '9_7voAJOLQs', 3, TRUE),
('5 Self-Defense Moves Every Woman Should Know', 'self-defense-moves', 'HER Network walks you through five essential self-defense moves to help you break free and get to safety.', 'Five essential self-defense moves to help you break free and get to safety.', '10:37', 'bi-people-fill', 'KVpxP3ZZtAc', 4, TRUE);

-- Insert testimonials (site-wide reviews)
INSERT INTO testimonials (name, location, title, quote, stars, date, helpful, initials) VALUES
('Lerato M.', 'Johannesburg', 'A reassuring everyday essential', 'The SOS tools are simple and calm when you need them most. I feel safer every time I leave the house.', 5, '2026-08-28', 12, 'LM'),
('Daniel K.', 'Pretoria', 'Easy to share and trust', 'I love how easy it is to share my location with my family. It gives me peace of mind without being complicated.', 5, '2026-08-11', 8, 'DK'),
('Nandi S.', 'Cape Town', 'Practical support for my family', 'The safety videos and checked-in routines helped my whole family feel more prepared. It feels practical and supportive.', 4, '2026-08-03', 5, 'NS'),
('Thandi M.', 'Soweto', 'Good features but could be simpler', 'The app has really useful safety features and the emergency response is quick. However, the menu navigation could be more intuitive for first-time users.', 3, '2026-07-25', 4, 'TM'),
('Aisha P.', 'Durban', 'Clean, calming and effective', 'Everything is straightforward, reassuring, and fast. It feels like a digital safety net that actually works for daily life.', 5, '2026-07-19', 15, 'AP'),
('James L.', 'Bloemfontein', 'Reliable safety companion', 'Been using SafeHer for 6 months now and I trust it completely. The location sharing with my trusted circle works seamlessly and the support team is responsive.', 4, '2026-07-16', 9, 'JL'),
('Nomvula R.', 'Pietermaritzburg', 'Helpful but interface needs work', 'The safety hub content is informative and the SOS feature works well. The app could use better visual organization - some buttons are hard to find when you need them quickly.', 3, '2026-07-08', 6, 'NR');

-- VERIFICATION QUERIES

-- Check all tables were created
SHOW TABLES;

-- Check data was inserted
SELECT COUNT(*) AS 'Categories' FROM categories;
SELECT COUNT(*) AS 'Products' FROM products;
SELECT COUNT(*) AS 'Product Reviews' FROM product_reviews;
SELECT COUNT(*) AS 'Lessons' FROM lessons;
SELECT COUNT(*) AS 'Testimonials' FROM testimonials;

-- View all products with their categories
SELECT 
    p.id,
    p.name,
    p.price,
    c.name AS category,
    p.is_featured,
    p.stock
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.id;
