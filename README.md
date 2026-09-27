# Jewellery Management Dashboard

A lightweight jewellery shop dashboard for tracking inventory, customers, and sales.

## Features

- Product management: add, edit, and delete products with Product ID, name, category, material, purity, weight, price, and stock
- Product search (by ID, name, material, or purity) and category filter
- Customer management: add, edit, and delete customers with Customer ID, name, phone, email, and address
- Customer search and per-customer purchase history (invoices, items bought, total spent)
- Billing: multi-item bills with product price, weight, quantity, subtotal, discount (₹ or %), GST, and grand total
- Printable tax invoices with amount in words; stock is reduced automatically after each sale
- Sales history with invoice search and re-opening/printing of past invoices
- Summary cards for value, monthly sales, and low-stock alerts
- Local browser storage for persistence without a backend

## Shop details on invoices

Edit `SHOP_DETAILS` at the top of `app.js` to set the shop name, address, phone, email, and GSTIN printed on invoices. The default GST rate is `DEFAULT_TAX_RATE` (3%).

## Run locally

Open the project folder in a browser, or use a small local web server:

```bash
cd "c:\Users\ELCOT\OneDrive - ELCOT\Desktop\jewellary shop\jewellery-management"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Files

- `index.html` — dashboard structure
- `styles.css` — layout and styling
- `app.js` — data management and rendering logic
