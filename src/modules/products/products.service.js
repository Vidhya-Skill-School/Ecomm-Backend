import { NotFoundError } from "../../shared/errors.js";

export class ProductService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(opts = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      minPrice,
      maxPrice,
      rating,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = opts;

    let query = "SELECT * FROM products WHERE 1=1";
    let params = [];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (minPrice != null) {
      query += " AND price >= ?";
      params.push(parseFloat(minPrice));
    }

    if (maxPrice != null) {
      query += " AND price <= ?";
      params.push(parseFloat(maxPrice));
    }

    if (rating != null) {
      query += " AND rating >= ?";
      params.push(parseFloat(rating));
    }

    if (search) {
      query += " AND (title LIKE ? OR description LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s);
    }

    const countRes = await this.db.execute({
      sql: query.replace("SELECT *", "SELECT COUNT(*) as total"),
      args: params,
    });

    const total = countRes.rows[0].total;

    const validSort = ["id", "title", "price", "rating", "stock", "createdAt"];
    const field = validSort.includes(sortBy) ? sortBy : "createdAt";
    const order = sortOrder === "ASC" ? "ASC" : "DESC";

    query += ` ORDER BY ${field} ${order} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const res = await this.db.execute({ sql: query, args: params });

    return {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: res.rows,
    };
  }

  async getProductById(id) {
    const res = await this.db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [id],
    });
    return res.rows[0] || null;
  }

  async createProduct(data) {
    const { title, description, price, category, rating = 0, stock = 0, brand } = data;
    const res = await this.db.execute({
      sql: `
        INSERT INTO products 
        (title, description, price, category, rating, stock, brand, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      args: [title, description, price, category, rating, stock, brand],
    });
    return { id: Number(res.lastInsertRowid), ...data };
  }

  async updateProduct(id, data) {
    const existing = await this.getProductById(id);
    if (!existing) throw new NotFoundError("Product");

    const fields = [];
    const values = [];

    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }

    if (fields.length === 0) return existing;

    fields.push("updatedAt = CURRENT_TIMESTAMP");
    values.push(id);

    await this.db.execute({
      sql: `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
      args: values,
    });

    return await this.getProductById(id);
  }

  async deleteProduct(id) {
    const product = await this.getProductById(id);
    if (!product) throw new NotFoundError("Product");

    await this.db.execute({
      sql: "DELETE FROM products WHERE id = ?",
      args: [id],
    });

    return product;
  }

  async getCategories() {
    const res = await this.db.execute(
      "SELECT DISTINCT category FROM products ORDER BY category",
    );
    return res.rows.map((r) => r.category);
  }

  async getStatistics() {
    const res = await this.db.execute(`
      SELECT 
        COUNT(*) as totalProducts,
        COUNT(DISTINCT category) as totalCategories,
        COUNT(DISTINCT brand) as totalBrands,
        AVG(price) as avgPrice,
        MIN(price) as minPrice,
        MAX(price) as maxPrice,
        AVG(rating) as avgRating,
        SUM(stock) as totalStock
      FROM products
    `);
    const stats = res.rows[0];
    return {
      totalProducts: Number(stats.totalProducts || 0),
      totalCategories: Number(stats.totalCategories || 0),
      totalBrands: Number(stats.totalBrands || 0),
      avgPrice: Number((stats.avgPrice || 0).toFixed(2)),
      minPrice: Number(stats.minPrice || 0),
      maxPrice: Number(stats.maxPrice || 0),
      avgRating: Number((stats.avgRating || 0).toFixed(2)),
      totalStock: Number(stats.totalStock || 0),
    };
  }

  async bulkInsertProducts(products) {
    if (!products.length) return;
    const placeholders = products.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const args = products.flatMap((p) => [
      p.title,
      p.description,
      p.price,
      p.category,
      p.rating,
      p.stock,
      p.brand,
      p.createdAt || new Date().toISOString(),
      p.createdAt || new Date().toISOString(),
    ]);

    return await this.db.execute({
      sql: `
        INSERT INTO products 
        (title, description, price, category, rating, stock, brand, createdAt, updatedAt)
        VALUES ${placeholders}
      `,
      args,
    });
  }

  async deleteAllProducts() {
    await this.db.execute("DELETE FROM products");
    await this.db.execute("DELETE FROM sqlite_sequence WHERE name = 'products'");
  }
}
