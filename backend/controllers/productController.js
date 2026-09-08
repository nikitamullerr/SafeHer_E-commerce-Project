import * as productModel from '../models/productModel.js';

// GET /api/products
const getAllProducts = async (req, res) => {
    try {
        const products = await productModel.getAllProducts();

        res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error('Error fetching products:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await productModel.getProductById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error fetching product:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
};

// POST /api/products
const createProduct = async (req, res) => {
    try {
        const product = req.body;

        if (!product.name || !product.slug || product.price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Name, slug and price are required'
            });
        }

        const newProduct = await productModel.createProduct(product);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: newProduct
        });
    } catch (error) {
        console.error('Error creating product:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create product'
        });
    }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = req.body;

        const existingProduct = await productModel.getProductById(id);

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await productModel.updateProduct(id, product);

        const updatedProduct = await productModel.getProductById(id);

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('Error updating product:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update product'
        });
    }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const existingProduct = await productModel.getProductById(id);

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await productModel.deleteProduct(id);

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting product:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to delete product'
        });
    }
};

export {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};