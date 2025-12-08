const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const pdfRoutes = require("./routes/pdf.routes");
const ordersRoutes = require("./routes/orders.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Routes techniques
app.use("/health", healthRoutes);

// Routes PDF
app.use("/pdf", pdfRoutes);

app.use("/orders", ordersRoutes);

module.exports = app;
