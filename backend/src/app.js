const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const pdfRoutes = require("./routes/pdf.routes");
const ordersRoutes = require("./routes/orders.routes");
const productsRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);

app.use("/auth", authRoutes);

app.use("/pdf", pdfRoutes);

app.use("/orders", ordersRoutes);

app.use("/products", productsRoutes);

module.exports = app;
