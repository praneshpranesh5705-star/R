const { neon } = require("@neondatabase/serverless");

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

async function init() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  await sql`CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, customer_name TEXT NOT NULL, service TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, customer_name TEXT NOT NULL, service TEXT NOT NULL, booking_date DATE NOT NULL, status TEXT NOT NULL DEFAULT 'Scheduled', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS inventory (id SERIAL PRIMARY KEY, item TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0, reorder_level INTEGER NOT NULL DEFAULT 10, updated_at TIMESTAMPTZ DEFAULT NOW())`;
  const seed = await sql`SELECT COUNT(*)::int AS count FROM orders`;
  if (seed[0].count === 0) {
    await sql`INSERT INTO orders (code,customer_name,service,amount,status) VALUES
      ('FD-1048','Jordan Davis','Premium service package',4800,'Completed'),
      ('FD-1047','Alex Morgan','Maintenance visit',2200,'In progress'),
      ('FD-1046','Sam Kumar','Consultation booking',1500,'Pending')`;
    await sql`INSERT INTO inventory (item,quantity,reorder_level) VALUES ('Service kits',92,20),('Cleaning supplies',46,15),('Replacement parts',18,10)`;
    await sql`INSERT INTO customers (name,email) VALUES ('Jordan Davis','jordan@example.com'),('Alex Morgan','alex@example.com'),('Sam Kumar','sam@example.com') ON CONFLICT (email) DO NOTHING`;
  }
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type","application/json");
  if (!sql) return res.status(503).json({ok:false,error:"Database not connected. Add DATABASE_URL in Vercel Environment Variables."});
  try {
    await init();
    if (req.method === "GET") {
      const orders = await sql`SELECT id,code,customer_name,service,amount,status,created_at FROM orders ORDER BY created_at DESC LIMIT 20`;
      const stats = await sql`SELECT COALESCE(SUM(amount),0)::float AS revenue, COUNT(*)::int AS orders, COUNT(*) FILTER (WHERE status='Pending')::int AS pending FROM orders`;
      const customers = await sql`SELECT COUNT(*)::int AS count FROM customers`;
      const bookings = await sql`SELECT COUNT(*)::int AS count FROM bookings WHERE booking_date >= CURRENT_DATE`;
      return res.status(200).json({ok:true,stats:{revenue:stats[0].revenue,orders:stats[0].orders,pending:stats[0].pending,customers:customers[0].count,bookings:bookings[0].count},orders});
    }
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const customer = String(body.customer || "New customer").trim();
      const service = String(body.service || "General service").trim();
      const amount = Number(body.amount || 0);
      if (!customer || !service || !Number.isFinite(amount)) return res.status(400).json({ok:false,error:"Invalid order data"});
      const code = "FD-" + Math.floor(1000 + Math.random()*9000);
      const rows = await sql`INSERT INTO orders (code,customer_name,service,amount,status) VALUES (${code},${customer},${service},${amount},'Pending') RETURNING *`;
      return res.status(201).json({ok:true,order:rows[0]});
    }
    return res.status(405).json({ok:false,error:"Method not allowed"});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ok:false,error:"Database request failed"});
  }
};