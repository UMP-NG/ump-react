import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateInvoicePDF = async (order) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 700]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  const drawText = (text, x, y, size = 12) => {
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  };

  drawText("INVOICE", 250, 660, 18);
  drawText(`Order ID: ${order._id}`, 50, 630);
  drawText(`Customer: ${order.user.name}`, 50, 610);
  drawText(`Email: ${order.user.email}`, 50, 590);
  drawText(`Total: ₦${order.totalAmount}`, 50, 560);
  drawText(`Status: ${order.status}`, 50, 540);
  drawText(`Date: ${new Date(order.createdAt).toLocaleString()}`, 50, 520);

  drawText("Items:", 50, 490);
  let y = 470;
  for (const item of order.items) {
    drawText(`${item.quantity} x ${item.product.name} - ₦${item.price}`, 60, y);
    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(__dirname, `../invoices/invoice_${order._id}.pdf`);
  fs.writeFileSync(filePath, pdfBytes);

  return filePath;
};
