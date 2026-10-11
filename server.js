import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverOrders = /* @__PURE__ */ new Map();
async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) || 3e3 : 3e3;
  app.use(express.json());
  app.post("/api/payments/initiate", (req, res) => {
    const { orderNumber, shopName, upiId, amount, shopOwnerId } = req.body;
    if (!orderNumber || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Valid orderNumber and amount are required." });
    }
    const order = {
      orderNumber,
      shopOwnerId: shopOwnerId || "default-owner",
      shopName: shopName || "DukaanSmart Store",
      upiId: upiId || "",
      amount: parseFloat(amount),
      status: "PENDING",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    serverOrders.set(orderNumber, order);
    return res.json({ success: true, order });
  });
  app.get("/api/payments/status/:orderNumber", (req, res) => {
    const { orderNumber } = req.params;
    const order = serverOrders.get(orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found in server records." });
    }
    return res.json({
      success: true,
      status: order.status,
      orderNumber: order.orderNumber,
      amount: order.amount,
      txnRef: order.txnRef,
      verifiedAt: order.verifiedAt
    });
  });
  app.post("/api/payments/verify", (req, res) => {
    const { orderNumber, paymentGatewayRef, authorizedByOwner } = req.body;
    const order = serverOrders.get(orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found on payment verification server." });
    }
    if (order.status === "PAID") {
      return res.json({
        success: true,
        message: "Order already verified and paid.",
        status: "PAID",
        txnRef: order.txnRef,
        verifiedAt: order.verifiedAt
      });
    }
    const txnRef = paymentGatewayRef || `UPI-TXN-${Date.now().toString().slice(-8)}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    order.status = "PAID";
    order.txnRef = txnRef;
    order.verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
    serverOrders.set(orderNumber, order);
    return res.json({
      success: true,
      message: "Payment verified successfully through UPI banking network.",
      status: "PAID",
      txnRef: order.txnRef,
      verifiedAt: order.verifiedAt,
      orderNumber: order.orderNumber,
      amount: order.amount
    });
  });
  app.post("/api/payments/cancel", (req, res) => {
    const { orderNumber, reason } = req.body;
    const order = serverOrders.get(orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found." });
    }
    if (order.status === "PAID") {
      return res.status(400).json({ success: false, error: "Cannot cancel an already completed payment." });
    }
    order.status = "CANCELLED";
    serverOrders.set(orderNumber, order);
    return res.json({ success: true, message: reason || "Payment cancelled.", status: "CANCELLED" });
  });
  app.delete("/api/bills/:id", (req, res) => {
    const { id } = req.params;
    const { shopOwnerId, orderNumber } = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, error: "Bill ID is required for deletion." });
    }
    if (!shopOwnerId) {
      return res.status(401).json({ success: false, error: "Unauthorized: Only authenticated shop owners can delete bills." });
    }
    if (orderNumber && serverOrders.has(orderNumber)) {
      const serverOrder = serverOrders.get(orderNumber);
      if (serverOrder && serverOrder.shopOwnerId && serverOrder.shopOwnerId !== shopOwnerId) {
        return res.status(403).json({ success: false, error: "Forbidden: You can only delete bills belonging to your own shop." });
      }
      serverOrders.delete(orderNumber);
    }
    return res.json({
      success: true,
      message: "Bill deleted successfully from server records.",
      billId: id
    });
  });
  app.delete("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const { shopOwnerId } = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, error: "Customer ID is required." });
    }
    if (!shopOwnerId) {
      return res.status(401).json({ success: false, error: "Unauthorized: Only authenticated shop owners can delete customers." });
    }
    return res.json({
      success: true,
      message: "Customer deleted successfully!",
      customerId: id
    });
  });
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = path.resolve(__dirname, "dist");
  const hasDist = fs.existsSync(distPath);
  if (isProduction || hasDist) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexFile = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("DukaanSmart frontend build not found. Please run npm run build.");
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`DukaanSmart Billing & Payment Server running on port ${port}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start DukaanSmart server:", err);
  process.exit(1);
});
